"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Replaces base44.auth.updateMe(...). The user id always comes from the session,
// never from the browser, so nobody can edit another customer's details.

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_ADDRESSES = 20;

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ── Contact details ─────────────────────────────────────────

const detailsSchema = z.object({
  name: z.string().trim().max(120, "That name is too long."),
  phone: z.string().trim().max(40, "That phone number is too long."),
  dateOfBirth: z.string().trim(),
  emailMarketing: z.boolean(),
});

function parseBirthDate(value: string): Date | null | "invalid" {
  if (value === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return "invalid";
  if (d.getUTCFullYear() < 1900 || d.getTime() > Date.now()) return "invalid";
  return d;
}

export async function saveDetails(raw: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in again." };

  const parsed = detailsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const dob = parseBirthDate(parsed.data.dateOfBirth);
  if (dob === "invalid") return { ok: false, error: "Please enter a valid date of birth." };

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name || null, phone: parsed.data.phone || null, dateOfBirth: dob, emailMarketing: parsed.data.emailMarketing },
  });
  return { ok: true };
}

// ── Address book ────────────────────────────────────────────

const addressSchema = z.object({
  id: z.string().max(60).optional(),
  label: z.string().trim().max(60),
  fullName: z.string().trim().max(120),
  line1: z.string().trim().max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().max(100),
  postalCode: z.string().trim().max(30),
  country: z.string().trim().max(100),
  phone: z.string().trim().max(40),
  isDefault: z.boolean(),
});

class AddressNotFound extends Error {}

export async function saveAddress(raw: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in again." };

  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the address." };
  const a = parsed.data;

  if (!a.label || !a.line1 || !a.city || !a.country) {
    return { ok: false, error: "Please fill in the label, street address, city and country." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const fullName = a.fullName || user?.name?.trim() || "";
  if (!fullName) return { ok: false, error: "Please enter a full name." };

  if (!a.id) {
    const count = await prisma.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) return { ok: false, error: "You have reached the limit of saved addresses." };
  }

  const data = {
    label: a.label,
    fullName,
    line1: a.line1,
    line2: a.line2 || null,
    city: a.city,
    postalCode: a.postalCode, // the column is required, so "" when left blank
    country: a.country,
    phone: a.phone || null,
    isDefault: a.isDefault,
  };

  try {
    await prisma.$transaction(async (tx) => {
      let id = a.id;
      if (id) {
        // userId in the filter: you can only edit your own addresses.
        const res = await tx.address.updateMany({ where: { id, userId }, data });
        if (res.count === 0) throw new AddressNotFound();
      } else {
        id = (await tx.address.create({ data: { ...data, userId }, select: { id: true } })).id;
      }
      if (a.isDefault) {
        await tx.address.updateMany({ where: { userId, id: { not: id } }, data: { isDefault: false } });
      }
    });
  } catch (e) {
    if (e instanceof AddressNotFound) return { ok: false, error: "That address no longer exists." };
    console.error("[profile] saveAddress failed:", e);
    return { ok: false, error: "Could not save the address. Please try again." };
  }
  return { ok: true };
}

export async function deleteAddress(id: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in again." };
  if (typeof id !== "string" || !id) return { ok: false, error: "That address no longer exists." };

  await prisma.address.deleteMany({ where: { id, userId } });
  return { ok: true };
}
