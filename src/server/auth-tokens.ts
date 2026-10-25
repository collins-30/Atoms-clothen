// Internal helpers for email codes and reset links. No "use server" on purpose:
// these must only be called from other server code, never from a browser.

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { AuthTokenPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail, sendVerificationCodeEmail } from "@/lib/email/auth-emails";

export const CODE_TTL_MS = 15 * 60_000; // email codes live 15 minutes
export const RESET_TTL_MS = 60 * 60_000; // reset links live 1 hour
export const RESEND_COOLDOWN_MS = 60_000; // one new code / link per minute
export const MAX_CODE_ATTEMPTS = 5; // wrong guesses before the code is burned

/** Keyed hash, so a copy of the database alone can't be used to read codes. */
export function hashToken(purpose: AuthTokenPurpose, scope: string, value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`${purpose}:${scope}:${value}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

async function tooSoon(email: string, purpose: AuthTokenPurpose): Promise<boolean> {
  const last = await prisma.authToken.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return !!last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS;
}

/** Creates a fresh 6-digit code (replacing any older one) and emails it. */
export async function issueVerificationCode(email: string): Promise<{ throttled: boolean }> {
  if (await tooSoon(email, "VERIFY_EMAIL")) return { throttled: true };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { email, purpose: "VERIFY_EMAIL" } }),
    prisma.authToken.create({
      data: {
        email,
        purpose: "VERIFY_EMAIL",
        tokenHash: hashToken("VERIFY_EMAIL", email, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ]);
  await sendVerificationCodeEmail(email, code); // never throws; logs its own errors
  return { throttled: false };
}

/** Creates a one-time reset link (replacing any older one) and emails it. */
export async function issueResetLink(email: string): Promise<{ throttled: boolean }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  if (await tooSoon(email, "RESET_PASSWORD")) return { throttled: true };
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { email, purpose: "RESET_PASSWORD" } }),
    prisma.authToken.create({
      data: {
        email,
        purpose: "RESET_PASSWORD",
        tokenHash: hashToken("RESET_PASSWORD", "", token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    }),
  ]);
  await sendPasswordResetEmail(email, `${appUrl}/reset-password?token=${token}`);
  return { throttled: false };
}
