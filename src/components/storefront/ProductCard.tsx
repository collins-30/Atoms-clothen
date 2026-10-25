"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatPrice, type PriceMarket } from "@/lib/format";
import type { StoreProduct } from "@/lib/storefront-types";

type Props = {
  product: StoreProduct;
  priceMap: Record<string, number>;
  market: PriceMarket;
};

export default function ProductCard({ product, priceMap, market }: Props) {
  const { toggleWish, isWished } = useStore();
  const price = priceMap[product.slug];
  const wished = isWished(product.slug);
  const img = product.images[0];

  return (
    <div className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
          {img && (
            <Image
              src={img}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
          {product.isNew && (
            <span className="absolute left-3 top-3 text-[10px] tracking-[0.2em] uppercase bg-background text-foreground px-2.5 py-1">New</span>
          )}
          {!product.isNew && product.isBestseller && (
            <span className="absolute left-3 top-3 text-[10px] tracking-[0.2em] uppercase bg-foreground text-background px-2.5 py-1">Bestseller</span>
          )}
        </div>
      </Link>
      <button
        onClick={() => toggleWish(product.slug)}
        className="absolute right-3 top-3 p-1.5 bg-background/80 rounded-full backdrop-blur hover:scale-110 transition-transform"
        aria-label={wished ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={`w-4 h-4 ${wished ? "fill-[#1a1a1a] text-foreground" : "text-foreground"}`} strokeWidth={1.4} />
      </button>
      <div className="mt-3 flex justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/product/${product.slug}`} className="block text-sm font-medium text-foreground truncate hover:underline">{product.name}</Link>
          <div className="mt-1.5 flex gap-1.5">
            {product.colors.map((c) => (
              <span key={c.name} className="w-3 h-3 rounded-full border border-stone-300" style={{ background: c.hex }} title={c.name} />
            ))}
          </div>
        </div>
        <span className="text-sm font-mono text-foreground shrink-0">{price != null ? formatPrice(price, market) : "—"}</span>
      </div>
    </div>
  );
}
