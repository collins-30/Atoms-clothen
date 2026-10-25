"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { safeReturnTo } from "@/lib/return-to";
import { codeSchema, emailOnlySchema, loginSchema, registerSchema, resetSchema } from "@/lib/validators/auth";
import { MAX_CODE_ATTEMPTS, hashToken, issueResetLink, issueVerificationCode, safeEqualHex } from "@/server/auth-tokens";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; unverified?: true };

const BAD_LOGIN = "Invalid email or password";
const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Please check your details.";

// Replaces base44.auth.register
export async function registerUser(raw: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } });
  if (existing?.emailVerified) {
    return { ok: false, error: "An account with this email already exists. Please log in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    // Signed up before but never entered the code: keep the newest password.
    await prisma.user.update({ where: { email }, data: { passwordHash } });
  } else {
    await prisma.user.create({ data: { email, passwordHash, role: "USER" } });
  }
  await issueVerificationCode(email);
  return { ok: true };
}

// Replaces base44.auth.verifyOtp. The page signs the customer in afterwards.
export async function verifyEmailCode(raw: unknown): Promise<ActionResult> {
  const parsed = codeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { email, code } = parsed.data;

  const rec = await prisma.authToken.findFirst({
    where: { email, purpose: "VERIFY_EMAIL" },
    orderBy: { createdAt: "desc" },
  });
  if (!rec || rec.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "That code has expired. Please request a new one." };
  }

  // Count the guess FIRST (atomically), then compare. Even many simultaneous
  // guesses can't get more than MAX_CODE_ATTEMPTS tries.
  const counted = await prisma.authToken.updateMany({
    where: { id: rec.id, attempts: { lt: MAX_CODE_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count === 0) {
    await prisma.authToken.deleteMany({ where: { id: rec.id } });
    return { ok: false, error: "Too many wrong attempts. Please request a new code." };
  }
  if (!safeEqualHex(rec.tokenHash, hashToken("VERIFY_EMAIL", email, code))) {
    return { ok: false, error: "Invalid verification code" };
  }

  await prisma.$transaction([
    prisma.user.updateMany({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.authToken.deleteMany({ where: { email, purpose: "VERIFY_EMAIL" } }),
  ]);
  return { ok: true };
}

// Replaces base44.auth.resendOtp
export async function resendVerificationCode(raw: unknown): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } });
  if (!user || user.emailVerified) return { ok: true }; // say nothing about who has an account

  const { throttled } = await issueVerificationCode(email);
  if (throttled) return { ok: false, error: "Please wait a minute before asking for another code." };
  return { ok: true };
}

let dummyHash: string | undefined;

// Replaces base44.auth.loginViaEmailPassword
export async function loginWithPassword(raw: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: BAD_LOGIN };
  const { email, password, returnTo } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true, emailVerified: true },
  });

  // Always run one bcrypt comparison, even for unknown emails, so the response
  // time doesn't reveal whether an account exists.
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const matches = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user?.passwordHash || !matches) return { ok: false, error: BAD_LOGIN };

  if (!user.emailVerified) {
    await issueVerificationCode(email); // sends a new code (at most one per minute)
    return { ok: false, unverified: true, error: "Please verify your email first. We've sent you a new code." };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: BAD_LOGIN };
    throw e;
  }
  return { ok: true, redirectTo: safeReturnTo(returnTo) };
}

// Replaces base44.auth.loginWithProvider("google"). Used as <form action={...}>.
export async function startGoogleSignIn(returnTo?: string): Promise<void> {
  await signIn("google", { redirectTo: safeReturnTo(typeof returnTo === "string" ? returnTo : undefined) });
}

// Replaces base44.auth.resetPasswordRequest. Always answers "ok", so nobody can
// use this form to find out which emails have an account.
export async function requestPasswordReset(raw: unknown): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    // Sent after the response, so a fast "no account" answer and a slower
    // "email sent" answer look the same from outside.
    after(() => issueResetLink(email).catch((e) => console.error("[auth] reset link failed:", e)));
  }
  return { ok: true };
}

// Replaces base44.auth.resetPassword
export async function resetPassword(raw: unknown): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { token, password } = parsed.data;

  const rec = await prisma.authToken.findFirst({
    where: { purpose: "RESET_PASSWORD", tokenHash: hashToken("RESET_PASSWORD", "", token) },
  });
  if (!rec || rec.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This reset link is invalid or has expired. Please request a new one." };
  }
  const user = await prisma.user.findUnique({ where: { email: rec.email }, select: { emailVerified: true } });
  if (!user) return { ok: false, error: "This reset link is invalid or has expired. Please request a new one." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    // Clicking the emailed link also proves they own the address.
    prisma.user.update({
      where: { email: rec.email },
      data: { passwordHash, emailVerified: user.emailVerified ?? new Date() },
    }),
    prisma.authToken.deleteMany({ where: { email: rec.email, purpose: "RESET_PASSWORD" } }),
  ]);
  return { ok: true };
}
