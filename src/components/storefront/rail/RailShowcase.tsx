"use client";

import { useState } from "react";
import Link from "next/link";
import ClothingRail from "@/components/storefront/rail/ClothingRail";
import type { PriceMarket } from "@/lib/format";
import type { StoreProduct } from "@/lib/storefront-types";

export type RailGroup = { key: string; label: string; gender: string; categorySlug: string; products: StoreProduct[] };

const GENDER_LABEL: Record<string, string> = { women: "Women's", men: "Men's", unisex: "Unisex" };

/**
 * One rail per category (categories are per gender, e.g. Women › Dresses),
 * built from products that have a rail image. Ordered by the categories'
 * display order. Names that exist for both genders get "Women's" / "Men's".
 */
export function groupForRails(products: StoreProduct[]): RailGroup[] {
  const groups = new Map<string, RailGroup & { order: number }>();
  for (const p of products) {
    if (!p.rack || !p.categorySlug) continue;
    const key = `${p.gender}|${p.categorySlug}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, label: p.categoryName ?? p.categorySlug, gender: p.gender, categorySlug: p.categorySlug, products: [], order: p.categoryOrder };
      groups.set(key, g);
    }
    g.products.push(p);
  }
  const list = [...groups.values()].sort((a, b) => a.order - b.order || a.gender.localeCompare(b.gender) || a.label.localeCompare(b.label));
  const counts = new Map<string, number>();
  for (const g of list) counts.set(g.label.toLowerCase(), (counts.get(g.label.toLowerCase()) ?? 0) + 1);
  return list.map(({ order: _order, ...g }) =>
    (counts.get(g.label.toLowerCase()) ?? 0) > 1 ? { ...g, label: `${GENDER_LABEL[g.gender] ?? ""} ${g.label}`.trim() } : g,
  );
}

export const seeAllHref = (g: RailGroup) =>
  `/shop?gender=${encodeURIComponent(g.gender)}&category=${encodeURIComponent(g.categorySlug)}&view=rail`;

/** Home page: "The Rail", one category at a time, switched with tabs. */
export default function RailShowcase({
  products,
  priceMap,
  market,
}: {
  products: StoreProduct[];
  priceMap: Record<string, number>;
  market: PriceMarket & { code: string };
}) {
  const groups = groupForRails(products);
  const [active, setActive] = useState(0);
  if (groups.length === 0) return null;
  const g = groups[Math.min(active, groups.length - 1)];

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-14 md:py-20" aria-labelledby="the-rail">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-stone-500 mb-2">Browse by the piece</p>
          <h2 id="the-rail" className="text-2xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            The Rail
          </h2>
        </div>
        <Link href={seeAllHref(g)} className="text-xs tracking-[0.2em] uppercase hover:opacity-60">
          See all {g.label}
        </Link>
      </div>

      {groups.length > 1 && (
        <div className="rail-scroll flex gap-2 overflow-x-auto mb-5 -mx-4 px-4 md:mx-0 md:px-0" role="tablist" aria-label="Category">
          {groups.map((x, i) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={x.key === g.key}
              onClick={() => setActive(i)}
              className={`h-10 px-4 shrink-0 text-xs tracking-[0.15em] uppercase border transition-colors ${
                x.key === g.key ? "bg-foreground text-background border-foreground" : "border-stone-300 hover:border-foreground"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}

      <div role="tabpanel" key={g.key} className="animate-in fade-in-0 duration-500">
        <ClothingRail products={g.products.slice(0, 16)} priceMap={priceMap} market={market} />
      </div>
    </section>
  );
}
