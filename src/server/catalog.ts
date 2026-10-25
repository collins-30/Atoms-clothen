"use server";

import { prisma } from "@/lib/db";
import type { Catalog, StoreProduct } from "@/lib/storefront-types";

// Json columns come back as `unknown`; make sure we only pass on what we expect.
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const colorList = (v: unknown): { name: string; hex: string }[] =>
  Array.isArray(v)
    ? v.flatMap((c) =>
        c && typeof c === "object" && typeof (c as { name?: unknown }).name === "string"
          ? [{ name: (c as { name: string }).name, hex: String((c as { hex?: unknown }).hex ?? "#cccccc") }]
          : [],
      )
    : [];

/**
 * Replaces your useCatalog data loading. A product appears in a market only if
 * it has an AVAILABLE ProductPrice row there, which is the same rule as the old
 * `markets` list: removing it from one market doesn't affect the others.
 */
export async function getCatalog(marketCode: string): Promise<Catalog> {
  const empty: Catalog = { products: [], priceMap: {} };
  if (typeof marketCode !== "string" || !marketCode) return empty; // this is called from the browser: don't trust it

  const market = await prisma.market.findFirst({
    where: { code: marketCode, active: true },
    select: { id: true },
  });
  if (!market) return empty;

  const rows = await prisma.product.findMany({
    where: { status: "PUBLISHED", prices: { some: { marketId: market.id, available: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      category: { select: { slug: true } },
      prices: { where: { marketId: market.id, available: true }, select: { price: true } },
      variants: { select: { stock: true } },
    },
  });

  const priceMap: Record<string, number> = {};
  const products: StoreProduct[] = rows.map((p) => {
    priceMap[p.slug] = Number(p.prices[0].price);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      gender: p.gender.toLowerCase() as StoreProduct["gender"],
      categorySlug: p.category?.slug ?? null,
      images: strings(p.images),
      colors: colorList(p.colors),
      sizes: strings(p.sizes),
      tags: strings(p.tags),
      collection: p.collection,
      isNew: p.isNew,
      isBestseller: p.isBestseller,
      isTrending: p.isTrending,
      featured: p.featured,
      inStock: p.variants.some((v) => v.stock > 0),
      createdAt: p.createdAt.toISOString(),
    };
  });

  return { products, priceMap };
}
