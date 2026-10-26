"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ghostBtn, inputCls, labelCls, NoticeBar, primaryBtn, type Notice } from "@/components/admin/AdminUi";
import { deleteBanner, saveBanner, setBannerActive, type AdminBanner } from "@/server/admin-banners";

type Draft = Omit<AdminBanner, "id" | "displayOrder"> & { id?: string; displayOrder: string };
const EMPTY: Draft = { type: "PROMO", title: "", subtitle: "", image: "", buttonText: "", link: "", active: true, displayOrder: "0" };

export default function BannersView({ banners }: { banners: AdminBanner[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [formError, setFormError] = useState("");

  const open = (b?: AdminBanner) => {
    setFormError("");
    setDraft(b ? { ...b, displayOrder: String(b.displayOrder) } : { ...EMPTY });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await saveBanner({ ...draft, displayOrder: Number(draft.displayOrder) || 0 });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setNotice({ tone: "ok", text: draft.id ? "Banner updated." : "Banner created." });
      setDraft(null);
      router.refresh();
    } catch {
      setFormError("Could not save the banner. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (b: AdminBanner) => {
    const res = await setBannerActive(b.id, !b.active);
    if (!res.ok) setNotice({ tone: "error", text: res.error });
    else router.refresh();
  };

  const remove = async (b: AdminBanner) => {
    if (!window.confirm(`Delete banner "${b.title}"?`)) return;
    const res = await deleteBanner(b.id);
    setNotice(res.ok ? { tone: "ok", text: "Banner deleted." } : { tone: "error", text: res.error });
    if (res.ok) router.refresh();
  };

  const row = (b: AdminBanner) => (
    <div key={b.id} className="flex flex-wrap items-center gap-4 py-4">
      <div className="w-16 h-12 bg-stone-100 overflow-hidden shrink-0">
        {b.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-[160px]">
        <p className="text-sm font-medium text-[#1a1a1a]">{b.title}</p>
        {b.subtitle && <p className="text-xs text-stone-500">{b.subtitle}</p>}
        {b.link && <p className="text-xs text-stone-400 font-mono">{b.link}</p>}
      </div>
      <button onClick={() => toggle(b)} className={`text-[10px] tracking-[0.15em] uppercase hover:underline w-20 ${b.active ? "text-emerald-800" : "text-stone-400"}`}>
        {b.active ? "● Live" : "○ Off"}
      </button>
      <span className="text-xs text-stone-400 w-8 text-right">#{b.displayOrder}</span>
      <div className="flex items-center gap-4">
        <button onClick={() => open(b)} className="text-xs text-stone-500 hover:text-[#1a1a1a] inline-flex items-center gap-1">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button onClick={() => remove(b)} className="text-stone-300 hover:text-rose-700" aria-label={`Delete ${b.title}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-xs text-stone-500">Hero and promotional banners shown on the homepage.</p>
        <button onClick={() => open()} className={primaryBtn}>
          <Plus className="w-4 h-4" /> New banner
        </button>
      </div>
      {notice && <div className="mb-4"><NoticeBar notice={notice} /></div>}

      {banners.length === 0 && <p className="text-sm text-stone-400 border border-stone-200 py-16 text-center">No banners yet.</p>}
      {(["HERO", "PROMO"] as const).map((t) => {
        const group = banners.filter((b) => b.type === t);
        if (group.length === 0) return null;
        return (
          <div key={t} className="mb-8">
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-2">{t === "HERO" ? "Hero (main banner)" : "Promotional banners"}</p>
            <div className="divide-y divide-stone-200 border-y border-stone-200">{group.map(row)}</div>
          </div>
        );
      })}

      <Dialog open={!!draft} onOpenChange={(o) => { if (!o) setDraft(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-none bg-[#F9F9F7]">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
                  {draft.id ? "Edit banner" : "New banner"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="b-type" className={labelCls}>Type</label>
                    <select id="b-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })} className={inputCls}>
                      <option value="HERO">Hero (main banner)</option>
                      <option value="PROMO">Promotional banner</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="b-order" className={labelCls}>Display order</label>
                    <input id="b-order" type="number" min="0" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label htmlFor="b-title" className={labelCls}>Title *</label>
                  <input id="b-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} placeholder="Form, in its purest state." />
                </div>
                <div>
                  <label htmlFor="b-sub" className={labelCls}>Subtitle</label>
                  <input id="b-sub" value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} className={inputCls} placeholder="Autumn / Winter 2026" />
                </div>
                <div>
                  <label htmlFor="b-img" className={labelCls}>Image (link or a path like /banners/hero.jpg)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-14 bg-stone-100 overflow-hidden shrink-0">
                      {draft.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <input id="b-img" value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} className={inputCls} />
                  </div>
                  <p className="text-xs text-stone-400 mt-1.5">Uploading files will come with image storage.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="b-btn" className={labelCls}>Button text</label>
                    <input id="b-btn" value={draft.buttonText} onChange={(e) => setDraft({ ...draft, buttonText: e.target.value })} className={inputCls} placeholder="Shop the collection" />
                  </div>
                  <div>
                    <label htmlFor="b-link" className={labelCls}>Link</label>
                    <input id="b-link" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} className={`${inputCls} font-mono`} placeholder="/shop" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                  <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="size-4 accent-[#1a1a1a]" />
                  Live on homepage
                </label>
                {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
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
