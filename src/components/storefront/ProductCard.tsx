"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatPrice, type PriceMarket } from "@/lib/format";
import type { StoreProduct } from "@/lib/storefront-types";
import ProductVideo from "@/components/storefront/ProductVideo";
import { useNightMode } from "@/lib/night-mode";

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
  const night = useNightMode();
  const nightShot = product.nightShot;
  const showNightShot = night.on && !!nightShot;
  // Without a night shot, Night Mode dims the photo instead (through a soft blur).
  const dimCls = nightShot ? "" : `${night.on ? "night-dim" : "night-undim"} ${night.changed ? "night-animate" : ""}`;

  return (
    <div className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
          <div
            className={`absolute inset-0 transition-[opacity,filter] duration-700 ease-out ${showNightShot ? "opacity-0 blur-md" : "opacity-100 blur-0"} ${dimCls}`}
            aria-hidden={showNightShot || undefined}
          >
            {product.cardVideo ? (
              // A real model video of this product (set in admin › Products › Shop card shows).
              <ProductVideo
                src={product.cardVideo.src}
                poster={product.cardVideo.poster ?? img ?? null}
                alt={product.name}
                sizes="(min-width: 1024px) 25vw, 50vw"
                active={!showNightShot}
              />
            ) : (
              img && (
                <Image
                  src={img}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                />
              )
            )}
          </div>
          {/* Night shot (Admin › Products › tick "Night shot"), only loaded once Night Mode is used. */}
          {nightShot && (night.on || night.changed) && (
            <NightLayer show={showNightShot}>
              {nightShot.kind === "video" ? (
                <ProductVideo
                  src={nightShot.src}
                  poster={nightShot.poster}
                  alt={`${product.name}, night shot`}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  active={showNightShot}
                />
              ) : (
                <Image
                  src={nightShot.src}
                  alt={`${product.name}, night shot`}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                />
              )}
            </NightLayer>
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
        <Heart className={`w-4 h-4 ${wished ? "fill-foreground text-foreground" : "text-foreground"}`} strokeWidth={1.4} />
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

/** Fades (with a soft blur) between the card's normal media and its night shot. */
function NightLayer({ show, children }: { show: boolean; children: ReactNode }) {
  // Start hidden for one frame after mounting, so the first switch fades in too.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const visible = show && ready;
  return (
    <div
      className={`absolute inset-0 transition-[opacity,filter] duration-700 ease-out ${visible ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}
      aria-hidden={!visible || undefined}
    >
      {children}
    </div>
  );
}
