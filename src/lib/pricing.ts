import { fromMinor, toMinor } from "./money";

// ── Business rules carried over from your Base44 createCheckoutSession ──
export const TAX_RATE = 0.08; // flat 8% on (subtotal - discount)
// Standard delivery is free from this subtotal. NOTE: it is compared in each
// market's own currency (150 USD, 150 CAD, 150 EUR, 150 NGN...). Consider a
// per-market threshold on the Market table before you launch.
export const FREE_STANDARD_SHIPPING_FROM = 150;
// Used only when a market has no ShippingOption row for the chosen method.
export const FALLBACK_SHIPPING = { standard: 12, express: 25 } as const;

export type Delivery = "standard" | "express";
export type DiscountRule = { type: "PERCENT" | "FIXED"; value: number };

export function computeDiscountMinor(
  subtotalMinor: number,
  rule: DiscountRule | null,
  currency: string,
): number {
  if (!rule) return 0;
  const raw =
    rule.type === "FIXED"
      ? toMinor(rule.value, currency)
      : Math.round((subtotalMinor * rule.value) / 100);
  return Math.max(0, Math.min(raw, subtotalMinor)); // never more than the subtotal
}

export function computeShippingMinor(args: {
  delivery: Delivery;
  subtotalMinor: number;
  optionPrice?: number; // price of the market's ShippingOption, if one exists
  currency: string;
}): number {
  const { delivery, subtotalMinor, optionPrice, currency } = args;
  if (delivery === "express") {
    return toMinor(optionPrice ?? FALLBACK_SHIPPING.express, currency);
  }
  if (fromMinor(subtotalMinor, currency) >= FREE_STANDARD_SHIPPING_FROM) return 0;
  return toMinor(optionPrice ?? FALLBACK_SHIPPING.standard, currency);
}

export function computeTotals(args: {
  subtotalMinor: number;
  discount: DiscountRule | null;
  delivery: Delivery;
  shippingOptionPrice?: number;
  currency: string;
}) {
  const { subtotalMinor, discount, delivery, shippingOptionPrice, currency } = args;
  const discountMinor = computeDiscountMinor(subtotalMinor, discount, currency);
  const shippingMinor = computeShippingMinor({
    delivery,
    subtotalMinor,
    optionPrice: shippingOptionPrice,
    currency,
  });
  const taxMinor = Math.round((subtotalMinor - discountMinor) * TAX_RATE);
  const totalMinor = subtotalMinor - discountMinor + shippingMinor + taxMinor;
  return { subtotalMinor, discountMinor, shippingMinor, taxMinor, totalMinor };
}
