// The ONE place that turns "what's in the bag" into real prices and totals.
// Used by the quote action (cart + checkout pages show these numbers) and by
// createCheckout (which charges them), so what you see is what you pay.
//
// No "use server" here on purpose: this is internal, not callable from a browser.

import { prisma } from "@/lib/db";
import { computeShippingMinor, computeTotals, type Delivery, type DiscountRule } from "@/lib/pricing";
import { fromMinor, toMinor } from "@/lib/money";
import type { CheckoutInput } from "@/lib/validators/checkout";

// Errors we WANT the customer to read.
export class CheckoutError extends Error {}
// A discount-code problem (so the UI can show it next to the promo box).
export class DiscountError extends CheckoutError {}

export type QuoteInput = Pick<CheckoutInput, "marketCode" | "items" | "delivery" | "discountCode">;

export async function buildQuote(input: QuoteInput) {
  const market = await prisma.market.findFirst({
    where: { code: input.marketCode, active: true },
    include: { shippingOptions: true },
  });
  if (!market) throw new CheckoutError("This market is not available.");
  const currency = market.currency;

  // Merge duplicate lines (same product, color, size).
  const merged = new Map<string, (typeof input.items)[number]>();
  for (const i of input.items) {
    const key = `${i.productSlug}|${i.color}|${i.size}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, qty: prev.qty + i.qty } : i);
  }
  const lines = [...merged.values()];

  // Load the REAL variants, products and market prices.
  const variants = await prisma.productVariant.findMany({
    where: {
      OR: lines.map((l) => ({
        color: l.color,
        size: l.size,
        product: { slug: l.productSlug, status: "PUBLISHED" as const },
      })),
    },
    include: { product: { include: { prices: { where: { marketId: market.id, available: true } } } } },
  });

  const resolved = lines.map((l) => {
    const variant = variants.find(
      (v) => v.product.slug === l.productSlug && v.color === l.color && v.size === l.size,
    );
    if (!variant) throw new CheckoutError("An item in your bag is no longer available.");
    const label = `${variant.product.name} (${variant.color}, ${variant.size})`;
    const price = variant.product.prices[0];
    if (!price) throw new CheckoutError(`${variant.product.name} is not sold in ${market.name}.`);
    if (variant.stock < l.qty) {
      throw new CheckoutError(
        variant.stock === 0 ? `${label} is sold out.` : `Only ${variant.stock} left of ${label}.`,
      );
    }
    return {
      variant,
      product: variant.product,
      qty: l.qty,
      unitMinor: toMinor(Number(price.price), currency),
    };
  });

  const subtotalMinor = resolved.reduce((sum, r) => sum + r.unitMinor * r.qty, 0);

  // Discount code (if any). An invalid code is an error rather than being
  // silently ignored, so nobody pays full price by accident.
  let discountRule: DiscountRule | null = null;
  let discountCode: string | null = null;
  if (input.discountCode) {
    const code = input.discountCode.toUpperCase();
    const d = await prisma.discount.findUnique({ where: { code } });
    const now = new Date();
    const valid =
      d &&
      d.active &&
      (!d.startDate || d.startDate <= now) &&
      (!d.endDate || d.endDate >= now) &&
      fromMinor(subtotalMinor, currency) >= Number(d.minOrder);
    if (!d || !valid) throw new DiscountError("Invalid or expired code");
    discountCode = d.code;
    discountRule = { type: d.type, value: Number(d.value) };
  }

  const priceOf = (method: Delivery) => {
    const o = market.shippingOptions.find((x) => x.code === method);
    return o ? Number(o.price) : undefined;
  };

  const totals = computeTotals({
    subtotalMinor,
    discount: discountRule,
    delivery: input.delivery,
    shippingOptionPrice: priceOf(input.delivery),
    currency,
  });

  // What each delivery method would cost, for the "Delivery method" step.
  const deliveryCostsMinor = {
    standard: computeShippingMinor({ delivery: "standard", subtotalMinor, optionPrice: priceOf("standard"), currency }),
    express: computeShippingMinor({ delivery: "express", subtotalMinor, optionPrice: priceOf("express"), currency }),
  };

  return { market, currency, resolved, totals, discountCode, deliveryCostsMinor };
}

export type Quote = Awaited<ReturnType<typeof buildQuote>>;
