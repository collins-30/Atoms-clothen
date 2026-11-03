// A small rate limiter backed by the database (table RateLimit). It has to live in the
// database, not in memory, because the site runs as many short-lived serverless
// instances that share nothing. No "use server": browsers can't call these directly.

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/** The visitor's IP address. On Vercel the platform sets x-forwarded-for to the real client address. */
export function ipFromHeaders(h: { get(name: string): string | null }): string {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || h.get("x-real-ip")?.trim() || "unknown").slice(0, 64);
}

export async function clientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

/** Bucket names are hashed: emails can be long, and they don't belong in a table in plain text. */
const bucketFor = (kind: string, value: string) =>
  `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;

/** Counts one hit in `bucket` and returns how many hits it has within the current window. */
export async function hit(bucket: string, windowMs: number): Promise<number> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  // One atomic statement: start a fresh window if the old one ended, otherwise add one.
  await prisma.$executeRaw`
    INSERT INTO RateLimit (bucket, hits, resetAt) VALUES (${bucket}, 1, ${resetAt})
    ON DUPLICATE KEY UPDATE
      hits = IF(resetAt <= ${now}, 1, hits + 1),
      resetAt = IF(resetAt <= ${now}, ${resetAt}, resetAt)`;
  if (Math.random() < 0.01) {
    // Housekeeping: forget buckets whose window is long over.
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(now.getTime() - HOUR) } } }).catch(() => {});
  }
  const row = await prisma.rateLimit.findUnique({ where: { bucket }, select: { hits: true } });
  return row?.hits ?? 1;
}

/** Minutes until `bucket` may be used again, or 0 when it is under `max`. Does not count a hit. */
async function blockedMinutes(bucket: string, max: number): Promise<number> {
  const row = await prisma.rateLimit.findUnique({ where: { bucket } });
  if (!row || row.resetAt.getTime() <= Date.now() || row.hits < max) return 0;
  return Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / MINUTE));
}

// ───────────── logging in ─────────────
// Only wrong passwords count. Three independent limits, so that:
//  - guessing one account's password from one place stops after a few tries,
//  - one place trying many accounts stops too,
//  - a spread-out attack on a single account is still slowed down, without
//    letting a stranger lock a real customer out by failing from somewhere else.

const LOGIN_WINDOW = 15 * MINUTE;
const loginBuckets = (email: string, ip: string) => [
  { bucket: bucketFor("login-pair", `${email}|${ip}`), max: 5 },
  { bucket: bucketFor("login-ip", ip), max: 20 },
  { bucket: bucketFor("login-email", email), max: 30 },
];

/** 0 when this login attempt may go ahead, otherwise how many minutes to wait. */
export async function loginBlockedMinutes(email: string, ip: string): Promise<number> {
  const waits = await Promise.all(loginBuckets(email, ip).map((b) => blockedMinutes(b.bucket, b.max)));
  return Math.max(...waits);
}

export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  await Promise.all(loginBuckets(email, ip).map((b) => hit(b.bucket, LOGIN_WINDOW)));
}

/** A correct password wipes this person's own failure count (the shared counters stay). */
export async function clearLoginFailures(email: string, ip: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { bucket: loginBuckets(email, ip)[0].bucket } }).catch(() => {});
}

export const waitMessage = (minutes: number) =>
  `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;

/** For actions that send an email or do other costly work: true once `max` is passed within an hour. */
export async function overHourlyLimit(kind: string, value: string, max: number): Promise<boolean> {
  return (await hit(bucketFor(kind, value), HOUR)) > max;
}
