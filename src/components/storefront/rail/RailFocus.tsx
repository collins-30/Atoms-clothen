"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowLeft, ArrowRight, Heart, Loader2, X } from "lucide-react";
import Hanger from "@/components/storefront/rail/Hanger";
import { useStore } from "@/lib/store-context";
import { formatPrice, type PriceMarket } from "@/lib/format";
import { getProductDetail, type ProductDetailResult } from "@/server/product";
import type { StoreProduct } from "@/lib/storefront-types";

// Product details (sizes, stock, price) fetched once per product + market.
const detailCache = new Map<string, Promise<ProductDetailResult>>();
const loadDetail = (slug: string, market: string) => {
  const key = `${slug}|${market}`;
  if (!detailCache.has(key)) {
    detailCache.set(
      key,
      getProductDetail(slug, market).catch(() => {
        detailCache.delete(key);
        return { ok: false as const, error: "Could not load this piece. Please try again." };
      }),
    );
  }
  return detailCache.get(key)!;
};

/**
 * The closer look at one garment from the rail: large on its hanger with the
 * neighbouring pieces blurred behind, front/back, colours, live sizes and
 * Add to bag (the same cart as the product page). A centred window on
 * desktop, a sheet from the bottom on phones.
 */
export default function RailFocus({
  products,
  index,
  onIndex,
  onClose,
  priceMap,
  market,
}: {
  products: StoreProduct[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  priceMap: Record<string, number>;
  market: PriceMarket & { code: string };
}) {
  const p = products[index];
  const prev = products[(index - 1 + products.length) % products.length];
  const next = products[(index + 1) % products.length];
  const many = products.length > 1;
  const go = (d: 1 | -1) => onIndex((index + d + products.length) % products.length);

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Popup
          onKeyDown={(e) => {
            const t = e.target as HTMLElement;
            if (many && t.tagName !== "INPUT" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
              e.preventDefault();
              go(e.key === "ArrowRight" ? 1 : -1);
            }
          }}
          className="fixed z-[71] bg-background text-foreground outline-none inset-x-0 bottom-0 max-h-[92svh] overflow-y-auto rounded-t-2xl md:rounded-none md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[min(1100px,calc(100vw-4rem))] md:h-[min(720px,calc(100vh-4rem))] md:max-h-none md:overflow-hidden md:grid md:grid-cols-[1.25fr_1fr] data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-6 md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95"
        >
          {/* Stage: the garment on its hanger, neighbours blurred behind */}
          <div className="relative rail-wall h-[52svh] md:h-full overflow-hidden">
            <span className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-stone-300 z-10" aria-hidden="true" />
            <span className="rail-pole absolute left-0 right-0" style={{ top: 34 }} aria-hidden="true" />
            {many && (
              <>
                <Ghost product={prev} side="left" />
                <Ghost product={next} side="right" />
              </>
            )}
            <Stage key={p.id} product={p} />
            {many && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous piece" className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-background/90 border border-stone-200 flex items-center justify-center hover:bg-background">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next piece" className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-background/90 border border-stone-200 flex items-center justify-center hover:bg-background">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <Details key={`${p.id}-${market.code}`} product={p} listPrice={priceMap[p.slug]} market={market} onAdded={onClose} />

          <DialogPrimitive.Close
            className="absolute top-3 right-3 z-30 w-11 h-11 rounded-full bg-background/90 border border-stone-200 flex items-center justify-center hover:bg-background"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The main garment, with a Front / Back switch when a back image exists. */
function Stage({ product }: { product: StoreProduct }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const rack = product.rack!;
  const src = side === "back" && rack.back ? rack.back : rack.front;
  // Fit inside the stage: at most ~70% of its height, garment-proportioned.
  const widthPct = Math.min(58, 62 / rack.aspect + 8);
  return (
    <>
      <div className="absolute left-1/2 -translate-x-1/2 z-10 animate-in fade-in-0 zoom-in-95 duration-500" style={{ top: 35, width: `${widthPct}%`, maxWidth: 360 }}>
        <Hanger className="relative mx-auto block" style={{ width: "62%" }} />
        <div className="relative" style={{ marginTop: "-16.5%" }}>
          <Image
            key={src}
            src={src}
            alt={`${product.name}, ${side}`}
            width={720}
            height={Math.round(720 * rack.aspect)}
            sizes="(min-width: 768px) 360px, 60vw"
            priority
            className="rail-cutout block w-full h-auto select-none animate-in fade-in-0 duration-300"
            draggable={false}
          />
        </div>
      </div>
      {rack.back && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex border border-foreground bg-background/90" role="group" aria-label="Side">
          {(["front", "back"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={`h-9 px-4 text-[10px] tracking-[0.2em] uppercase ${side === s ? "bg-foreground text-background" : "text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** A neighbouring garment, faded and blurred at the edge of the stage. */
function Ghost({ product, side }: { product: StoreProduct; side: "left" | "right" }) {
  const rack = product.rack!;
  return (
    <div
      className={`absolute top-[35px] w-[26%] max-w-[180px] opacity-40 blur-[5px] pointer-events-none ${side === "left" ? "-left-[6%]" : "-right-[6%]"}`}
      aria-hidden="true"
    >
      <Hanger className="relative mx-auto block" style={{ width: "62%" }} />
      <div style={{ marginTop: "-16.5%" }}>
        <Image src={rack.front} alt="" width={360} height={Math.round(360 * rack.aspect)} sizes="180px" className="block w-full h-auto" />
      </div>
    </div>
  );
}

/** Name, price, colours, live sizes and Add to bag. */
function Details({
  product,
  listPrice,
  market,
  onAdded,
}: {
  product: StoreProduct;
  listPrice: number | undefined;
  market: PriceMarket & { code: string };
  onAdded: () => void;
}) {
  const { addToCart, toggleWish, isWished } = useStore();
  const [result, setResult] = useState<ProductDetailResult | null>(null);
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [size, setSize] = useState("");

  useEffect(() => {
    let alive = true;
    void loadDetail(product.slug, market.code).then((r) => {
      if (alive) setResult(r);
    });
    return () => {
      alive = false;
    };
  }, [product.slug, market.code]);

  const detail = result?.ok ? result.detail : null;
  const price = detail?.price ?? listPrice;
  const colors = detail?.product.colors.length ? detail.product.colors : product.colors;
  const activeColor = colors.some((c) => c.name === color) ? color : (colors[0]?.name ?? "");
  const sizes = detail?.variants.filter((v) => v.color === activeColor) ?? [];
  const variant = sizes.find((v) => v.size === size);
  const anyStock = detail ? detail.variants.some((v) => v.stock > 0) : product.inStock;
  const wished = isWished(product.slug);

  const add = () => {
    if (!detail || !variant || variant.stock <= 0) return;
    addToCart({
      productSlug: product.slug,
      name: product.name,
      image: product.images[0] ?? product.rack?.front,
      color: activeColor,
      size: variant.size,
      price: detail.price,
      qty: 1,
      sku: variant.sku,
    });
    onAdded(); // the cart drawer opens; close this window so it isn't hidden
  };

  return (
    <div className="p-5 pb-8 md:p-10 md:overflow-y-auto flex flex-col">
      <p className="text-[10px] tracking-[0.25em] uppercase text-stone-500">{product.categoryName ?? "The rail"}</p>
      <DialogPrimitive.Title className="mt-2 text-2xl md:text-3xl font-bold tracking-tight pr-12 md:pr-0" style={{ fontFamily: "var(--font-heading)" }}>
        {product.name}
      </DialogPrimitive.Title>
      <div className="mt-3 flex items-center gap-3">
        {price != null && <span className="font-mono text-lg">{formatPrice(price, market)}</span>}
        {!anyStock && <span className="text-[10px] tracking-[0.2em] uppercase border border-foreground px-2 py-1">Sold out</span>}
      </div>

      {colors.length > 0 && (
        <div className="mt-7">
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-3">
            Colour <span className="text-foreground normal-case tracking-normal text-xs ml-1">{activeColor}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setColor(c.name);
                  setSize("");
                }}
                aria-pressed={activeColor === c.name}
                className={`relative h-10 pl-7 pr-3 text-xs border transition-colors ${activeColor === c.name ? "border-foreground" : "border-stone-300 hover:border-foreground"}`}
              >
                {/* a little swing tag: punched hole + colour */}
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-stone-300" style={{ background: c.hex }} aria-hidden="true" />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7">
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-3">Size</p>
        {!result ? (
          <p className="text-sm text-stone-500 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking availability…
          </p>
        ) : !detail ? (
          <p className="text-sm text-rose-700">{result.ok ? "Unavailable." : result.error}</p>
        ) : sizes.length === 0 ? (
          <p className="text-sm text-stone-500">No sizes listed for this colour yet.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {sizes.map((s) => (
              <button
                key={s.size}
                type="button"
                onClick={() => setSize(s.size)}
                disabled={s.stock <= 0}
                aria-pressed={size === s.size}
                className={`h-11 text-sm border transition-colors ${
                  size === s.size
                    ? "border-foreground bg-foreground text-background"
                    : s.stock <= 0
                      ? "border-stone-200 text-stone-300 line-through cursor-not-allowed"
                      : "border-stone-300 hover:border-foreground"
                }`}
              >
                {s.size}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={add}
          disabled={!detail || !variant || variant.stock <= 0}
          className="flex-1 h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase hover:bg-[var(--success)] transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
        >
          {!anyStock ? "Sold out" : !size ? "Select a size" : "Add to bag"}
        </button>
        <button
          type="button"
          onClick={() => toggleWish(product.slug)}
          aria-label={wished ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={wished}
          className="w-12 h-12 border border-stone-300 hover:border-foreground flex items-center justify-center"
        >
          <Heart className={`w-4 h-4 ${wished ? "fill-foreground" : ""}`} strokeWidth={1.5} />
        </button>
      </div>

      <Link href={`/product/${product.slug}`} className="mt-6 self-start text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1 inline-flex items-center gap-2">
        View full details <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
