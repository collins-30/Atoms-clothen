"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Gender } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ghostBtn, inputCls, labelCls, NoticeBar, primaryBtn, type Notice } from "@/components/admin/AdminUi";
import { deleteCategory, saveCategory, type AdminCategory } from "@/server/admin-categories";

type Draft = { id?: string; name: string; slug: string; gender: Gender; parentId: string; displayOrder: string; active: boolean };
const EMPTY: Draft = { name: "", slug: "", gender: "WOMEN", parentId: "", displayOrder: "0", active: true };
const GENDERS: Gender[] = ["WOMEN", "MEN", "UNISEX"];

export default function CategoriesView({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [formError, setFormError] = useState("");

  const open = (c?: AdminCategory) => {
    setFormError("");
    setDraft(
      c
        ? { id: c.id, name: c.name, slug: c.slug, gender: c.gender, parentId: c.parentId ?? "", displayOrder: String(c.displayOrder), active: c.active }
        : { ...EMPTY },
    );
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await saveCategory({
        id: draft.id,
        name: draft.name,
        slug: draft.slug,
        gender: draft.gender,
        parentId: draft.parentId || null,
        displayOrder: Number(draft.displayOrder) || 0,
        active: draft.active,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setNotice({ tone: "ok", text: draft.id ? "Category updated." : "Category created." });
      setDraft(null);
      router.refresh();
    } catch {
      setFormError("Could not save the category. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: AdminCategory) => {
    const extra = c.productCount > 0 ? ` ${c.productCount} product${c.productCount === 1 ? "" : "s"} will be left without a category.` : "";
    if (!window.confirm(`Delete category "${c.name}"?${extra}`)) return;
    const res = await deleteCategory(c.id);
    setNotice(res.ok ? { tone: "ok", text: "Category deleted." } : { tone: "error", text: res.error });
    if (res.ok) router.refresh();
  };

  const row = (c: AdminCategory, child = false) => (
    <div key={c.id} className={`flex flex-wrap items-center gap-4 py-3 ${child ? "pl-8" : ""}`}>
      <span className="text-sm text-[#1a1a1a] flex-1 min-w-[140px]">
        {child && <span className="text-stone-300 mr-2">↳</span>}
        {c.name}
      </span>
      <span className="text-xs text-stone-400 font-mono">{c.slug}</span>
      <span className="text-xs text-stone-400 w-20">{c.productCount} product{c.productCount === 1 ? "" : "s"}</span>
      <span className={`text-[10px] tracking-[0.15em] uppercase w-14 ${c.active ? "text-emerald-800" : "text-stone-400"}`}>
        {c.active ? "Active" : "Hidden"}
      </span>
      <span className="text-xs text-stone-400 w-8 text-right">#{c.displayOrder}</span>
      <div className="flex items-center gap-4">
        <button onClick={() => open(c)} className="text-xs text-stone-500 hover:text-[#1a1a1a] inline-flex items-center gap-1">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button onClick={() => remove(c)} className="text-stone-300 hover:text-rose-700" aria-label={`Delete ${c.name}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const parents = draft ? categories.filter((c) => !c.parentId && c.gender === draft.gender && c.id !== draft.id) : [];

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button onClick={() => open()} className={primaryBtn}>
          <Plus className="w-4 h-4" /> New category
        </button>
      </div>
      {notice && <div className="mb-4"><NoticeBar notice={notice} /></div>}

      {categories.length === 0 && <p className="text-sm text-stone-400 border border-stone-200 py-16 text-center">No categories yet.</p>}

      {GENDERS.map((g) => {
        const group = categories.filter((c) => c.gender === g);
        if (group.length === 0) return null;
        return (
          <div key={g} className="mb-8">
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-2">{g.toLowerCase()}</p>
            <div className="divide-y divide-stone-200 border-y border-stone-200">
              {group
                .filter((c) => !c.parentId)
                .map((c) => (
                  <Fragment key={c.id}>
                    {row(c)}
                    {group.filter((ch) => ch.parentId === c.id).map((ch) => row(ch, true))}
                  </Fragment>
                ))}
              {/* a sub-category whose parent is in another gender group would otherwise vanish */}
              {group.filter((c) => c.parentId && !group.some((p) => p.id === c.parentId)).map((c) => row(c, true))}
            </div>
          </div>
        );
      })}

      <Dialog open={!!draft} onOpenChange={(o) => { if (!o) setDraft(null); }}>
        <DialogContent className="sm:max-w-md rounded-none bg-[#F9F9F7]">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
                  {draft.id ? "Edit category" : "New category"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="cat-name" className={labelCls}>Name *</label>
                  <input id="cat-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cat-slug" className={labelCls}>Slug (auto if blank)</label>
                    <input id="cat-slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="cat-gender" className={labelCls}>Gender</label>
                    <select
                      id="cat-gender"
                      value={draft.gender}
                      onChange={(e) => setDraft({ ...draft, gender: e.target.value as Gender, parentId: "" })}
                      className={inputCls}
                    >
                      {GENDERS.map((g) => <option key={g} value={g}>{g.toLowerCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="cat-parent" className={labelCls}>Parent category</label>
                  <select id="cat-parent" value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })} className={inputCls}>
                    <option value="">None (top level)</option>
                    {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cat-order" className={labelCls}>Display order</label>
                    <input id="cat-order" type="number" min="0" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: e.target.value })} className={inputCls} />
                  </div>
                  <label className="flex items-center gap-2 pt-6 text-sm text-stone-600 cursor-pointer">
                    <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="size-4 accent-[#1a1a1a]" />
                    Active
                  </label>
                </div>
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
