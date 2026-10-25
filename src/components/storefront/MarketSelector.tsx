"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store-context";

export default function MarketSelector({ dark = false }: { dark?: boolean }) {
  const { markets, market, setMarketCode } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking anywhere outside the menu, or pressing Escape.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const tone = dark ? "text-background" : "text-foreground";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase ${tone} hover:opacity-60`}
        aria-label="Select market"
        aria-expanded={open}
      >
        <span>{market.code}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-stone-200 shadow-xl py-1 z-50">
          <p className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-stone-400">Ship to</p>
          {markets.map((m) => (
            <button
              key={m.code}
              onClick={() => {
                setMarketCode(m.code);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-stone-100"
            >
              <span>
                {m.name} <span className="text-stone-400">· {m.currency}</span>
              </span>
              {m.code === market.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
