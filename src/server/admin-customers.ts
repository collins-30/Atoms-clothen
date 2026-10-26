"use server";

import type { Role } from "@prisma/client";
import { z } from "zod";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtMoney } from "@/lib/admin-format";
import type { AdminResult } from "@/server/admin-categories";

export type AdminCustomer = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  joinedLabel: string;
  orders: number;
  spend: string; // "$120.00" or "$120.00 + ₦40,000.00" (paid orders, per currency)
  role: Role;
  isSelf: boolean;
};

/** The 200 newest accounts. Replaces Base44's User.list + Order.list joined in the browser. */
export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  await connection(); // read request data first: required before crypto/random in Next 16
  const me = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      addresses: { select: { country: true, isDefault: true } },
    },
  });
  const ids = users.map((u) => u.id);

  const [counts, spend] = await Promise.all([
    // Orders the customer actually paid for or is waiting on (not abandoned checkouts).
    prisma.order.groupBy({ by: ["userId"], where: { userId: { in: ids }, paymentStatus: { not: "UNPAID" } }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["userId", "currencySymbol"], where: { userId: { in: ids }, paymentStatus: "PAID" }, _sum: { total: true } }),
  ]);

  const countBy = new Map(counts.map((c) => [c.userId, c._count._all]));
  const spendBy = new Map<string, string[]>();
  for (const s of spend) {
    if (!s.userId) continue;
    const list = spendBy.get(s.userId) ?? [];
    list.push(fmtMoney(s._sum.total ? s._sum.total.toNumber() : 0, s.currencySymbol));
    spendBy.set(s.userId, list);
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    country: (u.addresses.find((a) => a.isDefault) ?? u.addresses[0])?.country ?? null,
    joinedLabel: u.createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
    orders: countBy.get(u.id) ?? 0,
    spend: spendBy.get(u.id)?.join(" + ") ?? "—",
    role: u.role,
    isSelf: u.id === me,
  }));
}

const roleSchema = z.object({ userId: z.string().min(1), role: z.enum(["USER", "ADMIN"]) });

export async function setUserRole(raw: unknown): Promise<AdminResult> {
  let me: string;
  try {
    me = await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  // Nobody can lock themselves out, and there is always at least one admin left.
  if (parsed.data.userId === me) return { ok: false, error: "You can't change your own role." };
  try {
    await prisma.user.update({ where: { id: parsed.data.userId }, data: { role: parsed.data.role } });
  } catch {
    return { ok: false, error: "User not found." };
  }
  return { ok: true };
}
