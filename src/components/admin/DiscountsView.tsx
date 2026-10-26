"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ghostBtn, inputCls, labelCls, NoticeBar, primaryBtn, type Notice } from "@/components/admin/AdminUi";
import { fmtMoney } from "@/lib/admin-format";
import { deleteDiscount, saveDiscount, setDiscountActive, type AdminDiscount } from "@/server/admin-discounts";

type Draft = {
  id?: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minOrder: string;
  startDate: string;
  endDate: string;
  active: boolean;
};
const EMPTY: Draft = { code: "", type: "PERCENT", value: "", minOrder: "", startDate: "", endDate: "", active: true };

const STATE_STYLE: Record<AdminDiscount["state"], string> = {
  live: "text-emerald-800",
  off: "text-stone-400",
  scheduled: "text-sky-800",
  expired: "text-rose-800",
};
const STATE_LABEL: Record<AdminDiscount["state"], string> = { live: "● Live", off: "○ Off", scheduled: "◐ Scheduled", expired: "● Expired" };

export default function DiscountsView({ discounts }: { discounts: AdminDiscount[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [formError, setFormError] = useState("");

  const open = (d?: AdminDiscount) => {
    setFormError("");
    setDraft(
      d
        ? { id: d.id, code: d.code, type: d.type, value: String(d.value), minOrder: d.minOrder ? String(d.minOrder) : "", startDate: d.startDate, endDate: d.endDate, active: d.active }
        : { ...EMPTY },
    );
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.code.trim() || draft.value === "") {
      setFormError("Code and value are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await saveDiscount({
        id: draft.id,
        code: draft.code,
        type: draft.type,
        value: Number(draft.value),
        minOrder: Number(draft.minOrder) || 0,
        startDate: draft.startDate,
        endDate: draft.endDate,
        active: draft.active,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setNotice({ tone: "ok", text: draft.id ? "Discount updated." : "Discount created." });
      setDraft(null);
      router.refresh();
    } catch {
      setFormError("Could not save the discount. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (d: AdminDiscount) => {
    const res = await setDiscountActive(d.id, !d.active);
    if (!res.ok) setNotice({ tone: "error", text: res.error });
    else router.refresh();
  };

  const remove = async (d: AdminDiscount) => {
    if (!window.confirm(`Delete discount code "${d.code}"?`)) return;
    const res = await deleteDiscount(d.id);
    setNotice(res.ok ? { tone: "ok", text: "Discount deleted." } : { tone: "error", text: res.error });
    if (res.ok) router.refresh();
  };

  const amount = (d: AdminDiscount) => (d.type === "PERCENT" ? `${d.value}%` : fmtMoney(d.value));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-xs text-stone-500">Codes are entered by customers at checkout.</p>
        <button onClick={() => open()} className={primaryBtn}>
          <Plus className="w-4 h-4" /> New discount
        </button>
      </div>
      {notice && <div className="mb-4"><NoticeBar notice={notice} /></div>}

      {discounts.length === 0 ? (
        <div className="border border-stone-200 py-16 text-center">
          <Ticket className="w-6 h-6 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-400">No discount codes yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {discounts.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-4 py-4">
              <span className="font-mono text-sm text-[#1a1a1a] w-32">{d.code}</span>
              <span className="text-sm text-stone-600 w-28">
                {amount(d)}
                <span className="text-xs text-stone-400"> off</span>
              </span>
              <span className="text-xs text-stone-500 w-28">Min {fmtMoney(d.minOrder)}</span>
              <span className="text-xs text-stone-500 w-52">{d.startLabel} → {d.endLabel}</span>
              <button onClick={() => toggle(d)} className={`text-[10px] tracking-[0.15em] uppercase hover:underline ${STATE_STYLE[d.state]}`}>
                {STATE_LABEL[d.state]}
              </button>
              <div className="flex items-center gap-4 ml-auto">
                <button onClick={() => open(d)} className="text-xs text-stone-500 hover:text-[#1a1a1a] inline-flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => remove(d)} className="text-stone-300 hover:text-rose-700" aria-label={`Delete ${d.code}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => { if (!o) setDraft(null); }}>
        <DialogContent className="sm:max-w-md rounded-none bg-[#F9F9F7]">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
                  {draft.id ? "Edit discount" : "New discount"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="d-code" className={labelCls}>Code *</label>
                    <input id="d-code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} className={`${inputCls} font-mono uppercase`} placeholder="SUMMER20" />
                  </div>
                  <div>
                    <label htmlFor="d-type" className={labelCls}>Type</label>
                    <select id="d-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })} className={inputCls}>
                      <option value="PERCENT">Percentage (%)</option>
                      <option value="FIXED">Fixed amount</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="d-value" className={labelCls}>{draft.type === "PERCENT" ? "Percent off *" : "Amount off *"}</label>
                    <input id="d-value" type="number" min="0" step="0.01" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="d-min" className={labelCls}>Minimum order</label>
                    <input id="d-min" type="number" min="0" step="0.01" value={draft.minOrder} onChange={(e) => setDraft({ ...draft, minOrder: e.target.value })} className={inputCls} />
                  </div>
                </div>
                {draft.type === "FIXED" && (
                  <p className="text-xs text-stone-400 -mt-2">Fixed amounts and the minimum order are in the customer&apos;s own currency, so 10 means 10 in every market.</p>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="d-start" className={labelCls}>Start date</label>
                    <input id="d-start" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="d-end" className={labelCls}>End date (included)</label>
                    <input id="d-end" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                  <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="size-4 accent-[#1a1a1a]" />
                  Active
                </label>
                {formError && <p className="text-sm text-rose-700">{formError}</p>}
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setDraft(null)} className={ghostBtn}>Cancel</button>
                  <button onClick={save} disabled={saving} className={primaryBtn}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
