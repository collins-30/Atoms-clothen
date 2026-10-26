"use server";

import type { Gender, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { colorList, strings } from "@/lib/json";

// ───────────── Types the admin screens receive ─────────────

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  categoryId: string | null;
  categoryName: string | null;
  gender: Gender;
  status: ProductStatus;
  collection: string;
  isNew: boolean;
  isBestseller: boolean;
  isTrending: boolean;
  featured: boolean;
  tags: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  materials: string;
  care: string;
  images: string[];
  stock: number; // total pieces across all variants
  prices: { marketId: string; price: number; available: boolean }[];
};
export type AdminMarketLite = { id: string; code: string; name: string; currency: string; symbol: string; active: boolean };
export type AdminCategoryLite = { id: string; name: string; gender: Gender; parentId: string | null };
export type AdminVariant = { id: string; color: string; colorHex: string | null; size: string; sku: string; stock: number };

type Ok = { ok: true };
type Fail = { ok: false; error: string };
export type ProductsData = { products: AdminProduct[]; categories: AdminCategoryLite[]; markets: AdminMarketLite[] };

async function guard(): Promise<Fail | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return { ok: false, error: "Forbidden" };
  }
}
const isUnique = (e: unknown) => typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";

// ───────────── Reading ─────────────

/** Products (latest 500), plus the categories and markets the form needs. */
export async function getAdminProducts(): Promise<ProductsData> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();

  const [rows, categories, markets, stockSums] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { category: { select: { name: true } }, prices: { select: { marketId: true, price: true, available: true } } },
    }),
    prisma.category.findMany({
      orderBy: [{ gender: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, gender: true, parentId: true },
    }),
    prisma.market.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.productVariant.groupBy({ by: ["productId"], _sum: { stock: true } }),
  ]);
  const stockBy = new Map(stockSums.map((s) => [s.productId, s._sum.stock ?? 0]));

  return {
    categories,
    markets: markets.map((m) => ({ id: m.id, code: m.code, name: m.name, currency: m.currency, symbol: m.currencySymbol, active: m.active })),
    products: rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      sku: p.sku ?? "",
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      gender: p.gender,
      status: p.status,
      collection: p.collection ?? "",
      isNew: p.isNew,
      isBestseller: p.isBestseller,
      isTrending: p.isTrending,
      featured: p.featured,
      tags: strings(p.tags),
      sizes: strings(p.sizes),
      colors: colorList(p.colors),
      materials: p.materials ?? "",
      care: p.care ?? "",
      images: strings(p.images),
      stock: stockBy.get(p.id) ?? 0,
      prices: p.prices.map((x) => ({ marketId: x.marketId, price: x.price.toNumber(), available: x.available })),
    })),
  };
}

// ───────────── Create / edit ─────────────

const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://"), "Image links must start with / or https://");

const productSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Product name is required.").max(160),
  slug: z.string().trim().max(160),
  description: z.string().max(10000),
  sku: z.string().trim().max(64),
  categoryId: z.string().min(1).nullable(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX"]),
  status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]),
  collection: z.string().trim().max(80),
  isNew: z.boolean(),
  isBestseller: z.boolean(),
  isTrending: z.boolean(),
  featured: z.boolean(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
  sizes: z.array(z.string().trim().min(1).max(12)).max(20),
  colors: z.array(z.object({ name: z.string().trim().min(1).max(40), hex: z.string().regex(/^#[0-9a-fA-F]{3,8}$/) })).max(30),
  materials: z.string().max(5000),
  care: z.string().max(5000),
  images: z.array(imageUrl).max(20),
  // One entry per market the product is sold in. A market left out = not sold there.
  prices: z.array(z.object({ marketId: z.string().min(1), price: z.number().min(0).max(10_000_000), available: z.boolean() })).max(50),
});

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const money = (n: number) => Math.round(n * 100) / 100;

export async function saveProduct(raw: unknown): Promise<Ok | Fail> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;

  const slug = slugify(d.slug || d.name) || `product-${Date.now()}`;
  const notSelf = d.id ? { NOT: { id: d.id } } : {};
  if (await prisma.product.findFirst({ where: { slug, ...notSelf }, select: { id: true } })) {
    return { ok: false, error: "Another product already uses that slug." };
  }
  if (d.sku && (await prisma.product.findFirst({ where: { sku: d.sku, ...notSelf }, select: { id: true } }))) {
    return { ok: false, error: "Another product already uses that SKU." };
  }
  if (d.categoryId && !(await prisma.category.findUnique({ where: { id: d.categoryId }, select: { id: true } }))) {
    return { ok: false, error: "That category no longer exists." };
  }

  const marketIds = [...new Set(d.prices.map((p) => p.marketId))];
  if (marketIds.length !== d.prices.length) return { ok: false, error: "Each market can only be listed once." };
  if (marketIds.length && (await prisma.market.count({ where: { id: { in: marketIds } } })) !== marketIds.length) {
    return { ok: false, error: "One of the markets no longer exists." };
  }

  const base = {
    name: d.name,
    slug,
    description: d.description.trim() || null,
    sku: d.sku || null,
    categoryId: d.categoryId,
    gender: d.gender as Gender,
    status: d.status as ProductStatus,
    collection: d.collection || null,
    isNew: d.isNew,
    isBestseller: d.isBestseller,
    isTrending: d.isTrending,
    featured: d.featured,
    tags: d.tags,
    sizes: d.sizes,
    colors: d.colors,
    materials: d.materials.trim() || null,
    care: d.care.trim() || null,
    images: d.images,
  };

  try {
    if (!d.id) {
      await prisma.product.create({
        data: { ...base, prices: { create: d.prices.map((p) => ({ marketId: p.marketId, price: money(p.price), available: p.available })) } },
      });
    } else {
      const id = d.id;
      await prisma.$transaction([
        prisma.product.update({ where: { id }, data: base }),
        prisma.productPrice.deleteMany({ where: { productId: id, marketId: { notIn: marketIds } } }),
        ...d.prices.map((p) =>
          prisma.productPrice.upsert({
            where: { productId_marketId: { productId: id, marketId: p.marketId } },
            update: { price: money(p.price), available: p.available },
            create: { productId: id, marketId: p.marketId, price: money(p.price), available: p.available },
          }),
        ),
      ]);
    }
  } catch (e) {
    if (isUnique(e)) return { ok: false, error: "That slug or SKU is already used by another product." };
    console.error("[admin-products] save failed:", e);
    return { ok: false, error: "Could not save the product. Please try again." };
  }
  return { ok: true };
}

/** Deletes the product everywhere. Past orders keep their own copy of name, image and price. */
export async function deleteProduct(id: unknown): Promise<Ok | Fail> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof id !== "string" || !id) return { ok: false, error: "Product not found." };
  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Product not found." };
  }
  return { ok: true };
}

// ───────────── Stock & variants ─────────────

export async function getProductVariants(
  productId: unknown,
): Promise<(Ok & { variants: AdminVariant[]; colors: { name: string; hex: string }[]; sizes: string[] }) | Fail> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof productId !== "string" || !productId) return { ok: false, error: "Product not found." };

  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { colors: true, sizes: true, variants: { orderBy: [{ color: "asc" }, { size: "asc" }] } },
  });
  if (!p) return { ok: false, error: "Product not found." };
  return {
    ok: true,
    colors: colorList(p.colors),
    sizes: strings(p.sizes),
    variants: p.variants.map((v) => ({ id: v.id, color: v.color, colorHex: v.colorHex, size: v.size, sku: v.sku, stock: v.stock })),
  };
}

const stockSchema = z.object({
  productId: z.string().min(1),
  stocks: z.array(z.object({ id: z.string().min(1), stock: z.number().int().min(0).max(1_000_000) })).max(500),
});

export async function saveVariantStocks(raw: unknown): Promise<Ok | Fail> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = stockSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Stock must be a whole number, 0 or more." };
  const { productId, stocks } = parsed.data;
  await prisma.$transaction(
    stocks.map((s) => prisma.productVariant.updateMany({ where: { id: s.id, productId }, data: { stock: s.stock } })),
  );
  return { ok: true };
}

export async function deleteVariant(id: unknown): Promise<Ok | Fail> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof id !== "string" || !id) return { ok: false, error: "Variant not found." };
  try {
    await prisma.productVariant.delete({ where: { id } }); // order lines keep their own copy
  } catch {
    return { ok: false, error: "Variant not found." };
  }
  return { ok: true };
}

/** Creates a variant (stock 10) for every colour × size that doesn't have one yet. */
export async function generateMissingVariants(productId: unknown): Promise<(Ok & { created: number }) | Fail> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof productId !== "string" || !productId) return { ok: false, error: "Product not found." };

  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true, sku: true, colors: true, sizes: true, variants: { select: { color: true, size: true } } },
  });
  if (!p) return { ok: false, error: "Product not found." };

  const colors = colorList(p.colors);
  const sizes = strings(p.sizes);
  const have = new Set(p.variants.map((v) => `${v.color}|${v.size}`));
  const prefix = (p.sku || p.slug).toUpperCase().replace(/[^A-Z0-9-]/g, "");

  const wanted: { color: string; hex: string; size: string; sku: string }[] = [];
  for (const c of colors) {
    for (const s of sizes) {
      if (have.has(`${c.name}|${s}`)) continue;
      const abbr = c.name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "X";
      const sz = s.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "X";
      wanted.push({ color: c.name, hex: c.hex, size: s, sku: `${prefix}-${abbr}-${sz}` });
    }
  }
  if (wanted.length === 0) return { ok: true, created: 0 };

  // SKUs are unique store-wide ("Navy Blue" and "Navy Black" would both shorten to NAV), so
  // add -2, -3 … when a code is already taken.
  const taken = new Set(
    (await prisma.productVariant.findMany({ where: { sku: { startsWith: prefix } }, select: { sku: true } })).map((v) => v.sku),
  );
  for (const w of wanted) {
    let sku = w.sku;
    for (let n = 2; taken.has(sku); n++) sku = `${w.sku}-${n}`;
    taken.add(sku);
    w.sku = sku;
  }

  try {
    await prisma.productVariant.createMany({
      data: wanted.map((w) => ({ productId, color: w.color, colorHex: w.hex, size: w.size, sku: w.sku, stock: 10 })),
    });
  } catch (e) {
    console.error("[admin-products] generate variants failed:", e);
    return { ok: false, error: "Could not create the variants. Please try again." };
  }
  return { ok: true, created: wanted.length };
}
