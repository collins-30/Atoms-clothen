// The checkout code only talks to this interface. Stripe is the first
// implementation; add paystack.ts later without touching checkout logic.

export type CheckoutLine = {
  name: string;
  unitAmountMinor: number; // already in cents
  quantity: number;
  image?: string; // must be an absolute https URL
};

export type CreateCheckoutInput = {
  orderId: string;
  orderNumber: string;
  currency: string; // "usd", "ngn"...
  customerEmail: string;
  lines: CheckoutLine[];
  discount?: { amountMinor: number; label: string };
  successUrl: string; // may contain {CHECKOUT_SESSION_ID}
  cancelUrl: string;
};

export type PaymentEvent =
  | { type: "paid"; sessionId: string; orderId: string; paymentIntentId: string | null }
  | { type: "failed"; sessionId: string; orderId: string }; // expired / failed

export interface PaymentProvider {
  name: "stripe" | "paystack";
  createCheckout(input: CreateCheckoutInput): Promise<{ url: string; sessionId: string }>;
  /**
   * Verifies the webhook signature and translates the provider's event.
   * Throws if the signature is invalid. Returns null for events we ignore.
   */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent | null>;
}
