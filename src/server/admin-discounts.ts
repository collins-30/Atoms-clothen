"use server";

import { z } from "zod";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { AdminResult } from "@/server/admin-categories";

export type AdminDiscount = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrder: number;
  startDate: string; // "YYYY-MM-DD" or "" (for the date inputs)
  endDate: string;
  startLabel: string; // "1 Dec 2026" or "—"
  endLabel: string;
  active: boolean;
  state: "live" | "off" | "scheduled" | "expired";
};

const toDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const label = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

export async function getAdminDiscounts(): Promise<AdminDiscount[]> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();
  const rows = await prisma.discount.findMany({ orderBy: { code: "asc" } });
  const now = new Date();
  return rows.map((d) => ({
    id: d.id,
    code: d.code,
    type: d.type,
    value: d.value.toNumber(),
    minOrder: d.minOrder.toNumber(),
    startDate: toDay(d.startDate),
    endDate: toDay(d.endDate),
    startLabel: label(d.startDate),
    endLabel: label(d.endDate),
    active: d.active,
    state: !d.active ? "off" : d.endDate && d.endDate < now ? "expired" : d.startDate && d.startDate > now ? "scheduled" : "live",
  }));
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must look like 2026-12-31.").or(z.literal(""));

const schema = z.object({
  id: z.string().min(1).optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,32}$/, "Codes use 3–32 letters, numbers, dashes or underscores."),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive("The discount must be more than 0."),
  minOrder: z.number().min(0, "The minimum order can't be negative."),
  startDate: day,
  endDate: day,
  active: z.boolean(),
});

export async function saveDiscount(raw: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;
  if (d.type === "PERCENT" && d.value > 100) return { ok: false, error: "A percentage can't be more than 100." };

  // Start = beginning of that day, end = END of that day (UTC). Checkout accepts a
  // code until endDate, so a bare date would expire it at the start of its last day.
  const start = d.startDate ? new Date(`${d.startDate}T00:00:00.000Z`) : null;
  const end = d.endDate ? new Date(`${d.endDate}T23:59:59.999Z`) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
    return { ok: false, error: "That date doesn't exist." };
  }
  if (start && end && end < start) return { ok: false, error: "The end date is before the start date." };

  const data = {
    code: d.code,
    type: d.type,
    value: Math.round(d.value * 100) / 100,
    minOrder: Math.round(d.minOrder * 100) / 100,
    startDate: start,
    endDate: end,
    active: d.active,
  };
  try {
    if (d.id) await prisma.discount.update({ where: { id: d.id }, data });
    else await prisma.discount.create({ data });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false, error: "That code already exists." };
    }
    console.error("[admin-discounts] save failed:", e);
    return { ok: false, error: "Could not save the discount. Please try again." };
  }
  return { ok: true };
}

export async function setDiscountActive(id: unknown, active: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (typeof id !== "string" || typeof active !== "boolean") return { ok: false, error: "Invalid request." };
  try {
    await prisma.discount.update({ where: { id }, data: { active } });
  } catch {
    return { ok: false, error: "Discount not found." };
  }
  return { ok: true };
}

export async function deleteDiscount(id: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (typeof id !== "string" || !id) return { ok: false, error: "Discount not found." };
  try {
    await prisma.discount.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Discount not found." };
  }
  return { ok: true };
}
