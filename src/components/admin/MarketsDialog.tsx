"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ghostBtn, primaryBtn } from "@/components/admin/AdminUi";
import { deleteMarket, saveMarkets, type AdminMarket } from "@/server/admin-markets";

type Row = {
  key: string; // stable React key
  id?: string; // absent = a market that hasn't been saved yet
  code: string;
  name: string;
  currency: string;
  symbol: string;
  active: boolean;
  displayOrder: string;
  shippingStandard: string;
  shippingExpress: string;
};

const cell = "w-full h-9 px-2 text-sm bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a] disabled:bg-stone-100 disabled:text-stone-500";
const mini = "block text-[9px] tracking-[0.15em] uppercase text-stone-500 mb-1";

export default function MarketsDialog({
  markets,
  onClose,
  onDone,
}: {
  markets: AdminMarket[];
  onClose: () => void;
  onDone: (message: string) => void; // called after a successful save/delete (the page then refreshes)
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    markets.map((m) => ({
      key: m.id,
      id: m.id,
      code: m.code,
      name: m.name,
      currency: m.currency,
      symbol: m.symbol,
      active: m.active,
      displayOrder: String(m.displayOrder),
      shippingStandard: m.shippingStandard,
      shippingExpress: m.shippingExpress,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const add = () =>
    setRows((rs) => [
      ...rs,
      { key: `new-${Date.now()}`, code: "", name: "", currency: "", symbol: "$", active: true, displayOrder: String(rs.length), shippingStandard: "12", shippingExpress: "25" },
    ]);

  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await saveMarkets({
        markets: rows.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          currency: r.currency,
          symbol: r.symbol,
          active: r.active,
          displayOrder: Number(r.displayOrder) || 0,
          shippingStandard: num(r.shippingStandard),
          shippingExpress: num(r.shippingExpress),
        })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone("Markets saved.");
      onClose();
    } catch {
      setError("Could not save the markets. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Row) => {
    if (!r.id) {
      setRows((rs) => rs.filter((x) => x.key !== r.key));
      return;
    }
    if (!window.confirm(`Delete the market "${r.name}"? Its product prices and shipping prices are removed. Past orders keep their record.`)) return;
    const res = await deleteMarket(r.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone(`Market ${r.code} deleted.`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-none bg-[#F9F9F7]">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
            Manage markets
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-end gap-3">
          <button onClick={add} className="h-10 px-5 border border-stone-300 text-xs tracking-[0.15em] uppercase hover:border-[#1a1a1a] inline-flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Add market
          </button>
          <button onClick={save} disabled={saving} className={primaryBtn}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save all
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className={`grid grid-cols-2 md:grid-cols-7 gap-3 items-end border p-4 ${r.id ? "border-stone-200" : "border-dashed border-stone-300"}`}>
              <div><label className={mini}>Name</label><input value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} className={cell} /></div>
              <div>
                <label className={mini}>Code</label>
                <input value={r.code} disabled={!!r.id} onChange={(e) => patch(r.key, { code: e.target.value.toUpperCase() })} title={r.id ? "A market's code can't be changed" : undefined} className={`${cell} uppercase`} />
              </div>
              <div><label className={mini}>Currency</label><input value={r.currency} maxLength={3} onChange={(e) => patch(r.key, { currency: e.target.value.toUpperCase() })} className={`${cell} uppercase`} placeholder="USD" /></div>
              <div><label className={mini}>Symbol</label><input value={r.symbol} maxLength={6} onChange={(e) => patch(r.key, { symbol: e.target.value })} className={cell} /></div>
              <div><label className={mini}>Standard ship</label><input type="number" min="0" step="0.01" value={r.shippingStandard} onChange={(e) => patch(r.key, { shippingStandard: e.target.value })} className={cell} placeholder="default" /></div>
              <div><label className={mini}>Express ship</label><input type="number" min="0" step="0.01" value={r.shippingExpress} onChange={(e) => patch(r.key, { shippingExpress: e.target.value })} className={cell} placeholder="default" /></div>
              <div className="flex items-center gap-3 pb-1">
                <label className="flex items-center gap-2 text-xs text-stone-500 cursor-pointer">
                  <input type="checkbox" checked={r.active} onChange={(e) => patch(r.key, { active: e.target.checked })} className="size-4 accent-[#1a1a1a]" />
                  Active
                </label>
                <button onClick={() => remove(r)} className="text-stone-300 hover:text-rose-700" aria-label={`Delete ${r.name || "market"}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-stone-400">
          Shipping prices are in the market&apos;s own currency. Leave one blank and checkout uses its built-in default (12 standard, 25 express).
          A market&apos;s code can&apos;t be changed once it exists, because orders and shoppers&apos; browsers remember it.
        </p>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end">
          <button onClick={onClose} className={ghostBtn}>Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
