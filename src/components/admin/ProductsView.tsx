"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, PackageOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { Gender } from "@prisma/client";
import { NoticeBar, primaryBtn, type Notice } from "@/components/admin/AdminUi";
import ProductFormDialog from "@/components/admin/ProductFormDialog";
import ProductStockDialog from "@/components/admin/ProductStockDialog";
import { fmtMoney } from "@/lib/admin-format";
import { deleteProduct, type AdminProduct, type ProductsData } from "@/server/admin-products";

const chip = (on: boolean) =>
  `px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
    on ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#F9F9F7]" : "border-stone-200 text-stone-500 hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
  }`;

const STATUS_STYLE = {
  PUBLISHED: "text-emerald-900 bg-emerald-50",
  DRAFT: "text-stone-500 bg-stone-100",
  ARCHIVED: "text-stone-400 bg-stone-100",
} as const;

export default function ProductsView({ products, categories, markets }: ProductsData) {
  const router = useRouter();
  const [marketId, setMarketId] = useState<"all" | string>("all");
  const [gender, setGender] = useState<"all" | Gender>("all");
  const [q, setQ] = useState("");
  const [editor, setEditor] = useState<{ product: AdminProduct | null } | null>(null);
  const [stockFor, setStockFor] = useState<AdminProduct | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const market = markets.find((m) => m.id === marketId) ?? null;
  const marketCodes = (p: AdminProduct) =>
    p.prices.filter((x) => x.available).map((x) => markets.find((m) => m.id === x.marketId)?.code).filter(Boolean).join(", ") || "no market";

  const needle = q.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (market && !p.prices.some((x) => x.marketId === market.id && x.available)) return false;
    if (gender !== "all" && p.gender !== gender) return false;
    if (needle && !`${p.name} ${p.slug} ${p.sku}`.toLowerCase().includes(needle)) return false;
    return true;
  });

  const remove = async (p: AdminProduct) => {
    if (!window.confirm(`Delete "${p.name}" everywhere? Its variants and prices are removed too. Past orders keep their own record of it. This can't be undone.`)) return;
    const res = await deleteProduct(p.id);
    setNotice(res.ok ? { tone: "ok", text: "Product deleted." } : { tone: "error", text: res.error });
    if (res.ok) router.refresh();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] tracking-[0.15em] uppercase text-stone-400 mr-1">Market</span>
          <button onClick={() => setMarketId("all")} className={chip(marketId === "all")}>All</button>
          {markets.map((m) => (
            <button key={m.id} onClick={() => setMarketId(m.id)} className={chip(marketId === m.id)}>{m.code}</button>
          ))}
          <span className="text-[10px] tracking-[0.15em] uppercase text-stone-400 mx-1">Gender</span>
          {(["all", "WOMEN", "MEN", "UNISEX"] as const).map((g) => (
            <button key={g} onClick={() => setGender(g)} className={chip(gender === g)}>{g.toLowerCase()}</button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="h-9 px-3 text-sm bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a] md:w-64 md:ml-auto"
        />
        <button onClick={() => setEditor({ product: null })} className={primaryBtn}>
          <Plus className="w-4 h-4" /> New product
        </button>
      </div>
      {notice && <div className="mb-4"><NoticeBar notice={notice} /></div>}

      {visible.length === 0 ? (
        <div className="border border-stone-200 py-16 text-center">
          <PackageOpen className="w-6 h-6 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-400">{products.length === 0 ? "No products yet." : "No products match."}</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {visible.map((p) => {
            const price = market ? p.prices.find((x) => x.marketId === market.id) : null;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="w-12 h-14 shrink-0 bg-stone-100 overflow-hidden">
                  {p.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{p.name}</p>
                  <p className="text-xs text-stone-500 truncate">
                    {p.categoryName ?? "no category"} · {p.gender.toLowerCase()} · {p.slug} · {marketCodes(p)}
                  </p>
                </div>
                {market && price && <span className="text-sm text-[#1a1a1a] w-24 text-right">{fmtMoney(price.price, market.symbol)}</span>}
                <span className={`text-[10px] tracking-[0.15em] uppercase px-2 py-1 ${STATUS_STYLE[p.status]}`}>{p.status.toLowerCase()}</span>
                <span className={`text-sm w-20 text-right ${p.stock < 10 ? "text-amber-700" : "text-stone-600"}`}>{p.stock} pcs</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setEditor({ product: p })} className="text-xs text-stone-500 hover:text-[#1a1a1a] inline-flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => setStockFor(p)} className="text-xs text-stone-500 hover:text-[#1a1a1a] inline-flex items-center gap-1">
                    <Boxes className="w-3 h-3" /> Stock
                  </button>
                  <button onClick={() => remove(p)} className="text-stone-300 hover:text-rose-700" aria-label={`Delete ${p.name}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editor && (
        <ProductFormDialog
          key={editor.product?.id ?? "new"}
          product={editor.product}
          categories={categories}
          markets={markets}
          onClose={() => setEditor(null)}
          onSaved={(text) => {
            setNotice({ tone: "ok", text });
            router.refresh();
          }}
        />
      )}
      {stockFor && <ProductStockDialog key={stockFor.id} product={stockFor} onClose={() => setStockFor(null)} onChanged={() => router.refresh()} />}
    </div>
  );
}
