"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store-context";
import { getCatalog } from "@/server/catalog";
import type { StoreProduct } from "@/lib/storefront-types";

// Same API as your Base44 use-catalog.js: { products, priceMap, loading, market }.
export function useCatalog() {
  const { market, hydrated } = useStore();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [loadedMarket, setLoadedMarket] = useState<string | null>(null);

  useEffect(() => {
    // Wait until the saved market has loaded, otherwise we'd fetch the default
    // market first and then fetch again.
    if (!hydrated) return;
    let active = true;
    getCatalog(market.code)
      .then((c) => {
        if (!active) return;
        setProducts(c.products);
        setPriceMap(c.priceMap);
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
        setPriceMap({});
      })
      .finally(() => {
        if (active) setLoadedMarket(market.code);
      });
    return () => {
      active = false;
    };
  }, [hydrated, market.code]);

  const loading = !hydrated || loadedMarket !== market.code;
  return { products, priceMap, loading, market };
}
