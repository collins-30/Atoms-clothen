// Internal order state changes. This file deliberately has NO "use server":
// these functions must only be called from other server code (the webhook,
// admin actions), never directly from a browser.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendAdminNewOrderEmail, sendOrderConfirmationEmail } from "@/lib/email/order-emails";

/** Put an order's reserved stock back on the shelf. Call inside a transaction. */
export async function restockOrder(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, qty: true },
  });
  for (const item of items) {
    await tx.productVariant.update({
      where: { id: item.variantId! },
      data: { stock: { increment: item.qty } },
    });
  }
}

/**
 * Called by the payment webhook. Safe to call twice for the same payment:
 * only the first call changes anything (and sends the email), so Stripe
 * retries can never create a second confirmation.
 */
export async function markOrderPaid(args: {
  orderId: string;
  sessionId: string;
  paymentIntentId: string | null;
}): Promise<{ changed: boolean }> {
  const { orderId, sessionId, paymentIntentId } = args;

  const res = await prisma.order.updateMany({
    where: { id: orderId, paymentSessionId: sessionId, paymentStatus: "UNPAID", status: "PENDING" },
    data: { paymentStatus: "PAID", status: "CONFIRMED", paymentIntentId },
  });

  if (res.count === 0) {
    // Either a duplicate webhook (fine), or money arrived for an order we had
    // already cancelled (the session expired first). Make that visible.
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentStatus: true, paymentSessionId: true, notes: true },
    });
    if (
      existing &&
      existing.paymentSessionId === sessionId &&
      existing.paymentStatus === "UNPAID" &&
      existing.status === "CANCELLED"
    ) {
      console.error(`[payments] Order ${orderId} was PAID after being cancelled. Refund or reinstate it.`);
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          paymentIntentId,
          notes: `${existing.notes ? existing.notes + "\n" : ""}PAID AFTER CANCELLATION - refund or reinstate manually.`,
        },
      });
    }
    return { changed: false };
  }

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true } } },
  });
  // Neither of these throws; each logs its own errors. One after the other,
  // because Resend allows only a couple of requests per second.
  await sendOrderConfirmationEmail(order);
  await sendAdminNewOrderEmail(order);

  // Sign-up only asks for an email and password, so use the name and phone typed at
  // checkout for an account that has none yet. Never lets a failure here break the webhook.
  if (order.userId) {
    try {
      await prisma.user.updateMany({ where: { id: order.userId, OR: [{ name: null }, { name: "" }] }, data: { name: order.shipFullName } });
      if (order.shipPhone) {
        await prisma.user.updateMany({ where: { id: order.userId, OR: [{ phone: null }, { phone: "" }] }, data: { phone: order.shipPhone } });
      }
    } catch (e) {
      console.error("[payments] could not fill in the customer's name:", e);
    }
  }
  return { changed: true };
}

/**
 * Cancels an order that was never paid and returns its stock. Used when a
 * checkout session expires/fails, or when we couldn't start the payment.
 * Does nothing if the order is already paid or already cancelled.
 */
export async function cancelUnpaidOrder(args: {
  orderId: string;
  sessionId?: string;
  reason?: string;
}): Promise<{ changed: boolean }> {
  const { orderId, sessionId, reason } = args;
  return prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: {
        id: orderId,
        paymentStatus: "UNPAID",
        status: "PENDING",
        ...(sessionId ? { paymentSessionId: sessionId } : {}),
      },
      data: { status: "CANCELLED", ...(reason ? { notes: reason } : {}) },
    });
    if (res.count === 0) return { changed: false };
    await restockOrder(tx, orderId);
    return { changed: true };
  });
}
