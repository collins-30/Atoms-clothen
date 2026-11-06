"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Hanger from "@/components/storefront/rail/Hanger";
import RailFocus from "@/components/storefront/rail/RailFocus";
import { formatPrice, type PriceMarket } from "@/lib/format";
import type { StoreProduct } from "@/lib/storefront-types";

// Layout, in px. Desktop garments are drawn at GW wide (when facing you) and
// hang side-on in SLOT-wide slots; phones use the *_M sizes, facing forward.
const GW = 190;
const MAX_H = 380;
const SLOT = 50;
const GW_M = 132;
const MAX_H_M = 264;
const RAIL_TOP = 30;
const HANGER_RATIO = 0.62; // hanger width / garment width
const COLLAR = 0.5; // garment top sits this far down the hanger (bar hidden behind the collar)

const tiltFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h >>> 0) % 160) / 100 - 0.8).toFixed(2); // -0.8deg … 0.8deg
};

/** Garment size for a cut-out of this aspect (height / width), never taller than maxH. */
const fit = (aspect: number, gw: number, maxH: number) => {
  const w = Math.min(gw, maxH / aspect);
  return { w, h: w * aspect };
};

/**
 * A clothing rail: the products' cut-out images hang side-on from a chrome
 * rail and turn to face you on hover / keyboard focus. Click (or tap) opens a
 * closer look with sizes and Add to bag. Only products with a rail image are
 * shown; sold-out ones hang with a "Sold out" tag (from live stock).
 */
export default function ClothingRail({
  products,
  priceMap,
  market,
  title,
  seeAllHref,
}: {
  products: StoreProduct[];
  priceMap: Record<string, number>;
  market: PriceMarket & { code: string };
  title?: string;
  seeAllHref?: string;
}) {
  const items = products.filter((p) => p.rack);
  const [turned, setTurned] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [overflow, setOverflow] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setOverflow(el.scrollWidth > el.clientWidth + 4));
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [items.length]);

  if (items.length === 0) return null;

  const sizes = items.map((p) => ({ d: fit(p.rack!.aspect, GW, MAX_H), m: fit(p.rack!.aspect, GW_M, MAX_H_M) }));
  const tallest = Math.max(...sizes.map((s) => s.d.h));
  const tallestM = Math.max(...sizes.map((s) => s.m.h));
  const height = RAIL_TOP + GW * HANGER_RATIO * (64 / 120) * COLLAR + tallest + 56;
  const heightM = RAIL_TOP + GW_M * HANGER_RATIO * (64 / 120) * COLLAR + tallestM + 48;

  const label = (p: StoreProduct) => {
    const price = priceMap[p.slug];
    return `${p.name}${price != null ? ` — ${formatPrice(price, market)}` : ""}${p.inStock ? "" : " · Sold out"}`;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = buttons.current.findIndex((b) => b === document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = Math.min(items.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)));
    buttons.current[next]?.focus();
  };

  return (
    <section aria-label={title ? `${title} rail` : "Clothing rail"}>
      {title && (
        <div className="flex items-end justify-between mb-4 md:mb-5 gap-4">
          <h3 className="text-lg md:text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            {title} <span className="text-xs font-normal tracking-[0.15em] uppercase text-stone-500 align-middle ml-2">{items.length} pieces</span>
          </h3>
          {seeAllHref && (
            <Link href={seeAllHref} className="text-xs tracking-[0.2em] uppercase hover:opacity-60 inline-flex items-center gap-2 shrink-0">
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      <div className="relative rail-wall overflow-hidden">
        <div ref={scroller} className="rail-scroll overflow-x-auto overflow-y-hidden snap-x snap-mandatory md:snap-none">
          <div
            className="relative w-max min-w-full px-8 md:px-20 h-[var(--rail-h-m)] md:h-[var(--rail-h)]"
            style={{ "--rail-h": `${Math.round(height)}px`, "--rail-h-m": `${Math.round(heightM)}px` } as CSSProperties}
            onMouseLeave={() => setTurned(null)}
          >
            {/* wall brackets + chrome rail */}
            <span className="rail-bracket absolute left-5 md:left-12 top-0" style={{ height: RAIL_TOP + 5 }} aria-hidden="true" />
            <span className="rail-bracket absolute right-5 md:right-12 top-0" style={{ height: RAIL_TOP + 5 }} aria-hidden="true" />
            <span className="rail-pole absolute left-3 right-3 md:left-9 md:right-9" style={{ top: RAIL_TOP }} aria-hidden="true" />

            <ul className="relative flex justify-center h-full gap-3.5 md:gap-0" onKeyDown={onKeyDown}>
              {items.map((p, i) => {
                const { d, m } = sizes[i];
                const isTurned = turned === i;
                const dist = turned === null ? 0 : Math.abs(i - turned);
                const vars = {
                  "--slot": isTurned ? `${Math.round(d.w + 30)}px` : `${SLOT}px`,
                  "--slot-m": `${Math.round(m.w)}px`,
                  "--gw": `${Math.round(d.w)}px`,
                  "--gw-m": `${Math.round(m.w)}px`,
                  "--turn": isTurned ? "0deg" : "74deg",
                  "--lift": isTurned ? "40px" : "0px",
                  "--bright": isTurned ? "1" : "0.86",
                  "--tilt": `${isTurned ? 0 : tiltFor(p.id)}deg`,
                  zIndex: isTurned ? 40 : 30 - dist,
                } as CSSProperties;
                return (
                  <li
                    key={p.id}
                    className="rail-item relative shrink-0 h-full snap-center"
                    style={vars}
                    onMouseEnter={() => setTurned(i)}
                  >
                    <div className="absolute inset-x-0 flex justify-center" style={{ top: RAIL_TOP + 1 }}>
                      <button
                        ref={(el) => {
                          buttons.current[i] = el;
                        }}
                        type="button"
                        onClick={() => setOpen(i)}
                        onFocus={() => setTurned(i)}
                        aria-label={`${label(p)}. Look closer`}
                        className="rail-garment relative block shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
                      >
                        <Hanger className="relative mx-auto block" style={{ width: `${HANGER_RATIO * 100}%` }} />
                        <span className="block relative" style={{ marginTop: `-${(HANGER_RATIO * (64 / 120) * (1 - COLLAR) * 100).toFixed(2)}%` }}>
                          <Image
                            src={p.rack!.front}
                            alt=""
                            width={Math.round(d.w * 2)}
                            height={Math.round(d.h * 2)}
                            sizes="(min-width: 768px) 190px, 132px"
                            draggable={false}
                            className="block w-full h-auto select-none"
                          />
                          {!p.inStock && (
                            <span className="absolute top-[6%] left-[62%] flex flex-col items-center pointer-events-none" aria-hidden="true">
                              <span className="w-px h-4 bg-stone-500/70" />
                              <span className="rotate-[7deg] bg-background border border-stone-300 shadow-sm px-1.5 py-0.5 text-[9px] leading-none tracking-[0.15em] uppercase text-foreground whitespace-nowrap">
                                Sold out
                              </span>
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {overflow && (
          <>
            <button
              type="button"
              onClick={() => scroller.current?.scrollBy({ left: -scroller.current.clientWidth * 0.7, behavior: "smooth" })}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-background/90 border border-stone-200 items-center justify-center hover:bg-background"
              aria-label="Scroll the rail left"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroller.current?.scrollBy({ left: scroller.current.clientWidth * 0.7, behavior: "smooth" })}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-background/90 border border-stone-200 items-center justify-center hover:bg-background"
              aria-label="Scroll the rail right"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs tracking-[0.1em] text-stone-600">
        {turned !== null && items[turned] ? (
          label(items[turned])
        ) : (
          <>
            <span className="hidden md:inline">Hover a piece to turn it · click to look closer</span>
            <span className="md:hidden">Swipe the rail · tap a piece to look closer</span>
          </>
        )}
      </p>

      {open !== null && (
        <RailFocus
          products={items}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          priceMap={priceMap}
          market={market}
        />
      )}
    </section>
  );
}
