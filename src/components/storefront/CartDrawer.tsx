"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatPrice } from "@/lib/format";
import { quoteCheckout, type QuoteResult } from "@/server/quote";

type Quote = Extract<QuoteResult, { ok: true }>;

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateQty, removeFromCart, cartCount, market, hydrated } = useStore();

  const items = useMemo(
    () => cart.map(({ productSlug, color, size, qty }) => ({ productSlug, color, size, qty })),
    [cart],
  );

  // Prices saved in the bag are from whichever market the item was added in.
  // So when the drawer opens we ask the server for today's prices in the
  // CURRENT market, the same numbers the cart page and checkout use.
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  useEffect(() => {
    if (!hydrated || !cartOpen || items.length === 0) return;
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
      .catch(() => !cancelled && setQuoteError("Could not update your prices."));
    return () => {
      cancelled = true;
    };
  }, [hydrated, cartOpen, items, market.code]);

  // Only use prices that belong to the market being shown.
  const prices = quote && quote.marketCode === market.code ? quote.unitPrices : null;
  const lineTotal = (id: string, qty: number) => {
    const unit = prices?.[id];
    return unit === undefined ? "…" : formatPrice(unit * qty, market);
  };
  const subtotal = prices && cart.every((i) => prices[i.id] !== undefined)
    ? formatPrice(cart.reduce((s, i) => s + prices[i.id] * i.qty, 0), market)
    : "…";

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${cartOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setCartOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-[70] h-full w-full max-w-md bg-background shadow-2xl transition-transform duration-300 flex flex-col ${cartOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!cartOpen}
        inert={!cartOpen}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-stone-200">
          <p className="text-xs tracking-[0.2em] uppercase">Your Bag ({cartCount})</p>
          <button onClick={() => setCartOpen(false)} aria-label="Close cart"><X className="w-5 h-5 text-foreground" /></button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag className="w-10 h-10 text-stone-300" strokeWidth={1} />
            <p className="text-sm text-stone-500">Your bag is empty.</p>
            <Link href="/shop" onClick={() => setCartOpen(false)} className="text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1">Continue shopping</Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <Link href={`/product/${item.productSlug}`} onClick={() => setCartOpen(false)} className="relative w-20 shrink-0 aspect-[3/4] bg-stone-100 overflow-hidden">
                    {item.image && <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />}
                  </Link>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between gap-2">
                      <Link href={`/product/${item.productSlug}`} onClick={() => setCartOpen(false)} className="text-sm font-medium text-foreground">{item.name}</Link>
                      <button onClick={() => removeFromCart(item.id)} className="text-stone-400 hover:text-foreground" aria-label="Remove"><X className="w-4 h-4" /></button>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">{item.color} · {item.size}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-stone-300">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center" aria-label="Decrease"><Minus className="w-3 h-3" /></button>
                        <span className="w-7 text-center text-xs">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center" aria-label="Increase"><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="text-sm font-mono">{lineTotal(item.id, item.qty)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-200 px-5 py-5 space-y-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-mono">{subtotal}</span>
              </div>
              {quoteError ? (
                <p className="text-xs text-destructive">{quoteError}</p>
              ) : (
                <p className="text-xs text-stone-500">Shipping &amp; taxes calculated at checkout.</p>
              )}
              <Link href="/cart" onClick={() => setCartOpen(false)} className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase flex items-center justify-center hover:bg-[#2D5A27] transition-colors">
                View Bag &amp; Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
