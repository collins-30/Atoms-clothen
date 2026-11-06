// Product photos and model videos: shared by the server loaders, the storefront
// and the admin form. No server-only imports here.

export type StoreMedia = {
  kind: "image" | "video";
  url: string;
  /** Still frame for a video (shown before it plays, and when it can't play). */
  poster: string | null;
  alt: string | null;
};

/** A model video plus the picture to show until (or instead of) it playing. */
export type VideoSource = { src: string; poster: string | null };

type MediaRow = { kind: "IMAGE" | "VIDEO"; url: string; posterUrl: string | null; alt: string | null };

const VIDEO_EXT = /\.(mp4|webm|m4v)(?:[?#]|$)/i;

/** True for links that end in a video file extension. */
export const looksLikeVideo = (url: string) => VIDEO_EXT.test(url);

/**
 * A product's media in display order. Products saved before model videos
 * existed have no media rows: their `images` list (and the old single
 * `videoUrl`, if one was ever set) is used instead, so nothing disappears.
 */
export function resolveMedia(rows: MediaRow[], legacyImages: string[], legacyVideo: string | null): StoreMedia[] {
  if (rows.length > 0) {
    return rows.map((r) => ({ kind: r.kind === "VIDEO" ? "video" : "image", url: r.url, poster: r.posterUrl, alt: r.alt }));
  }
  const out: StoreMedia[] = legacyImages.map((url) => ({ kind: "image", url, poster: null, alt: null }));
  if (legacyVideo) out.push({ kind: "video", url: legacyVideo, poster: null, alt: null });
  return out;
}

/** The product's first model video, with a poster (its own, else the first photo). */
export function showcaseVideo(media: StoreMedia[]): VideoSource | null {
  const video = media.find((m) => m.kind === "video");
  if (!video) return null;
  return { src: video.url, poster: video.poster ?? media.find((m) => m.kind === "image")?.url ?? null };
}

/** The photo URLs only, in order. Orders, emails and payments still use these. */
export const imageUrls = (media: StoreMedia[]) => media.filter((m) => m.kind === "image").map((m) => m.url);
