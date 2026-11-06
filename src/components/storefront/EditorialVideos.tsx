"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag } from "lucide-react";
import ProductVideo from "@/components/storefront/ProductVideo";
import { formatPrice, type PriceMarket } from "@/lib/format";
import type { StoreProduct } from "@/lib/storefront-types";

const FADE_MS = 800;

/**
 * Large, full-bleed model videos for products marked "Feature in the editorial
 * section" in the admin. Only products with a real model video appear here.
 * Switching products cross-fades from one video to the next.
 */
export default function EditorialVideos({
  products,
  priceMap,
  market,
}: {
  products: StoreProduct[];
  priceMap: Record<string, number>;
  market: PriceMarket;
}) {
  const items = products.filter((p) => p.video).slice(0, 6);
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);

  // Drop the previous video once the cross-fade has finished.
  useEffect(() => {
    if (leaving === null) return;
    const t = setTimeout(() => setLeaving(null), FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (items.length === 0) return null;
  const index = Math.min(active, items.length - 1);
  const current = items[index];
  const price = priceMap[current.slug];

  const show = (i: number) => {
    if (i === index) return;
    setLeaving(index);
    setActive(i);
  };

  return (
    <section aria-label="The edit: model videos" className="relative h-[82svh] md:h-[92vh] min-h-[520px] max-h-[1100px] overflow-hidden bg-stone-900">
      {items.map((p, i) =>
        i === index || i === leaving ? (
          <div
            key={p.id}
            className={`absolute inset-0 transition-opacity ease-out ${i === index ? "opacity-100" : "opacity-0"}`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
            aria-hidden={i !== index}
          >
            <ProductVideo
              src={p.video!.src}
              poster={p.video!.poster}
              alt={`${p.name}, worn by a model`}
              sizes="100vw"
              controls={i === index}
              weight={1}
            />
          </div>
        ) : null,
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/10" />

      <div className="relative h-full max-w-[1600px] mx-auto px-4 md:px-8 pb-24 md:pb-16 flex flex-col justify-end">
        <div key={current.id} className="max-w-xl text-background animate-in fade-in slide-in-from-bottom-3 duration-700">
          <p className="text-xs tracking-[0.3em] uppercase opacity-90">
            The Edit · {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </p>
          <h2 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight leading-[0.95]" style={{ fontFamily: "var(--font-heading)" }}>
            {current.name}
          </h2>
          {price != null && <p className="mt-4 font-mono text-lg">{formatPrice(price, market)}</p>}
          <div className="mt-7 flex items-center gap-3">
            <Link
              href={`/product/${current.slug}`}
              className="h-12 px-8 bg-background text-foreground text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2 hover:bg-background/90"
            >
              Shop the look <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/product/${current.slug}`}
              className="h-12 w-12 border border-background/70 text-background inline-flex items-center justify-center hover:bg-background/10"
              aria-label={`Choose a size and add ${current.name} to your bag`}
            >
              <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {items.length > 1 && (
          <div className="absolute left-4 right-20 bottom-5 md:left-auto md:right-24 md:bottom-6 flex gap-2 overflow-x-auto" role="group" aria-label="Choose a look">
            {items.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => show(i)}
                aria-pressed={i === index}
                aria-label={`Show ${p.name}`}
                className={`relative w-11 h-14 md:w-14 md:h-[72px] shrink-0 overflow-hidden border transition-all ${
                  i === index ? "border-background opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {(p.video?.poster ?? p.images[0]) && (
                  <Image src={(p.video?.poster ?? p.images[0])!} alt="" fill sizes="56px" className="object-cover" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
