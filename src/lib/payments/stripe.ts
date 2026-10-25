import Stripe from "stripe";
import type { PaymentEvent, PaymentProvider } from "./provider";

let client: Stripe | null = null;
function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

// Stripe sessions can't be shorter than 30 minutes. Unpaid orders (and their
// reserved stock) are released by the `checkout.session.expired` webhook.
const SESSION_MINUTES = 30;

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckout(input) {
    let couponId: string | undefined;
    if (input.discount && input.discount.amountMinor > 0) {
      const coupon = await stripe().coupons.create({
        amount_off: input.discount.amountMinor,
        currency: input.currency,
        duration: "once",
        name: input.discount.label,
      });
      couponId = coupon.id;
    }

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
      metadata: { order_id: input.orderId, order_number: input.orderNumber },
      line_items: input.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: input.currency,
          unit_amount: l.unitAmountMinor,
          product_data: { name: l.name, ...(l.image ? { images: [l.image] } : {}) },
        },
      })),
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url, sessionId: session.id };
  },

  async parseWebhook(rawBody, headers): Promise<PaymentEvent | null> {
    const signature = headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) throw new Error("Missing Stripe signature or webhook secret");

    // Throws if the signature doesn't match -> nobody can fake a "paid" event.
    const event = stripe().webhooks.constructEvent(rawBody, signature, secret);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object;
        const orderId = s.metadata?.order_id;
        if (!orderId || s.payment_status !== "paid") return null;
        const pi = s.payment_intent;
        return {
          type: "paid",
          sessionId: s.id,
          orderId,
          paymentIntentId: typeof pi === "string" ? pi : (pi?.id ?? null),
        };
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const s = event.data.object;
        const orderId = s.metadata?.order_id;
        if (!orderId) return null;
        return { type: "failed", sessionId: s.id, orderId };
      }
      default:
        return null;
    }
  },
};
