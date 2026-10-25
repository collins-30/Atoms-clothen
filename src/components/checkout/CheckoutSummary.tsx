"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { formatPrice, type PriceMarket } from "@/lib/format";
import type { CartItem } from "@/stores/cart-store";

type Props = {
  cart: CartItem[];
  market: PriceMarket;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  delivery: "standard" | "express";
  promo: string;
  setPromo: (v: string) => void;
  discountCode: string;
  /** Returns an error message, or null if the code was accepted. */
  onApplyPromo: (code: string) => Promise<string | null>;
  removePromo: () => void;
  /** Current prices from the server, keyed by cart item id. null = still loading. */
  unitPrices: Record<string, number> | null;
};

// Simple version with the same props your Base44 CheckoutSummary had (plus
// `unitPrices`). Port your own design over it if you prefer.
export default function CheckoutSummary({
  cart, market, subtotal, discount, shipping, tax, total, delivery,
  promo, setPromo, discountCode, onApplyPromo, removePromo, unitPrices,
}: Props) {
  const [promoError, setPromoError] = useState("");
  const [applying, setApplying] = useState(false);
  const ready = unitPrices !== null;
  const money = (n: number) => (ready ? formatPrice(n, market) : "…");

  const apply = async () => {
    const code = promo.trim().toUpperCase();
    if (!code || applying) return;
    setApplying(true);
    setPromoError("");
    const err = await onApplyPromo(code);
    if (err) setPromoError(err);
    setApplying(false);
  };

  return (
    <div className="bg-stone-50 p-6 md:p-8">
      <h2 className="text-sm tracking-[0.2em] uppercase mb-5">Order Summary</h2>

      <ul className="divide-y divide-stone-200 mb-5">
        {cart.map((item) => {
          const unit = unitPrices?.[item.id];
          return (
            <li key={item.id} className="flex gap-3 py-3 first:pt-0">
              <div className="relative w-14 shrink-0 aspect-[3/4] bg-stone-100 overflow-hidden">
                {item.image && <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.name}</p>
                <p className="text-xs text-stone-500">{item.color} · {item.size} · Qty {item.qty}</p>
              </div>
              <span className="font-mono text-sm">{unit === undefined ? "…" : formatPrice(unit * item.qty, market)}</span>
            </li>
          );
        })}
      </ul>

      {discountCode ? (
        <div className="flex items-center justify-between text-sm mb-5 border border-stone-200 px-3 py-2 bg-background">
          <span>Code <strong className="font-medium">{discountCode}</strong> applied</span>
          <button onClick={removePromo} aria-label="Remove code" className="text-stone-500 hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mb-5">
          <div className="flex gap-2">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="Promo code"
              className="h-10 flex-1 min-w-0 px-3 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={apply}
              disabled={applying || !promo.trim()}
              className="h-10 px-4 text-xs tracking-[0.15em] uppercase border border-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {applying ? "…" : "Apply"}
            </button>
          </div>
          {promoError && <p className="mt-2 text-xs text-destructive">{promoError}</p>}
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-stone-600">Subtotal</span><span className="font-mono">{money(subtotal)}</span></div>
        {discount > 0 && (
          <div className="flex justify-between"><span className="text-stone-600">Discount</span><span className="font-mono">-{money(discount)}</span></div>
        )}
        <div className="flex justify-between">
          <span className="text-stone-600">Shipping ({delivery === "express" ? "Express" : "Standard"})</span>
          <span className="font-mono">{ready && shipping === 0 ? "Free" : money(shipping)}</span>
        </div>
        <div className="flex justify-between"><span className="text-stone-600">Tax</span><span className="font-mono">{money(tax)}</span></div>
        <div className="pt-3 border-t border-stone-200 flex justify-between text-base font-medium">
          <span>Total</span><span className="font-mono">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}
