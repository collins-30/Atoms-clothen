import { getPaymentProvider } from "@/lib/payments";
import { cancelUnpaidOrder, markOrderPaid } from "@/server/order-lifecycle";

// Replaces your verifyCheckoutSession function. Stripe calls this URL itself,
// so the browser can no longer claim "I paid" - only a signed event counts.
export async function POST(req: Request) {
  const rawBody = await req.text(); // must be the RAW body for the signature check

  let event;
  try {
    event = await getPaymentProvider("stripe").parseWebhook(rawBody, req.headers);
  } catch (e) {
    console.error("[stripe webhook] rejected:", e instanceof Error ? e.message : e);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!event) return Response.json({ received: true }); // an event we don't care about

  // If this throws, we return 500 and Stripe retries later. Both handlers
  // are safe to run more than once.
  if (event.type === "paid") {
    await markOrderPaid(event);
  } else {
    await cancelUnpaidOrder({ orderId: event.orderId, sessionId: event.sessionId, reason: "Payment session expired" });
  }

  return Response.json({ received: true });
}
