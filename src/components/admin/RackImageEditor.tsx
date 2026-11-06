"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Loader2, Shirt } from "lucide-react";
import { labelCls, primaryBtn } from "@/components/admin/AdminUi";
import HungGarment from "@/components/storefront/rail/HungGarment";
import { cutoutFile, loadImage, makeCutout, suggestTolerance, type Cutout } from "@/components/admin/cutout";
import { IMAGE_TYPES, uploadImageFile } from "@/components/admin/r2-upload";
import { DEFAULT_HANG, type Hang } from "@/lib/media";
import type { AdminMedia } from "@/server/admin-products";

type Side = "FRONT" | "BACK";

/** A new upload being prepared, or an existing rail image whose hanger is being adjusted. */
type Draft =
  | {
      mode: "new";
      side: Side;
      img: HTMLImageElement;
      name: string;
      cut: Cutout;
      preview: string;
      tolerance: number;
      enclosed: boolean;
      shadow: boolean;
      hang: Hang;
      dark: boolean;
    }
  | { mode: "adjust"; side: Side; item: AdminMedia; hang: Hang; dark: boolean };

const btn =
  "inline-flex items-center gap-2 h-9 px-4 border border-stone-300 text-[10px] tracking-[0.15em] uppercase transition-colors hover:border-foreground focus-within:border-foreground cursor-pointer";

/** How a cut-out will hang: on the rail's wall, from its fitted hanger. */
function OnRail({
  src,
  aspect,
  hang,
  className = "",
  dark = false,
  width = "62%",
}: {
  src: string | null;
  aspect: number;
  hang: Hang | null;
  className?: string;
  dark?: boolean;
  width?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${dark ? "bg-stone-800" : "rail-wall"} ${className}`}>
      <span className="rail-pole absolute left-0 right-0" style={{ top: 12, height: 5 }} aria-hidden="true" />
      {src ? (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 12, width }}>
          <HungGarment src={src} aspect={aspect} hang={hang} plain />
        </div>
      ) : (
        <Shirt className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-stone-300" aria-hidden="true" />
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs text-stone-600">
      {label}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="block w-full accent-primary mt-1" />
    </label>
  );
}

/**
 * "Clothing rail" section of the product form. Upload a garment photo on a
 * plain white / light background: the background is removed here in the
 * browser, edges are cleaned, the result is trimmed and the hanger is fitted
 * to the neckline and shoulders. Everything is previewed on the rail (and on
 * dark, to check white garments) before saving. The hanger can be nudged by
 * hand, now or later ("Adjust hanger").
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

  const render = (img: HTMLImageElement, tolerance: number, enclosed: boolean, shadow: boolean) => {
    const cut = makeCutout(img, { tolerance, clearEnclosed: enclosed, removeShadow: shadow });
    return { cut, preview: cut.canvas.toDataURL("image/png"), hang: cut.hang };
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
      const r = render(img, tolerance, false, false);
      setDraft({ mode: "new", side, img, name: file.name.replace(/\.[^.]+$/, "") || "garment", ...r, tolerance, enclosed: false, shadow: false, dark: false });
    } catch {
      setError("Couldn't read that image. Try a JPG or PNG.");
    } finally {
      setBusy("");
    }
  };

  // Re-run the background removal (and re-fit the hanger) shortly after a setting changes.
  const adjustCut = (patch: Partial<{ tolerance: number; enclosed: boolean; shadow: boolean }>) => {
    setDraft((d) => (d && d.mode === "new" ? { ...d, ...patch } : d));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDraft((d) => (d && d.mode === "new" ? { ...d, ...render(d.img, d.tolerance, d.enclosed, d.shadow) } : d));
    }, 150);
  };

  const setHang = (patch: Partial<Hang>) => setDraft((d) => (d ? { ...d, hang: { ...d.hang, ...patch } } : d));

  const autoHang = () =>
    setDraft((d) => (d ? { ...d, hang: d.mode === "new" ? d.cut.hang : (d.item.hang ?? DEFAULT_HANG) } : d));

  const save = async () => {
    if (!draft) return;
    setError("");
    if (draft.mode === "adjust") {
      onChange(draft.side, { ...draft.item, hang: draft.hang });
      setDraft(null);
      return;
    }
    setBusy("Saving the rail image…");
    try {
      const file = await cutoutFile(draft.cut, draft.name);
      const res = await uploadImageFile(file);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onChange(draft.side, {
        kind: "IMAGE",
        url: res.url,
        posterUrl: null,
        alt: null,
        night: false,
        rack: draft.side,
        aspect: Number(draft.cut.aspect.toFixed(4)),
        hang: { x: +draft.hang.x.toFixed(4), y: +draft.hang.y.toFixed(4), w: +draft.hang.w.toFixed(4) },
      });
      setDraft(null);
    } catch {
      setError("Couldn't save the image. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const slot = (side: Side, item: AdminMedia | null) => (
    <div className="w-36">
      <OnRail src={item?.url ?? null} aspect={item?.aspect ?? 1.3} hang={item?.hang ?? null} className="w-36 h-44 border border-stone-200" />
      <p className="mt-1.5 text-[10px] tracking-[0.15em] uppercase text-stone-500">{side === "FRONT" ? "Front" : "Back (optional)"}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label className={btn}>
          {item ? "Replace" : "Upload"}
          <input type="file" accept={IMAGE_TYPES.join(",")} onChange={pick(side)} disabled={!!busy} className="sr-only" />
        </label>
        {item && (
          <>
            <button
              type="button"
              onClick={() => setDraft({ mode: "adjust", side, item, hang: item.hang ?? DEFAULT_HANG, dark: false })}
              className="text-[10px] uppercase tracking-[0.1em] text-stone-600 hover:text-foreground underline underline-offset-2"
            >
              Adjust hanger
            </button>
            <button type="button" onClick={() => onChange(side, null)} className="text-[10px] uppercase tracking-[0.1em] text-stone-500 hover:text-rose-700">
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );

  const previewSrc = draft ? (draft.mode === "new" ? draft.preview : draft.item.url) : null;
  const previewAspect = draft ? (draft.mode === "new" ? draft.cut.aspect : (draft.item.aspect ?? 1.3)) : 1.3;

  return (
    <fieldset className="border border-stone-200 p-4 space-y-3">
      <legend className={`${labelCls} px-1 mb-0`}>Clothing rail</legend>
      <p className="text-xs text-stone-500">
        Upload a photo of the garment alone on a plain white or light background (or a transparent PNG). The background is removed and
        the edges cleaned automatically, and the hanger is fitted to the collar and shoulders. Without a rail image the product only shows
        in the grid. Best results: the garment photographed hanging, with no shadow on the wall.
      </p>

      {!draft && (
        <div className="flex flex-wrap gap-6">
          {slot("FRONT", front)}
          {slot("BACK", back)}
        </div>
      )}

      {draft && previewSrc && (
        <div className="flex flex-wrap gap-5 items-start">
          <div>
            <OnRail src={previewSrc} aspect={previewAspect} hang={draft.hang} dark={draft.dark} width="66%" className="w-56 h-72 border border-stone-200" />
            <label className="mt-1.5 flex items-center gap-2 text-[11px] text-stone-600 cursor-pointer">
              <input type="checkbox" checked={draft.dark} onChange={(e) => setDraft({ ...draft, dark: e.target.checked })} className="size-3.5 accent-primary" />
              Check on a dark background
            </label>
          </div>
          <div className="flex-1 min-w-[220px] space-y-4">
            <p className="text-sm text-foreground">
              {draft.side === "FRONT" ? "Front" : "Back"} {draft.mode === "new" ? "preview" : "· adjust hanger"}
            </p>

            {draft.mode === "new" &&
              (draft.cut.hadTransparency ? (
                <p className="text-xs text-stone-500">This image is already a cut-out, so it was only cleaned up and trimmed.</p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs text-stone-600">
                    Background removal: <span className="font-mono">{draft.tolerance}</span>
                    <input
                      type="range"
                      min={4}
                      max={60}
                      value={draft.tolerance}
                      onChange={(e) => adjustCut({ tolerance: Number(e.target.value) })}
                      className="block w-full accent-primary mt-1"
                    />
                    <span className="text-stone-400">
                      Raise it if background is left around the garment; lower it if parts of the garment disappear. For white or very pale
                      garments, tick &ldquo;Check on a dark background&rdquo;.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-xs text-stone-600 cursor-pointer">
                    <input type="checkbox" checked={draft.shadow} onChange={(e) => adjustCut({ shadow: e.target.checked })} className="size-4 accent-primary mt-px" />
                    <span>Remove soft shadows on the background. Leave off for grey or white garments if it eats into them.</span>
                  </label>
                  <label className="flex items-start gap-2 text-xs text-stone-600 cursor-pointer">
                    <input type="checkbox" checked={draft.enclosed} onChange={(e) => adjustCut({ enclosed: e.target.checked })} className="size-4 accent-primary mt-px" />
                    <span>Also clear background showing through gaps (e.g. between a sleeve and the body). Leave off for white garments.</span>
                  </label>
                </div>
              ))}

            <div className="space-y-2 border-t border-stone-200 pt-3">
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-500">Hanger</p>
              <Slider label="Left / right" value={draft.hang.x} min={0.2} max={0.8} step={0.005} onChange={(x) => setHang({ x })} />
              <Slider label="Up / down (where the bar sits in the shoulders)" value={draft.hang.y} min={0.02} max={0.6} step={0.005} onChange={(y) => setHang({ y })} />
              <Slider label="Hanger size" value={draft.hang.w} min={0.25} max={0.9} step={0.005} onChange={(w) => setHang({ w })} />
              <button type="button" onClick={autoHang} className="text-[10px] uppercase tracking-[0.1em] text-stone-600 hover:text-foreground underline underline-offset-2">
                Reset to automatic fit
              </button>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={save} disabled={!!busy} className={primaryBtn}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} {draft.mode === "new" ? "Save to rail" : "Done"}
              </button>
              <button type="button" onClick={() => setDraft(null)} className="h-10 px-4 text-xs tracking-[0.15em] uppercase text-stone-600 hover:text-foreground">
                Cancel
              </button>
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
