"use server";

import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendOrderStatusEmail } from "@/lib/email/order-emails";
import { restockOrder } from "@/server/order-lifecycle";

const inputSchema = z.object({
  orderId: z.string().min(1),
  status: z.nativeEnum(OrderStatus),
});

// Cancelling one of these returns the stock. Once an order has shipped the
// goods have left the building, so we don't auto-restock those.
const RESTOCK_FROM: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING"];

export type UpdateStatusResult =
  | { ok: true; emailSent: boolean; emailError: string | null }
  | { ok: false; error: string };

// Replaces your notifyOrderStatus function.
export async function updateOrderStatus(orderId: string, status: string): Promise<UpdateStatusResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = inputSchema.safeParse({ orderId, status });
  if (!parsed.success) return { ok: false, error: "Invalid order or status" };

  const existing = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { status: true },
  });
  if (!existing) return { ok: false, error: "Order not found" };

  const order = await prisma.$transaction(async (tx) => {
    if (parsed.data.status === "CANCELLED" && RESTOCK_FROM.includes(existing.status)) {
      await restockOrder(tx, parsed.data.orderId);
    }
    return tx.order.update({
      where: { id: parsed.data.orderId },
      data: { status: parsed.data.status },
      include: { items: true, user: { select: { email: true } } },
    });
  });

  const email = await sendOrderStatusEmail(order, parsed.data.status);
  return {
    ok: true,
    emailSent: email.ok,
    emailError: email.ok ? null : email.error,
  };
}
