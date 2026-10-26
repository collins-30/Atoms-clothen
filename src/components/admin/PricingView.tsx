"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NoticeBar, primaryBtn, type Notice } from "@/components/admin/AdminUi";
import MarketsDialog from "@/components/admin/MarketsDialog";
import { savePrices, type AdminMarket, type PricingData } from "@/server/admin-markets";

type Cell = { price: string; available: boolean };

function MarketPrices({
  market,
  products,
  prices,
  onNotice,
}: {
  market: AdminMarket;
  products: PricingData["products"];
  prices: PricingData["prices"];
  onNotice: (n: Notice) => void;
}) {
  const router = useRouter();
  const original = (productId: string): Cell => {
    const p = prices.find((x) => x.productId === productId && x.marketId === market.id);
    return { price: p ? String(p.price) : "", available: p?.available ?? true };
  };
  const [cells, setCells] = useState<Record<string, Cell>>(() => Object.fromEntries(products.map((p) => [p.id, original(p.id)])));
  const [saving, setSaving] = useState(false);

  const changed = products.filter((p) => {
    const o = original(p.id);
    const c = cells[p.id];
    return c && (c.price.trim() !== o.price || c.available !== o.available);
  });

  const save = async () => {
    const rows = changed.map((p) => ({
      productId: p.id,
      price: cells[p.id].price.trim() === "" ? null : Number(cells[p.id].price),
      available: cells[p.id].available,
    }));
    if (rows.some((r) => r.price !== null && (!Number.isFinite(r.price) || r.price < 0))) {
      onNotice({ tone: "error", text: "Prices must be numbers, 0 or more." });
      return;
    }
    setSaving(true);
    onNotice(null);
    try {
      const res = await savePrices({ marketId: market.id, rows });
      if (!res.ok) onNotice({ tone: "error", text: res.error });
      else {
        onNotice({ tone: "ok", text: `Prices saved for ${market.name}.` });
        router.refresh();
      }
    } catch {
      onNotice({ tone: "error", text: "Could not save the prices. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs text-stone-500">Currency: {market.currency} {market.symbol}</p>
        <button onClick={save} disabled={saving || changed.length === 0} className={primaryBtn}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save prices{changed.length > 0 && ` (${changed.length})`}
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-stone-400 border border-stone-200 py-16 text-center">No products yet.</p>
      ) : (
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-4 py-3">
              <p className="text-sm text-[#1a1a1a] flex-1 min-w-0 truncate">
                {p.name}
                {p.status !== "PUBLISHED" && <span className="ml-2 text-[10px] tracking-[0.15em] uppercase text-stone-400">{p.status.toLowerCase()}</span>}
              </p>
              <div className="flex items-center gap-2 w-40">
                <span className="text-sm text-stone-400">{market.symbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="—"
                  value={cells[p.id]?.price ?? ""}
                  onChange={(e) => setCells((c) => ({ ...c, [p.id]: { ...c[p.id], price: e.target.value } }))}
                  aria-label={`Price for ${p.name}`}
                  className="w-24 h-9 px-2 text-sm text-right bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a]"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-stone-500 cursor-pointer w-28">
                <input
                  type="checkbox"
                  checked={cells[p.id]?.available ?? true}
                  onChange={(e) => setCells((c) => ({ ...c, [p.id]: { ...c[p.id], available: e.target.checked } }))}
                  className="size-4 accent-[#1a1a1a]"
                />
                Available
              </label>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-stone-400 mt-4">Leave a price blank to hide the product from this market.</p>
    </div>
  );
}

export default function PricingView({ markets, products, prices }: PricingData) {
  const router = useRouter();
  const [marketId, setMarketId] = useState(markets.find((m) => m.active)?.id ?? markets[0]?.id ?? "");
  const [manage, setManage] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const market = markets.find((m) => m.id === marketId) ?? markets[0];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {market && (
          <select
            value={market.id}
            onChange={(e) => { setMarketId(e.target.value); setNotice(null); }}
            aria-label="Market"
            className="h-10 w-full sm:w-64 px-3 text-sm bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a]"
          >
            {markets.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.currency}){m.active ? "" : " · inactive"}</option>)}
          </select>
        )}
        <button onClick={() => setManage(true)} className="sm:ml-auto h-10 px-6 border border-stone-300 text-xs tracking-[0.15em] uppercase hover:border-[#1a1a1a]">
          Manage markets
        </button>
      </div>
      {notice && <div className="mb-4"><NoticeBar notice={notice} /></div>}

      {market ? (
        <MarketPrices key={market.id} market={market} products={products} prices={prices} onNotice={setNotice} />
      ) : (
        <p className="text-sm text-stone-400 border border-stone-200 py-16 text-center">No markets yet. Use &ldquo;Manage markets&rdquo; to add one.</p>
      )}

      {manage && (
        <MarketsDialog
          markets={markets}
          onClose={() => setManage(false)}
          onDone={(text) => {
            setNotice({ tone: "ok", text });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
