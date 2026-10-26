"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NoticeBar, primaryBtn, type Notice } from "@/components/admin/AdminUi";
import {
  deleteVariant,
  generateMissingVariants,
  getProductVariants,
  saveVariantStocks,
  type AdminProduct,
  type AdminVariant,
} from "@/server/admin-products";

type Row = AdminVariant & { stockText: string };

export default function ProductStockDialog({
  product,
  onClose,
  onChanged,
}: {
  product: AdminProduct;
  onClose: () => void;
  onChanged: () => void; // refresh the product list's stock totals
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = async () => {
    const res = await getProductVariants(product.id);
    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      setRows([]);
      return;
    }
    setRows(res.variants.map((v) => ({ ...v, stockText: String(v.stock) })));
    setCanGenerate(res.colors.length > 0 && res.sizes.length > 0);
  };

  useEffect(() => {
    let active = true;
    getProductVariants(product.id)
      .then((res) => {
        if (!active) return;
        if (!res.ok) {
          setNotice({ tone: "error", text: res.error });
          setRows([]);
          return;
        }
        setRows(res.variants.map((v) => ({ ...v, stockText: String(v.stock) })));
        setCanGenerate(res.colors.length > 0 && res.sizes.length > 0);
      })
      .catch(() => {
        if (!active) return;
        setNotice({ tone: "error", text: "Could not load the variants." });
        setRows([]);
      });
    return () => {
      active = false;
    };
  }, [product.id]);

  const setStock = (id: string, text: string) => setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, stockText: text } : r)) ?? null);

  const generate = async () => {
    setGenerating(true);
    setNotice(null);
    try {
      const res = await generateMissingVariants(product.id);
      if (!res.ok) setNotice({ tone: "error", text: res.error });
      else {
        setNotice({ tone: "ok", text: `${res.created} variant${res.created === 1 ? "" : "s"} generated.` });
        await load();
        onChanged();
      }
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!rows) return;
    const stocks = rows.map((r) => ({ id: r.id, stock: Number(r.stockText) }));
    if (stocks.some((s) => !Number.isInteger(s.stock) || s.stock < 0)) {
      setNotice({ tone: "error", text: "Stock must be a whole number, 0 or more." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await saveVariantStocks({ productId: product.id, stocks });
      if (!res.ok) setNotice({ tone: "error", text: res.error });
      else {
        setNotice({ tone: "ok", text: "Stock saved." });
        await load();
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Row) => {
    const res = await deleteVariant(r.id);
    if (!res.ok) setNotice({ tone: "error", text: res.error });
    else {
      await load();
      onChanged();
    }
  };

  const byColor = (rows ?? []).reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.color] ||= []).push(r);
    return acc;
  }, {});

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-none bg-[#F9F9F7]">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
            Stock · {product.name}
          </DialogTitle>
        </DialogHeader>

        <NoticeBar notice={notice} />

        {!rows ? (
          <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin text-stone-400 mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-stone-500 mb-4">No variants yet for this product.</p>
            {canGenerate ? (
              <button onClick={generate} disabled={generating} className={primaryBtn}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate from colors × sizes
              </button>
            ) : (
              <p className="text-xs text-stone-400">Add colors and sizes to the product first, then come back here.</p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {Object.entries(byColor).map(([color, list]) => (
                <div key={color}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full border border-stone-300" style={{ background: list[0]?.colorHex || "#ccc" }} />
                    <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">{color}</p>
                  </div>
                  <div className="divide-y divide-stone-100 border-y border-stone-100">
                    {list.map((v) => (
                      <div key={v.id} className="flex items-center gap-4 py-2.5">
                        <span className="text-sm text-[#1a1a1a] w-16">Size {v.size}</span>
                        <span className="text-xs text-stone-400 font-mono flex-1 truncate">{v.sku}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={v.stockText}
                          onChange={(e) => setStock(v.id, e.target.value)}
                          aria-label={`Stock for ${v.color} ${v.size}`}
                          className="w-20 h-8 px-2 text-sm text-right bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a]"
                        />
                        <button onClick={() => remove(v)} className="text-stone-300 hover:text-rose-700" aria-label={`Delete ${v.color} ${v.size}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <button
                onClick={generate}
                disabled={generating || !canGenerate}
                className="h-10 px-5 border border-stone-300 text-xs tracking-[0.15em] uppercase hover:border-[#1a1a1a] disabled:opacity-50 inline-flex items-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate missing
              </button>
              <button onClick={save} disabled={saving} className={primaryBtn}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save stock
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
