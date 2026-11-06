"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Loader2, Shirt } from "lucide-react";
import { labelCls, primaryBtn } from "@/components/admin/AdminUi";
import Hanger from "@/components/storefront/rail/Hanger";
import { cutoutFile, loadImage, makeCutout, suggestTolerance, type Cutout } from "@/components/admin/cutout";
import { IMAGE_TYPES, uploadImageFile } from "@/components/admin/r2-upload";
import type { AdminMedia } from "@/server/admin-products";

type Side = "FRONT" | "BACK";
type Draft = { side: Side; img: HTMLImageElement; name: string; cut: Cutout; preview: string; tolerance: number; enclosed: boolean; dark: boolean };

const btn =
  "inline-flex items-center gap-2 h-9 px-4 border border-stone-300 text-[10px] tracking-[0.15em] uppercase transition-colors hover:border-foreground focus-within:border-foreground cursor-pointer";

/** How a cut-out will hang: on the rail's wall, from the shared hanger. */
function OnRail({ src, className = "", dark = false }: { src: string | null; className?: string; dark?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${dark ? "bg-stone-800" : "rail-wall"} ${className}`}>
      <span className="rail-pole absolute left-0 right-0" style={{ top: 12, height: 5 }} aria-hidden="true" />
      {src ? (
        <div className="absolute left-1/2 -translate-x-1/2 w-[62%]" style={{ top: 12 }}>
          <Hanger className="relative mx-auto block" style={{ width: "62%" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="rail-cutout block w-full h-auto" style={{ marginTop: "-16.5%" }} />
        </div>
      ) : (
        <Shirt className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-stone-300" aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * "Clothing rail" section of the product form. Upload a garment photo on a
 * plain white / light background: the background is removed here in the
 * browser, the result is trimmed to the garment and previewed on the rail
 * before it's saved. A back view is optional (Front / Back in the closer look).
 */
export default function RackImageEditor({
  front,
  back,
  onChange,
}: {
  front: AdminMedia | null;
  back: AdminMedia | null;
  onChange: (side: Side, item: AdminMedia | null) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const render = (img: HTMLImageElement, tolerance: number, enclosed: boolean) => {
    const cut = makeCutout(img, { tolerance, clearEnclosed: enclosed });
    return { cut, preview: cut.canvas.toDataURL("image/png") };
  };

  const pick = (side: Side) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, WebP or AVIF image.");
      return;
    }
    setBusy("Removing the background…");
    try {
      const img = await loadImage(file);
      const tolerance = suggestTolerance(img);
      const { cut, preview } = render(img, tolerance, false);
      setDraft({ side, img, name: file.name.replace(/\.[^.]+$/, "") || "garment", cut, preview, tolerance, enclosed: false, dark: false });
    } catch {
      setError("Couldn't read that image. Try a JPG or PNG.");
    } finally {
      setBusy("");
    }
  };

  // Re-run the background removal shortly after the slider / tick box changes.
  const adjust = (patch: Partial<Pick<Draft, "tolerance" | "enclosed">>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDraft((d) => (d ? { ...d, ...render(d.img, d.tolerance, d.enclosed) } : d));
    }, 150);
  };

  const save = async () => {
    if (!draft) return;
    setError("");
    setBusy("Saving the rail image…");
    try {
      const file = await cutoutFile(draft.cut, draft.name);
      const res = await uploadImageFile(file);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onChange(draft.side, { kind: "IMAGE", url: res.url, posterUrl: null, alt: null, night: false, rack: draft.side, aspect: Number(draft.cut.aspect.toFixed(4)) });
      setDraft(null);
    } catch {
      setError("Couldn't save the image. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const slot = (side: Side, item: AdminMedia | null) => (
    <div className="w-36">
      <OnRail src={item?.url ?? null} className="w-36 h-44 border border-stone-200" />
      <p className="mt-1.5 text-[10px] tracking-[0.15em] uppercase text-stone-500">{side === "FRONT" ? "Front" : "Back (optional)"}</p>
      <div className="mt-1.5 flex items-center gap-3">
        <label className={btn}>
          {item ? "Replace" : "Upload"}
          <input type="file" accept={IMAGE_TYPES.join(",")} onChange={pick(side)} disabled={!!busy} className="sr-only" />
        </label>
        {item && (
          <button type="button" onClick={() => onChange(side, null)} className="text-[10px] uppercase tracking-[0.1em] text-stone-500 hover:text-rose-700">
            Remove
          </button>
        )}
      </div>
    </div>
  );

  return (
    <fieldset className="border border-stone-200 p-4 space-y-3">
      <legend className={`${labelCls} px-1 mb-0`}>Clothing rail</legend>
      <p className="text-xs text-stone-500">
        Upload a photo of the garment alone on a plain white or light background (or a transparent PNG). The background is removed
        automatically and the garment hangs on the rail on the home and shop pages. Without a rail image the product only shows in the grid.
      </p>

      {!draft && (
        <div className="flex flex-wrap gap-6">
          {slot("FRONT", front)}
          {slot("BACK", back)}
        </div>
      )}

      {draft && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 items-start">
            <div>
              <OnRail src={draft.preview} dark={draft.dark} className="w-48 h-60 border border-stone-200" />
              <label className="mt-1.5 flex items-center gap-2 text-[11px] text-stone-600 cursor-pointer">
                <input type="checkbox" checked={draft.dark} onChange={(e) => setDraft({ ...draft, dark: e.target.checked })} className="size-3.5 accent-primary" />
                Check on a dark background
              </label>
            </div>
            <div className="flex-1 min-w-[200px] space-y-3">
              <p className="text-sm text-foreground">{draft.side === "FRONT" ? "Front" : "Back"} preview</p>
              {draft.cut.hadTransparency ? (
                <p className="text-xs text-stone-500">This image is already a cut-out, so it was only trimmed.</p>
              ) : (
                <>
                  <label className="block text-xs text-stone-600">
                    Background removal: <span className="font-mono">{draft.tolerance}</span>
                    <input
                      type="range"
                      min={4}
                      max={60}
                      value={draft.tolerance}
                      onChange={(e) => adjust({ tolerance: Number(e.target.value) })}
                      className="block w-full accent-primary mt-1"
                    />
                    <span className="text-stone-400">
                      Raise it if background is left around the garment; lower it if parts of the garment disappear. For white or very
                      pale garments, tick &ldquo;Check on a dark background&rdquo; to make sure none of it was removed.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-xs text-stone-600 cursor-pointer">
                    <input type="checkbox" checked={draft.enclosed} onChange={(e) => adjust({ enclosed: e.target.checked })} className="size-4 accent-primary mt-px" />
                    <span>Also clear background showing through gaps (e.g. between a sleeve and the body). Leave off for white garments.</span>
                  </label>
                </>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={save} disabled={!!busy} className={primaryBtn}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save to rail
                </button>
                <button type="button" onClick={() => setDraft(null)} className="h-10 px-4 text-xs tracking-[0.15em] uppercase text-stone-600 hover:text-foreground">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {busy && !draft && (
        <p role="status" className="text-xs text-stone-600 inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy}
        </p>
      )}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </fieldset>
  );
}
