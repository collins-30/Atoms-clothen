"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export type SubscribeResult = { ok: true } | { ok: false; error: string };

// Your Base44 footer only cleared the input. This one actually saves the
// address (NewsletterSubscriber table). Subscribing twice is fine.
export async function subscribeNewsletter(email: unknown): Promise<SubscribeResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Please enter a valid email address." };
  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data },
      update: {},
      create: { email: parsed.data },
    });
    return { ok: true };
  } catch (e) {
    console.error("[newsletter] failed:", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
