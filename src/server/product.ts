"use server";

import { prisma } from "@/lib/db";
import { colorList, strings } from "@/lib/json";

export type ProductDetail = {
  product: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    gender: "men" | "women" | "unisex";
    categorySlug: string | null;
    categoryName: string | null;
    images: string[];
    colors: { name: string; hex: string }[];
    sku: string | null;
    materials: string | null;
    care: string | null;
  };
  variants: { color: string; size: string; sku: string; stock: number }[];
  /** Price in the requested market, in normal units (e.g. 240 or 372000). */
  price: number;
};

export type ProductDetailResult =
  | { ok: true; detail: ProductDetail }
  | { ok: false; error: string };

/**
 * Everything the product page needs, for one market. Called from the browser,
 * so the inputs are checked here. A product is only returned when it is
 * published AND has an available price in that market (the same rule as the
 * shop listing), so a customer can't open a product from another market by URL.
 */
export async function getProductDetail(slug: unknown, marketCode: unknown): Promise<ProductDetailResult> {
  if (typeof slug !== "string" || !slug || slug.length > 200) return { ok: false, error: "Product not found" };
  if (typeof marketCode !== "string" || !marketCode || marketCode.length > 10) {
    return { ok: false, error: "Product unavailable in your market" };
  }

  const p = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      category: { select: { slug: true, name: true } },
      variants: { select: { color: true, size: true, sku: true, stock: true } },
      prices: {
        where: { available: true, market: { code: marketCode, active: true } },
        select: { price: true },
      },
    },
  });
  if (!p) return { ok: false, error: "Product not found" };
  if (p.prices.length === 0) return { ok: false, error: "Product unavailable in your market" };

  // Show sizes in the order the product lists them (S, M, L, XL), not database order.
  const sizeOrder = strings(p.sizes);
  const colors = colorList(p.colors);
  const rank = (list: string[], v: string) => {
    const i = list.indexOf(v);
    return i === -1 ? list.length : i;
  };
  const colorNames = colors.map((c) => c.name);
  const variants = [...p.variants].sort(
    (a, b) => rank(colorNames, a.color) - rank(colorNames, b.color) || rank(sizeOrder, a.size) - rank(sizeOrder, b.size),
  );

  return {
    ok: true,
    detail: {
      product: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        gender: p.gender.toLowerCase() as ProductDetail["product"]["gender"],
        categorySlug: p.category?.slug ?? null,
        categoryName: p.category?.name ?? null,
        images: strings(p.images),
        colors,
        sku: p.sku,
        materials: p.materials,
        care: p.care,
      },
      variants,
      price: Number(p.prices[0].price),
    },
  };
}
