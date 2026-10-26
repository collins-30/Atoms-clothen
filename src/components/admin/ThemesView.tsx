"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { NoticeBar, primaryBtn, type Notice } from "@/components/admin/AdminUi";
import ThemeFormDialog from "@/components/admin/ThemeFormDialog";
import { deleteTheme, setThemeOverride, type AdminTheme, type ThemesData } from "@/server/admin-themes";

const SWATCHES = ["colorPrimary", "colorSecondary", "colorBackground", "colorText", "colorButton"] as const;

const schedule = (t: AdminTheme) => {
  if (t.autoActivate && t.startDate && t.endDate) return `${t.startDate} → ${t.endDate} · auto`;
  if (t.autoActivate) return "auto · no dates set";
  return "manual only";
};

export default function ThemesView({ themes, override }: ThemesData) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ theme: AdminTheme | null } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [savingOverride, setSavingOverride] = useState(false);

  const changeOverride = async (value: string) => {
    setSavingOverride(true);
    setNotice(null);
    try {
      const res = await setThemeOverride(value);
      if (!res.ok) setNotice({ tone: "error", text: res.error });
      else {
        setNotice({ tone: "ok", text: value === "auto" ? "Themes follow the schedule." : "Manual theme choice saved." });
        router.refresh();
      }
    } catch {
      setNotice({ tone: "error", text: "Could not save. Please try again." });
    } finally {
      setSavingOverride(false);
    }
  };

  const remove = async (t: AdminTheme) => {
    if (!window.confirm(`Delete theme "${t.name}"?`)) return;
    const res = await deleteTheme(t.id);
    setNotice(res.ok ? { tone: "ok", text: "Theme deleted." } : { tone: "error", text: res.error });
    if (res.ok) router.refresh();
  };

  // If the saved choice points at a theme that no longer exists, show "Automatic".
  const selected = override === "auto" || themes.some((t) => t.slug === override && t.active) ? override : "auto";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <label htmlFor="theme-override" className="text-[10px] tracking-[0.15em] uppercase text-stone-500">Active theme</label>
          <select
            id="theme-override"
            value={selected}
            disabled={savingOverride}
            onChange={(e) => changeOverride(e.target.value)}
            className="h-10 w-60 px-3 text-sm bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a] disabled:opacity-60"
          >
            <option value="auto">Automatic (by schedule)</option>
            {themes.filter((t) => t.active).map((t) => <option key={t.id} value={t.slug}>{t.name}</option>)}
          </select>
          {savingOverride && <Loader2 className="w-4 h-4 animate-spin text-stone-400" />}
        </div>
        <button onClick={() => setEditor({ theme: null })} className={primaryBtn}>
          <Plus className="w-4 h-4" /> New theme
        </button>
      </div>
      {notice && <div className="mb-4"><NoticeBar notice={notice} /></div>}

      {themes.length === 0 ? (
        <p className="text-sm text-stone-400 border border-stone-200 py-16 text-center">No themes yet. The store uses its built-in look.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((t) => (
            <div key={t.id} className={`border p-4 ${selected === t.slug ? "border-[#1a1a1a]" : "border-stone-200"}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#1a1a1a] truncate">{t.name}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setEditor({ theme: t })} className="text-xs text-stone-500 hover:text-[#1a1a1a] inline-flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  {t.slug !== "default" && (
                    <button onClick={() => remove(t)} className="text-stone-300 hover:text-rose-700" aria-label={`Delete ${t.name}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                {SWATCHES.map((k) => (
                  <span key={k} className="w-7 h-7 border border-stone-200" style={{ background: t[k] || "#fff" }} />
                ))}
              </div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400">
                {schedule(t)} · {t.active ? "active" : "inactive"}
              </p>
              {selected === t.slug && <p className="text-[10px] tracking-[0.15em] uppercase text-[#1a1a1a] mt-1">In use (manual choice)</p>}
            </div>
          ))}
        </div>
      )}

      {editor && (
        <ThemeFormDialog
          key={editor.theme?.id ?? "new"}
          theme={editor.theme}
          onClose={() => setEditor(null)}
          onSaved={(text) => {
            setNotice({ tone: "ok", text });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
