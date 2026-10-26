"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useCatalog } from "@/lib/use-catalog";
import ProductCard from "@/components/storefront/ProductCard";

export default function FavoritesView() {
  const { wishlist } = useStore();
  const { products, priceMap, loading, market } = useCatalog();
  const favorites = products.filter((p) => wishlist.includes(p.slug));

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12 md:py-16">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Favorites
        </h1>
        <p className="text-sm text-muted-foreground mt-2 min-h-5">
          {loading ? "" : `${favorites.length} saved ${favorites.length === 1 ? "piece" : "pieces"}`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] bg-muted animate-pulse" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-24 border-y border-border">
          <Heart className="w-8 h-8 mx-auto text-muted-foreground mb-4" strokeWidth={1.4} />
          <p className="text-sm text-muted-foreground mb-6">Nothing saved yet — tap the heart on any piece you love.</p>
          <Link
            href="/shop"
            className="inline-block text-xs tracking-[0.15em] uppercase border border-foreground px-8 py-3 text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            Shop the collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {favorites.map((p) => (
            <ProductCard key={p.slug} product={p} priceMap={priceMap} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
