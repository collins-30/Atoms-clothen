"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, X, Heart, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatPrice } from "@/lib/format";
import { quoteCheckout, type QuoteResult } from "@/server/quote";

type Quote = Extract<QuoteResult, { ok: true }>;

export default function CartPage() {
  const { cart, updateQty, removeFromCart, toggleWish, cartCount, market, hydrated } = useStore();

  const items = useMemo(
    () => cart.map(({ productSlug, color, size, qty }) => ({ productSlug, color, size, qty })),
    [cart],
  );

  // Estimated totals from the server, using standard delivery. These are the
  // same numbers checkout will charge, so the bag and checkout always agree.
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    let cancelled = false;
    quoteCheckout({ marketCode: market.code, items, delivery: "standard" })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setQuote(r);
          setQuoteError("");
        } else {
          setQuote(null);
          setQuoteError(r.error);
        }
      })
      .catch(() => !cancelled && setQuoteError("Could not update your totals."));
    return () => {
      cancelled = true;
    };
  }, [hydrated, items, market.code]);

  if (!hydrated) {
    return <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-10 md:py-16 min-h-[50vh]" />;
  }

  // Only use a quote that belongs to the market being shown. After switching
  // market, the old numbers are in the wrong currency, so show "…" until the
  // new quote arrives.
  const fresh = quote && quote.marketCode === market.code ? quote : null;
  const money = (n: number | undefined) => (n === undefined || !fresh ? "…" : formatPrice(n, market));
  const subtotal = fresh?.subtotal;
  const shipping = fresh?.shipping;
  const tax = fresh?.tax;
  const total = fresh?.total;

  // TODO "You may also like": needs your use-catalog.js + ProductCard.jsx ported
  // (send me those and I'll add the section back).

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-10 md:py-16">
      <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)" }}>Shopping Bag</h1>
      <p className="text-sm text-stone-500 mb-10">{cartCount} {cartCount === 1 ? "item" : "items"}</p>

      {cart.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-stone-500 mb-6">Your bag is empty.</p>
          <Link href="/shop" className="inline-flex items-center gap-2 h-12 px-8 bg-foreground text-background text-xs tracking-[0.2em] uppercase hover:bg-[#2D5A27]">
            Start shopping <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 divide-y divide-stone-200">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-4 md:gap-6 py-6 first:pt-0">
                <Link href={`/product/${item.productSlug}`} className="relative w-24 md:w-32 shrink-0 aspect-[3/4] bg-stone-100 overflow-hidden">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="128px" className="object-cover" />}
                </Link>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between gap-3">
                    <Link href={`/product/${item.productSlug}`} className="text-base font-medium text-foreground">{item.name}</Link>
                    <span className="font-mono text-sm">{fresh ? formatPrice((fresh.unitPrices[item.id] ?? 0) * item.qty, market) : "…"}</span>
                  </div>
                  <p className="text-sm text-stone-500 mt-1">{item.color} · Size {item.size}</p>
                  <p className="text-xs text-stone-400 font-mono mt-1">{item.sku}</p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center border border-stone-300">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-9 h-9 flex items-center justify-center" aria-label="Decrease"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-9 text-center text-sm">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-9 h-9 flex items-center justify-center" aria-label="Increase"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <button onClick={() => { toggleWish(item.productSlug); removeFromCart(item.id); }} className="flex items-center gap-1.5 text-stone-500 hover:text-foreground">
                        <Heart className="w-4 h-4" /> Save
                      </button>
                      <button onClick={() => removeFromCart(item.id)} className="flex items-center gap-1.5 text-stone-500 hover:text-foreground">
                        <X className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-stone-50 p-6 md:p-8 sticky top-24">
              <h2 className="text-sm tracking-[0.2em] uppercase mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-stone-600">Subtotal</span><span className="font-mono">{money(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-stone-600">Shipping</span><span className="font-mono">{fresh && shipping === 0 ? "Free" : money(shipping)}</span></div>
                <div className="flex justify-between"><span className="text-stone-600">Estimated tax</span><span className="font-mono">{money(tax)}</span></div>
                <div className="pt-3 border-t border-stone-200 flex justify-between text-base font-medium"><span>Total</span><span className="font-mono">{money(total)}</span></div>
              </div>
              {quoteError && <p className="mt-4 text-xs text-destructive">{quoteError}</p>}
              <Link href="/checkout" className="mt-6 w-full h-12 flex items-center justify-center bg-foreground text-background text-xs tracking-[0.2em] uppercase hover:bg-[#2D5A27] transition-colors">
                Proceed to checkout
              </Link>
              <Link href="/shop" className="mt-4 block text-center text-xs text-stone-500 underline hover:text-foreground">Continue shopping</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
