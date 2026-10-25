"use client";

// Drop-in replacement for your Base44 store-context.jsx. Same names
// (useStore, cart, addToCart, market, ...), so existing components keep
// working. Under the hood it's now three small Zustand stores.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCartStore, type CartItem, type NewCartItem } from "@/stores/cart-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useMarketStore } from "@/stores/market-store";
import type { MarketInfo } from "@/server/markets";

type Ctx = { markets: MarketInfo[]; hydrated: boolean };
const StoreContext = createContext<Ctx | null>(null);

const FALLBACK_MARKET: MarketInfo = {
  code: "US",
  name: "United States",
  currency: "USD",
  currency_symbol: "$",
  currencySymbol: "$",
};

/** Wrap the storefront once (see app/(store)/layout.tsx). `markets` comes from the database. */
export function StoreProvider({ markets, children }: { markets: MarketInfo[]; children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Load the saved bag / favorites / market from localStorage after mount.
    Promise.all([
      useCartStore.persist.rehydrate(),
      useFavoritesStore.persist.rehydrate(),
      useMarketStore.persist.rehydrate(),
    ]).finally(() => setHydrated(true));
  }, []);

  const value = useMemo(() => ({ markets, hydrated }), [markets, hydrated]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");

  const cart = useCartStore((s) => s.items);
  const cartOpen = useCartStore((s) => s.open);
  const addToCart = useCartStore((s) => s.add);
  const updateQty = useCartStore((s) => s.setQty);
  const removeFromCart = useCartStore((s) => s.remove);
  const clearCart = useCartStore((s) => s.clear);
  const setCartOpen = useCartStore((s) => s.setOpen);

  const wishlist = useFavoritesStore((s) => s.slugs);
  const toggleWish = useFavoritesStore((s) => s.toggle);

  const marketCode = useMarketStore((s) => s.code);
  const setMarketCode = useMarketStore((s) => s.setCode);

  const market = ctx.markets.find((m) => m.code === marketCode) ?? ctx.markets[0] ?? FALLBACK_MARKET;
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const isWished = (slug: string) => wishlist.includes(slug);

  return {
    hydrated: ctx.hydrated, // false until the saved bag has loaded: show a skeleton, not "empty"
    markets: ctx.markets,
    market,
    marketCode: market.code,
    setMarketCode,
    cart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    cartCount,
    cartOpen,
    setCartOpen,
    wishlist,
    toggleWish,
    isWished,
  };
}

export type { CartItem, NewCartItem };
