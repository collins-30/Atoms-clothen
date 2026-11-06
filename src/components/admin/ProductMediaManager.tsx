"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, Film, ImagePlus, Loader2, Moon, Plus, Video } from "lucide-react";
import { inputCls, labelCls } from "@/components/admin/AdminUi";
import type { AdminMedia } from "@/server/admin-products";
import { IMAGE_TYPES, VIDEO_TYPES, inspectVideo, uploadImageFile, uploadVideoFile } from "@/components/admin/r2-upload";
import { looksLikeVideo } from "@/lib/media";
import RackImageEditor from "@/components/admin/RackImageEditor";

const btn =
  "inline-flex items-center gap-2 h-10 px-5 border border-stone-300 text-xs tracking-[0.15em] uppercase transition-colors hover:border-foreground focus-within:border-foreground";
const tinyBtn = "h-7 w-7 inline-flex items-center justify-center border border-stone-300 hover:border-foreground disabled:opacity-30 disabled:hover:border-stone-300";

const isLink = (v: string) => (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://");

/**
 * Photos and model videos for one product: upload, reorder, remove, set a
 * video's poster, and choose what the shop card and editorial section show.
 */
export default function ProductMediaManager({
  media,
  onChange,
  cardMedia,
  onCardMedia,
  editorial,
  onEditorial,
}: {
  media: AdminMedia[];
  onChange: (next: AdminMedia[] | ((prev: AdminMedia[]) => AdminMedia[])) => void;
  cardMedia: "IMAGE" | "VIDEO";
  onCardMedia: (v: "IMAGE" | "VIDEO") => void;
  editorial: boolean;
  onEditorial: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const posterFor = useRef<number | null>(null);
  const posterInput = useRef<HTMLInputElement>(null);

  // Night shots don't count: the card and editorial section use daytime media.
  const hasVideo = media.some((m) => m.kind === "VIDEO" && !m.night);
  const hasPhoto = media.some((m) => m.kind === "IMAGE" && !m.night && !m.rack);
  // Rail cut-outs live in their own section below; the gallery list skips them.
  const gallery = media.map((m, i) => ({ m, i })).filter(({ m }) => !m.rack);
  const rackFront = media.find((m) => m.rack === "FRONT") ?? null;
  const rackBack = media.find((m) => m.rack === "BACK") ?? null;

  // Swap with the previous / next gallery item (rail images don't take part).
  const move = (i: number, dir: -1 | 1) =>
    onChange((list) => {
      let j = i + dir;
      while (j >= 0 && j < list.length && list[j].rack) j += dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const setRack = (side: "FRONT" | "BACK", item: AdminMedia | null) =>
    onChange((list) => {
      const rest = list.filter((m) => m.rack !== side);
      return item ? [...rest, item] : rest;
    });

  const remove = (i: number) => {
    const removingLastVideo = media[i]?.kind === "VIDEO" && !media[i]?.night && media.filter((m) => m.kind === "VIDEO" && !m.night).length === 1;
    onChange((list) => list.filter((_, j) => j !== i));
    if (removingLastVideo) {
      onCardMedia("IMAGE");
      onEditorial(false);
    }
  };

  const onPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setError("");
    setNote("");
    try {
      for (const [n, file] of files.entries()) {
        setBusy(`Uploading photo ${n + 1} of ${files.length}…`);
        const res = await uploadImageFile(file);
        if (!res.ok) {
          setError(res.error);
          break;
        }
        onChange((list) => [...list, { kind: "IMAGE", url: res.url, posterUrl: null, alt: null, night: false, rack: null, aspect: null, hang: null }]);
      }
    } finally {
      setBusy("");
    }
  };

  const onVideos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setError("");
    setNote("");
    const notes: string[] = [];
    let hadVideo = hasVideo;
    try {
      for (const file of files) {
        setBusy(`Reading ${file.name}…`);
        const info = await inspectVideo(file);
        if (info && info.duration > 15) {
          notes.push(`${file.name} is ${Math.round(info.duration)} s long. Short loops of 3–8 s load much faster.`);
        }
        if (info && info.width > info.height) {
          notes.push(`${file.name} is landscape. Portrait (3:4 or 9:16) fills the product cards best.`);
        }

        let posterUrl: string | null = null;
        if (info?.poster) {
          setBusy("Saving the poster frame…");
          const poster = await uploadImageFile(info.poster);
          if (poster.ok) posterUrl = poster.url;
        }

        const res = await uploadVideoFile(file, (f) => setBusy(`Uploading ${file.name}… ${Math.round(f * 100)}%`));
        if (!res.ok) {
          setError(res.error);
          break;
        }
        onChange((list) => [...list, { kind: "VIDEO", url: res.url, posterUrl, alt: null, night: false, rack: null, aspect: null, hang: null }]);
        // The first model video becomes the card media automatically; the admin can switch back.
        if (!hadVideo) onCardMedia("VIDEO");
        hadVideo = true;
        if (!posterUrl) notes.push(`Couldn't take a poster frame from ${file.name}. Use "Set poster" to add one.`);
      }
    } finally {
      setBusy("");
      setNote(notes.join(" "));
    }
  };

  const pickPoster = (i: number) => {
    posterFor.current = i;
    posterInput.current?.click();
  };

  const onPoster = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const i = posterFor.current;
    if (!file || i == null) return;
    setError("");
    setBusy("Uploading poster…");
    try {
      const res = await uploadImageFile(file);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onChange((list) => list.map((m, j) => (j === i ? { ...m, posterUrl: res.url } : m)));
    } finally {
      setBusy("");
    }
  };

  const addLink = () => {
    const v = link.trim();
    if (!v) return;
    if (!isLink(v)) {
      setError("Links must start with / (a file in your public folder) or https://");
      return;
    }
    setError("");
    const kind = looksLikeVideo(v) ? "VIDEO" : "IMAGE";
    onChange((list) => [...list, { kind, url: v, posterUrl: null, alt: null, night: false, rack: null, aspect: null, hang: null }]);
    setLink("");
  };

  return (
    <div className="space-y-4">
      <div>
        <p className={labelCls}>Photos &amp; model videos</p>
        <ol className="flex flex-wrap gap-3">
          {gallery.map(({ m, i }, n) => (
            <li key={`${m.url}-${i}`} className="w-24">
              <div className="relative w-24 h-32 border border-stone-200 bg-stone-100 overflow-hidden">
                {m.kind === "VIDEO" ? (
                  <video
                    src={m.url}
                    poster={m.posterUrl ?? undefined}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
                    onMouseLeave={(e) => e.currentTarget.pause()}
                    className="w-full h-full object-cover"
                    aria-label={`Model video ${n + 1}`}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}
                <span className="absolute left-1 top-1 text-[9px] tracking-[0.15em] uppercase bg-background/90 px-1.5 py-0.5">
                  {n + 1} · {m.kind === "VIDEO" ? "Video" : "Photo"}
                </span>
                {m.night && (
                  <span className="absolute right-1 bottom-1 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center" title="Night shot">
                    <Moon className="w-3 h-3" />
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={n === 0} className={tinyBtn} aria-label={`Move item ${n + 1} earlier`}>
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={n === gallery.length - 1} className={tinyBtn} aria-label={`Move item ${n + 1} later`}>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => remove(i)} className="ml-auto text-[10px] uppercase tracking-[0.1em] text-stone-500 hover:text-rose-700">
                  Remove
                </button>
              </div>
              <label className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-stone-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.night}
                  onChange={(e) => {
                    const night = e.target.checked;
                    onChange((list) => list.map((x, j) => (j === i ? { ...x, night } : x)));
                  }}
                  className="size-3.5 accent-primary"
                />
                Night shot
              </label>
              {m.kind === "VIDEO" && (
                <button type="button" onClick={() => pickPoster(i)} className="mt-1 text-[10px] uppercase tracking-[0.1em] text-stone-500 hover:text-foreground underline underline-offset-2">
                  {m.posterUrl ? "Change poster" : "Set poster"}
                </button>
              )}
            </li>
          ))}
          {gallery.length === 0 && <li className="text-xs text-stone-400">No photos or videos yet.</li>}
        </ol>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className={`${btn} ${busy ? "opacity-60 cursor-wait" : "cursor-pointer"}`}>
          <ImagePlus className="w-3.5 h-3.5" /> Upload photos
          <input type="file" accept={IMAGE_TYPES.join(",")} multiple disabled={!!busy} onChange={onPhotos} className="sr-only" />
        </label>
        <label className={`${btn} ${busy ? "opacity-60 cursor-wait" : "cursor-pointer"}`}>
          <Video className="w-3.5 h-3.5" /> Upload model video
          <input type="file" accept={[...VIDEO_TYPES, ".mp4", ".webm"].join(",")} multiple disabled={!!busy} onChange={onVideos} className="sr-only" />
        </label>
        <input ref={posterInput} type="file" accept={IMAGE_TYPES.join(",")} onChange={onPoster} className="sr-only" tabIndex={-1} aria-hidden="true" />
      </div>

      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
          placeholder="Or paste a link: /products/dress.jpg or an R2 .mp4 link"
          aria-label="Photo or video link"
          className={inputCls}
        />
        <button type="button" onClick={addLink} className="h-10 px-4 border border-stone-300 text-xs tracking-[0.1em] uppercase hover:border-foreground inline-flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {busy && (
        <p role="status" className="text-xs text-stone-600 inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy}
        </p>
      )}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {note && <p role="status" className="text-xs text-amber-800">{note}</p>}

      <p className="text-xs text-stone-400">
        Order here = order on the product page. The first photo is the main product image (used in orders and emails).
        Model videos: 3–8 second clips of a model walking, turning or posing in this exact item, MP4, no sound needed.
        Tick <strong className="font-medium">Night shot</strong> on a photo or video taken in evening light / with flash: the shop
        switches to it when a visitor turns on Night Mode (without one, the card&apos;s photo is dimmed instead).
      </p>

      <fieldset className="border border-stone-200 p-4 space-y-3">
        <legend className={`${labelCls} px-1 mb-0`}>Shop card shows</legend>
        <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
          <input type="radio" name="card-media" checked={cardMedia === "IMAGE" || !hasVideo} onChange={() => onCardMedia("IMAGE")} className="size-4 accent-primary" />
          Photo
        </label>
        <label className={`flex items-center gap-2 text-sm ${hasVideo ? "text-stone-700 cursor-pointer" : "text-stone-400 cursor-not-allowed"}`}>
          <input
            type="radio"
            name="card-media"
            checked={cardMedia === "VIDEO" && hasVideo}
            onChange={() => onCardMedia("VIDEO")}
            disabled={!hasVideo}
            className="size-4 accent-primary"
          />
          <Film className="w-3.5 h-3.5" /> Model video (plays muted on a loop, poster shown until it loads)
        </label>
        {!hasVideo && <p className="text-xs text-stone-400">Upload a model video to use this.</p>}
        {hasVideo && !hasPhoto && <p className="text-xs text-amber-800">Add at least one photo too: it&apos;s used in the cart, orders and emails.</p>}
        <label className={`flex items-center gap-2 text-sm pt-1 ${hasVideo ? "text-stone-700 cursor-pointer" : "text-stone-400 cursor-not-allowed"}`}>
          <input type="checkbox" checked={editorial && hasVideo} onChange={(e) => onEditorial(e.target.checked)} disabled={!hasVideo} className="size-4 accent-primary" />
          Feature this model video in the large editorial section on the home page
        </label>
      </fieldset>

      <RackImageEditor front={rackFront} back={rackBack} onChange={setRack} />
    </div>
  );
}
