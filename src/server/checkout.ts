"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { checkoutSchema } from "@/lib/validators/checkout";
import { toDecimalString } from "@/lib/money";
import { buildQuote, CheckoutError } from "@/server/cart-pricing";
import { cancelUnpaidOrder } from "@/server/order-lifecycle";

export type CheckoutResult =
  | { ok: true; url: string; orderNumber: string }
  | { ok: false; error: string };

function newOrderNumber() {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AUR-${time}-${rand}`;
}

/** Stripe only accepts absolute https image URLs. */
function stripeImage(img: string | undefined, appUrl: string): string | undefined {
  if (!img) return undefined;
  if (img.startsWith("https://")) return img;
  if (img.startsWith("/") && appUrl.startsWith("https://")) return `${appUrl}${img}`;
  return undefined;
}

function firstImage(images: unknown): string | undefined {
  return Array.isArray(images) && typeof images[0] === "string" ? images[0] : undefined;
}

/**
 * Replaces your Base44 createCheckoutSession.
 *
 * The browser only says WHAT is in the bag (product, color, size, qty).
 * Prices, discount, shipping and tax are all worked out on the server from
 * the database (see cart-pricing.ts), so a customer can't edit the request
 * to pay less.
 *
 * Stock is reserved when the order is created. If the customer doesn't pay
 * within 30 minutes, the Stripe "expired" webhook cancels the order and puts
 * the stock back.
 */
export async function createCheckout(raw: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const input = parsed.data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    console.error("[checkout] NEXT_PUBLIC_APP_URL is not set");
    return { ok: false, error: "Checkout is not configured yet." };
  }

  let orderId: string | null = null;
  try {
    // Who is buying? (guests are allowed; userId stays null)
    const session = await auth();
    let userId: string | null = null;
    if (session?.user?.id) {
      const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
      userId = u?.id ?? null; // ignore stale sessions for deleted users
    }

    const { market, currency, resolved, totals, discountCode } = await buildQuote(input);

    const orderNumber = newOrderNumber();
    const a = input.shippingAddress;
    const dec = (minor: number) => toDecimalString(minor, currency);

    // Reserve stock + create the order in ONE transaction. If any item can't
    // be reserved, nothing is saved. `stock >= qty` in the WHERE makes it
    // impossible for two simultaneous buyers to push stock below zero.
    const order = await prisma.$transaction(async (tx) => {
      for (const r of resolved) {
        const res = await tx.productVariant.updateMany({
          where: { id: r.variant.id, stock: { gte: r.qty } },
          data: { stock: { decrement: r.qty } },
        });
        if (res.count === 0) {
          throw new CheckoutError(`Sorry, ${r.product.name} (${r.variant.color}, ${r.variant.size}) just sold out.`);
        }
      }
      return tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal: dec(totals.subtotalMinor),
          discountAmount: dec(totals.discountMinor),
          shipping: dec(totals.shippingMinor),
          tax: dec(totals.taxMinor),
          total: dec(totals.totalMinor),
          discountCode,
          currency,
          currencySymbol: market.currencySymbol,
          marketCode: market.code,
          carrier: input.delivery === "express" ? "Express" : "Standard",
          shipFullName: a.fullName,
          shipEmail: input.customer.email,
          shipPhone: a.phone || null,
          shipLine1: a.line1,
          shipLine2: a.line2 || null,
          shipCity: a.city,
          shipRegion: a.region || null,
          shipPostalCode: a.postalCode,
          shipCountry: a.country,
          items: {
            create: resolved.map((r) => ({
              productId: r.product.id,
              variantId: r.variant.id,
              slug: r.product.slug,
              name: r.product.name,
              image: firstImage(r.product.images) ?? null,
              color: r.variant.color,
              size: r.variant.size,
              qty: r.qty,
              price: dec(r.unitMinor),
            })),
          },
        },
      });
    });
    orderId = order.id;

    // Hand off to the payment provider.
    const provider = getPaymentProvider("stripe");
    const stripeLines = resolved.map((r) => ({
      name: `${r.product.name} (${r.variant.color}, ${r.variant.size})`,
      unitAmountMinor: r.unitMinor,
      quantity: r.qty,
      image: stripeImage(firstImage(r.product.images), appUrl),
    }));
    if (totals.shippingMinor > 0) {
      stripeLines.push({
        name: input.delivery === "express" ? "Express delivery" : "Standard delivery",
        unitAmountMinor: totals.shippingMinor,
        quantity: 1,
        image: undefined,
      });
    }
    if (totals.taxMinor > 0) {
      stripeLines.push({ name: "Tax", unitAmountMinor: totals.taxMinor, quantity: 1, image: undefined });
    }

    const { url, sessionId } = await provider.createCheckout({
      orderId: order.id,
      orderNumber,
      currency: currency.toLowerCase(),
      customerEmail: input.customer.email,
      lines: stripeLines,
      discount:
        totals.discountMinor > 0
          ? { amountMinor: totals.discountMinor, label: `Discount (${discountCode})` }
          : undefined,
      successUrl: `${appUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/checkout`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentProvider: provider.name, paymentSessionId: sessionId },
    });

    return { ok: true, url, orderNumber };
  } catch (e) {
    if (orderId) {
      // Order was created but payment couldn't start: release the stock.
      await cancelUnpaidOrder({ orderId, reason: "Payment setup failed" }).catch((err) =>
        console.error("[checkout] could not cancel order after failure:", err),
      );
    }
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    console.error("[checkout] failed:", e);
    return { ok: false, error: "We couldn't start the payment. Please try again." };
  }
}
