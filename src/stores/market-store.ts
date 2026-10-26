import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MARKET_COOKIE = "JAMAS_market";

type MarketState = {
  code: string;
  setCode: (code: string) => void;
};

export const useMarketStore = create<MarketState>()(
  persist(
    (set) => ({
      code: "US",
      setCode: (code) => {
        // Also save a cookie so server components can render the right
        // prices on the first load (read it with cookies() from next/headers).
        try {
          document.cookie = `${MARKET_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=31536000; samesite=lax`;
        } catch {
          /* cookies unavailable: the localStorage copy still works */
        }
        set({ code });
      },
    }),
    { name: "JAMAS_market", partialize: (s) => ({ code: s.code }), skipHydration: true },
  ),
);
