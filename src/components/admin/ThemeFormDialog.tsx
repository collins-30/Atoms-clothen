"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ghostBtn, inputCls, labelCls, primaryBtn } from "@/components/admin/AdminUi";
import { saveTheme, type AdminTheme } from "@/server/admin-themes";

const COLORS = [
  ["colorPrimary", "Primary"],
  ["colorSecondary", "Secondary"],
  ["colorBackground", "Background"],
  ["colorText", "Text"],
  ["colorButton", "Button"],
] as const;
const DECORATIONS = ["snow", "hearts", "sparkles", "confetti"] as const;
const HEX6 = /^#[0-9a-fA-F]{6}$/;

// The same look as your default theme. Used for a new theme and for any colour a theme left empty.
const DEFAULTS = { colorPrimary: "#1A1A1A", colorSecondary: "#F0EFEB", colorBackground: "#F9F9F7", colorText: "#1A1A1A", colorButton: "#1A1A1A" };

type Form = Omit<AdminTheme, "id" | "slug" | "displayOrder"> & { displayOrder: string };

export default function ThemeFormDialog({
  theme,
  onClose,
  onSaved,
}: {
  theme: AdminTheme | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = !!theme;
  const [form, setForm] = useState<Form>(() => ({
    name: theme?.name ?? "",
    active: theme?.active ?? true,
    autoActivate: theme?.autoActivate ?? false,
    startDate: theme?.startDate ?? "",
    endDate: theme?.endDate ?? "",
    colorPrimary: theme?.colorPrimary || DEFAULTS.colorPrimary,
    colorSecondary: theme?.colorSecondary || DEFAULTS.colorSecondary,
    colorBackground: theme?.colorBackground || DEFAULTS.colorBackground,
    colorText: theme?.colorText || DEFAULTS.colorText,
    colorButton: theme?.colorButton || DEFAULTS.colorButton,
    headerStyle: theme?.headerStyle ?? "DEFAULT",
    announcementEnabled: theme?.announcementEnabled ?? false,
    announcementText: theme?.announcementText ?? "",
    bannerImage: theme?.bannerImage ?? "",
    bannerHeading: theme?.bannerHeading ?? "",
    bannerSubheading: theme?.bannerSubheading ?? "",
    bannerLink: theme?.bannerLink ?? "",
    decorations: theme?.decorations ?? [],
    displayOrder: String(theme?.displayOrder ?? 0),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleDecor = (d: string) =>
    set("decorations", form.decorations.includes(d) ? form.decorations.filter((x) => x !== d) : [...form.decorations, d]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await saveTheme({
        id: theme?.id,
        ...form,
        displayOrder: Number(form.displayOrder) || 0,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved(isEdit ? "Theme updated." : "Theme created.");
      onClose();
    } catch {
      setError("Could not save the theme. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-none bg-[#F9F9F7]">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
            {isEdit ? `Edit theme — ${theme.name}` : "New theme"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="t-name" className={labelCls}>Name *</label>
            <input id="t-name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </div>

          <div>
            <p className={labelCls}>Colors</p>
            <div className="grid grid-cols-2 gap-3">
              {COLORS.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={HEX6.test(form[key]) ? form[key] : "#000000"}
                    onChange={(e) => set(key, e.target.value.toUpperCase())}
                    aria-label={`${label} color`}
                    className="w-9 h-9 border border-stone-300 bg-transparent cursor-pointer shrink-0"
                  />
                  <input
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value.toUpperCase())}
                    aria-label={`${label} hex`}
                    maxLength={7}
                    className={`${inputCls} h-9 font-mono text-xs`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-header" className={labelCls}>Header style</label>
              <select id="t-header" value={form.headerStyle} onChange={(e) => set("headerStyle", e.target.value as Form["headerStyle"])} className={inputCls}>
                <option value="DEFAULT">Default</option>
                <option value="TINTED">Tinted</option>
                <option value="BORDERED">Bordered (primary line)</option>
              </select>
            </div>
            <div>
              <label htmlFor="t-order" className={labelCls}>Display order</label>
              <input id="t-order" type="number" min="0" value={form.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <p className={labelCls}>Schedule (MM-DD, repeats every year)</p>
            <div className="grid grid-cols-2 gap-4">
              <input value={form.startDate} onChange={(e) => set("startDate", e.target.value)} placeholder="12-01" maxLength={5} aria-label="Start date" className={inputCls} />
              <input value={form.endDate} onChange={(e) => set("endDate", e.target.value)} placeholder="12-31" maxLength={5} aria-label="End date" className={inputCls} />
            </div>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                <input type="checkbox" checked={form.autoActivate} onChange={(e) => set("autoActivate", e.target.checked)} className="size-4 accent-[#1a1a1a]" />
                Automatic activation
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[#1a1a1a]" />
                Active
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="checkbox" checked={form.announcementEnabled} onChange={(e) => set("announcementEnabled", e.target.checked)} className="size-4 accent-[#1a1a1a]" />
              Custom announcement bar
            </label>
            {form.announcementEnabled && (
              <input value={form.announcementText} onChange={(e) => set("announcementText", e.target.value)} placeholder="Announcement text" aria-label="Announcement text" className={inputCls} />
            )}
          </div>

          <div className="space-y-2">
            <p className={labelCls}>Seasonal banner (optional)</p>
            <input value={form.bannerImage} onChange={(e) => set("bannerImage", e.target.value)} placeholder="Banner image link or /path" aria-label="Banner image" className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.bannerHeading} onChange={(e) => set("bannerHeading", e.target.value)} placeholder="Heading" aria-label="Banner heading" className={inputCls} />
              <input value={form.bannerSubheading} onChange={(e) => set("bannerSubheading", e.target.value)} placeholder="Subheading" aria-label="Banner subheading" className={inputCls} />
            </div>
            <input value={form.bannerLink} onChange={(e) => set("bannerLink", e.target.value)} placeholder="Banner link, e.g. /shop?collection=holiday" aria-label="Banner link" className={inputCls} />
          </div>

          <div>
            <p className={labelCls}>Decorative elements</p>
            <div className="flex flex-wrap gap-2">
              {DECORATIONS.map((d) => {
                const on = form.decorations.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDecor(d)}
                    className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                      on ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#F9F9F7]" : "border-stone-200 text-stone-500 hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className={ghostBtn}>Cancel</button>
            <button onClick={save} disabled={saving} className={primaryBtn}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
