"use server";

import type { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { AdminResult } from "@/server/admin-categories";

export type AdminMarket = {
  id: string;
  code: string;
  name: string;
  currency: string;
  symbol: string;
  active: boolean;
  displayOrder: number;
  shippingStandard: string; // "" = not set (checkout then uses its built-in default)
  shippingExpress: string;
};
export type PricingProduct = { id: string; name: string; slug: string; status: ProductStatus };
export type PricingPrice = { productId: string; marketId: string; price: number; available: boolean };
export type PricingData = { markets: AdminMarket[]; products: PricingProduct[]; prices: PricingPrice[] };

async function guard(): Promise<{ ok: false; error: string } | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return { ok: false, error: "Forbidden" };
  }
}
const isUnique = (e: unknown) => typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";

export async function getPricingData(): Promise<PricingData> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();

  const [markets, products, prices] = await Promise.all([
    prisma.market.findMany({ orderBy: { displayOrder: "asc" }, include: { shippingOptions: true } }),
    prisma.product.findMany({ orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, slug: true, status: true } }),
    prisma.productPrice.findMany({ select: { productId: true, marketId: true, price: true, available: true } }),
  ]);

  const ship = (m: (typeof markets)[number], code: string) => {
    const o = m.shippingOptions.find((x) => x.code === code);
    return o ? String(o.price.toNumber()) : "";
  };

  return {
    markets: markets.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      currency: m.currency,
      symbol: m.currencySymbol,
      active: m.active,
      displayOrder: m.displayOrder,
      shippingStandard: ship(m, "standard"),
      shippingExpress: ship(m, "express"),
    })),
    products,
    prices: prices.map((p) => ({ productId: p.productId, marketId: p.marketId, price: p.price.toNumber(), available: p.available })),
  };
}

// ───────────── Prices for one market ─────────────

const money = (n: number) => Math.round(n * 100) / 100;

const priceSchema = z.object({
  marketId: z.string().min(1),
  // Only the rows that changed. price = null means "not sold in this market".
  rows: z
    .array(z.object({ productId: z.string().min(1), price: z.number().min(0).max(10_000_000).nullable(), available: z.boolean() }))
    .max(1000),
});

export async function savePrices(raw: unknown): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = priceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Prices must be numbers, 0 or more." };
  const { marketId, rows } = parsed.data;

  if (!(await prisma.market.findUnique({ where: { id: marketId }, select: { id: true } }))) {
    return { ok: false, error: "That market no longer exists." };
  }

  const blank = rows.filter((r) => r.price === null).map((r) => r.productId);
  const priced = rows.filter((r): r is { productId: string; price: number; available: boolean } => r.price !== null);
  try {
    await prisma.$transaction([
      prisma.productPrice.deleteMany({ where: { marketId, productId: { in: blank } } }),
      ...priced.map((r) =>
        prisma.productPrice.upsert({
          where: { productId_marketId: { productId: r.productId, marketId } },
          update: { price: money(r.price), available: r.available },
          create: { productId: r.productId, marketId, price: money(r.price), available: r.available },
        }),
      ),
    ]);
  } catch (e) {
    console.error("[admin-markets] save prices failed:", e);
    return { ok: false, error: "Could not save the prices. A product may have been deleted; reload and try again." };
  }
  return { ok: true };
}

// ───────────── The markets themselves ─────────────

const marketSchema = z.object({
  id: z.string().min(1).optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/, "Market codes use 2–8 letters or numbers, e.g. US."),
  name: z.string().trim().min(1, "Every market needs a name.").max(60),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code, e.g. USD."),
  symbol: z.string().trim().max(6),
  active: z.boolean(),
  displayOrder: z.number().int().min(0).max(1000),
  shippingStandard: z.number().min(0).max(1_000_000).nullable(),
  shippingExpress: z.number().min(0).max(1_000_000).nullable(),
});
const marketsSchema = z.object({ markets: z.array(marketSchema).min(1).max(30) });

export async function saveMarkets(raw: unknown): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = marketsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the markets." };
  const list = parsed.data.markets;

  if (new Set(list.map((m) => m.code)).size !== list.length) return { ok: false, error: "Each market needs its own code." };
  if (!list.some((m) => m.active)) return { ok: false, error: "Keep at least one active market." };

  // A market's code is saved on every order and in shoppers' browsers, so it can't change.
  const existing = await prisma.market.findMany({ where: { id: { in: list.flatMap((m) => (m.id ? [m.id] : [])) } }, select: { id: true, code: true } });
  for (const m of list) {
    if (m.id) {
      const was = existing.find((e) => e.id === m.id);
      if (!was) return { ok: false, error: "A market no longer exists; reload and try again." };
      if (was.code !== m.code) return { ok: false, error: `The code of ${was.code} can't be changed. Add a new market instead.` };
    }
  }

  const options = (m: (typeof list)[number]) =>
    [
      { code: "standard", price: m.shippingStandard },
      { code: "express", price: m.shippingExpress },
    ] as const;

  try {
    const ops = list.flatMap((m) => {
      const base = { name: m.name, currency: m.currency, currencySymbol: m.symbol, active: m.active, displayOrder: m.displayOrder };
      if (!m.id) {
        return [
          prisma.market.create({
            data: {
              ...base,
              code: m.code,
              shippingOptions: { create: options(m).flatMap((o) => (o.price === null ? [] : [{ code: o.code, price: money(o.price) }])) },
            },
          }),
        ];
      }
      const id = m.id;
      return [
        prisma.market.update({ where: { id }, data: base }),
        ...options(m).map((o) =>
          o.price === null
            ? prisma.shippingOption.deleteMany({ where: { marketId: id, code: o.code } })
            : prisma.shippingOption.upsert({
                where: { marketId_code: { marketId: id, code: o.code } },
                update: { price: money(o.price) },
                create: { marketId: id, code: o.code, price: money(o.price) },
              }),
        ),
      ];
    });
    await prisma.$transaction(ops);
  } catch (e) {
    if (isUnique(e)) return { ok: false, error: "That market code already exists." };
    console.error("[admin-markets] save markets failed:", e);
    return { ok: false, error: "Could not save the markets. Please try again." };
  }
  return { ok: true };
}

/** Removes the market, its product prices and its shipping prices. Past orders keep their market code. */
export async function deleteMarket(id: unknown): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof id !== "string" || !id) return { ok: false, error: "Market not found." };

  const m = await prisma.market.findUnique({ where: { id }, select: { active: true } });
  if (!m) return { ok: false, error: "Market not found." };
  if (m.active && (await prisma.market.count({ where: { active: true, NOT: { id } } })) === 0) {
    return { ok: false, error: "Keep at least one active market." };
  }
  await prisma.market.delete({ where: { id } });
  return { ok: true };
}
