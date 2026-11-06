"use client";

import { useState, type ChangeEvent } from "react";
import { Loader2, Video } from "lucide-react";
import { inputCls, labelCls } from "@/components/admin/AdminUi";
import { VIDEO_TYPES, inspectVideo, uploadImageFile, uploadVideoFile } from "@/components/admin/r2-upload";

/**
 * Optional background video for a banner. Uploading one also saves a still
 * frame as the banner image when the banner has no image yet (the image is
 * shown until the video plays, and instead of it when it can't play).
 */
export default function BannerVideoField({
  videoUrl,
  poster,
  onChange,
  onPoster,
}: {
  videoUrl: string;
  poster: string;
  onChange: (url: string) => void;
  onPoster: (url: string) => void;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setNote("");
    try {
      setBusy("Reading the video…");
      const info = await inspectVideo(file);
      if (info && info.duration > 20) setNote(`This video is ${Math.round(info.duration)} s long. 6–15 s loops load faster.`);
      if (info?.poster && !poster) {
        setBusy("Saving a still frame as the banner image…");
        const still = await uploadImageFile(info.poster, "banners");
        if (still.ok) onPoster(still.url);
      }
      const res = await uploadVideoFile(file, (f) => setBusy(`Uploading video… ${Math.round(f * 100)}%`), "banners");
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onChange(res.url);
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <label htmlFor="b-video" className={labelCls}>Video (optional, plays muted on a loop)</label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-14 bg-stone-100 overflow-hidden shrink-0">
          {videoUrl && (
            <video
              src={videoUrl}
              poster={poster || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
              onMouseLeave={(e) => e.currentTarget.pause()}
              className="w-full h-full object-cover"
              aria-label="Banner video preview"
            />
          )}
        </div>
        <input id="b-video" value={videoUrl} onChange={(e) => onChange(e.target.value)} placeholder="Upload, or paste an R2 .mp4 link" className={inputCls} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className={`inline-flex items-center gap-2 h-10 px-5 border border-stone-300 text-xs tracking-[0.15em] uppercase transition-colors focus-within:border-foreground ${busy ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-foreground"}`}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
          {busy ? "Uploading…" : "Upload video"}
          <input type="file" accept={[...VIDEO_TYPES, ".mp4", ".webm"].join(",")} disabled={!!busy} onChange={onPick} className="sr-only" />
        </label>
        {videoUrl && !busy && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-stone-500 hover:text-rose-700 underline underline-offset-2">
            Remove video
          </button>
        )}
      </div>
      {busy && <p role="status" className="text-xs text-stone-600 mt-1.5">{busy}</p>}
      {error && <p role="alert" className="text-xs text-rose-700 mt-1.5">{error}</p>}
      {note && <p role="status" className="text-xs text-amber-800 mt-1.5">{note}</p>}
      <p className="text-xs text-stone-400 mt-1.5">MP4, up to 60 MB. Landscape works best for the hero and promo banners. The image above is shown until the video plays.</p>
    </div>
  );
}
