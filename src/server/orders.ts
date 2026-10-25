import { prisma } from "@/lib/db";

/**
 * For the order-confirmation page: /order-confirmation?session_id=cs_...
 * Read-only. It does NOT mark anything as paid (the webhook does that), so the
 * page should show "confirming payment..." and refresh while paymentStatus is
 * still UNPAID (usually only a second or two).
 *
 * The session id is a long random value only the buyer's browser receives
 * from Stripe, which is what protects guest orders from being read by others.
 */
export async function getOrderBySessionId(sessionId: string) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  return prisma.order.findUnique({
    where: { paymentSessionId: sessionId },
    include: { items: true },
  });
}
