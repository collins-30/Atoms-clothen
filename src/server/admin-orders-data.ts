"use server";

import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Data for the admin Orders page, plus the tracking-number action.
// (Changing an order's STATUS stays in admin-orders.ts: updateOrderStatus.)

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string; // ISO, for the timeline
  createdLabel: string; // "26 Oct 2026", formatted once on the server
  customerEmail: string | null;
  customerPhone: string | null;
  currencySymbol: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discountAmount: number;
  discountCode: string | null;
  total: number;
  carrier: string | null;
  trackingNumber: string | null;
  notes: string | null;
  shipTo: string[]; // address lines, ready to print
  items: { name: string; qty: number; color: string | null; size: string | null; price: number }[];
};

const num = (d: { toNumber(): number }) => d.toNumber();

/** The 200 most recent orders, as plain objects the browser can receive. */
export async function getAdminOrders(): Promise<AdminOrder[]> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();

  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true, user: { select: { email: true } } },
  });

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt.toISOString(),
    createdLabel: o.createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
    customerEmail: o.shipEmail || o.user?.email || null,
    customerPhone: o.shipPhone,
    currencySymbol: o.currencySymbol,
    subtotal: num(o.subtotal),
    shipping: num(o.shipping),
    tax: num(o.tax),
    discountAmount: num(o.discountAmount),
    discountCode: o.discountCode,
    total: num(o.total),
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    notes: o.notes,
    shipTo: [
      o.shipFullName,
      o.shipLine1,
      o.shipLine2,
      [o.shipCity, o.shipRegion, o.shipPostalCode].filter(Boolean).join(", "),
      o.shipCountry,
    ].filter((l): l is string => Boolean(l)),
    items: o.items.map((i) => ({ name: i.name, qty: i.qty, color: i.color, size: i.size, price: num(i.price) })),
  }));
}

const trackingSchema = z.object({
  orderId: z.string().min(1),
  carrier: z.string().trim().max(80),
  trackingNumber: z.string().trim().max(120),
});

export type SaveTrackingResult = { ok: true } | { ok: false; error: string };

export async function saveOrderTracking(raw: unknown): Promise<SaveTrackingResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = trackingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the carrier and tracking number." };

  const { orderId, carrier, trackingNumber } = parsed.data;
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { carrier: carrier || null, trackingNumber: trackingNumber || null },
    });
  } catch {
    return { ok: false, error: "Order not found." };
  }
  return { ok: true };
}