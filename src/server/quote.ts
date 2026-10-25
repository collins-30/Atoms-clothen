"use server";

import { checkoutSchema } from "@/lib/validators/checkout";
import { FREE_STANDARD_SHIPPING_FROM } from "@/lib/pricing";
import { fromMinor } from "@/lib/money";
import { buildQuote, CheckoutError, DiscountError } from "@/server/cart-pricing";

// Only these fields are needed to price a bag.
const quoteSchema = checkoutSchema.pick({
  marketCode: true,
  items: true,
  delivery: true,
  discountCode: true,
});

export type QuoteResult =
  | {
      ok: true;
      marketCode: string; // which market these prices are for
      currency: string;
      // Current price of ONE unit for each bag line, keyed by the cart item id
      // (`${productSlug}-${color}-${size}`).
      unitPrices: Record<string, number>;
      // All amounts are in normal units (12.34), ready to show with formatPrice.
      subtotal: number;
      discount: number;
      shipping: number;
      tax: number;
      total: number;
      deliveryCosts: { standard: number; express: number };
      freeShippingFrom: number;
      discountCode: string | null;
    }
  | { ok: false; error: string; kind: "discount" | "cart" };

/**
 * Prices a bag using real database prices. The cart and checkout pages call
 * this instead of doing their own maths in the browser.
 */
export async function quoteCheckout(raw: unknown): Promise<QuoteResult> {
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, kind: "cart", error: parsed.error.issues[0]?.message ?? "Your bag is empty" };
  }
  try {
    const q = await buildQuote(parsed.data);
    const c = q.currency;
    return {
      ok: true,
      marketCode: q.market.code,
      currency: c,
      unitPrices: Object.fromEntries(
        q.resolved.map((r) => [
          `${r.product.slug}-${r.variant.color}-${r.variant.size}`,
          fromMinor(r.unitMinor, c),
        ]),
      ),
      subtotal: fromMinor(q.totals.subtotalMinor, c),
      discount: fromMinor(q.totals.discountMinor, c),
      shipping: fromMinor(q.totals.shippingMinor, c),
      tax: fromMinor(q.totals.taxMinor, c),
      total: fromMinor(q.totals.totalMinor, c),
      deliveryCosts: {
        standard: fromMinor(q.deliveryCostsMinor.standard, c),
        express: fromMinor(q.deliveryCostsMinor.express, c),
      },
      freeShippingFrom: FREE_STANDARD_SHIPPING_FROM,
      discountCode: q.discountCode,
    };
  } catch (e) {
    if (e instanceof DiscountError) return { ok: false, kind: "discount", error: e.message };
    if (e instanceof CheckoutError) return { ok: false, kind: "cart", error: e.message };
    console.error("[quote] failed:", e);
    return { ok: false, kind: "cart", error: "We couldn't price your bag. Please try again." };
  }
}
