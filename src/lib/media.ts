// Product photos and model videos: shared by the server loaders, the storefront
// and the admin form. No server-only imports here.

export type StoreMedia = {
  kind: "image" | "video";
  url: string;
  /** Still frame for a video (shown before it plays, and when it can't play). */
  poster: string | null;
  alt: string | null;
  /** A "night shot": shown on the shop page when Night Mode is on. */
  night: boolean;
  /** A cut-out garment for the clothing rail (not shown in the gallery). */
  rack: "front" | "back" | null;
  /** height / width, when known (rack images). */
  aspect: number | null;
  /** Where the hanger sits (rack images). */
  hang: Hang | null;
};

/**
 * Where the hanger sits on a rail cut-out, as fractions of the garment's
 * width: x = hook / neckline centre from the left, y = the hanger's bar
 * (shoulder line) from the top, w = width of the bar.
 */
export type Hang = { x: number; y: number; w: number };

/** Used for rail images saved before hangers were fitted per garment. */
export const DEFAULT_HANG: Hang = { x: 0.5, y: 0.135, w: 0.52 };

/** A stored hang value, checked (it comes from a JSON column). */
export function parseHang(v: unknown): Hang | null {
  if (!v || typeof v !== "object") return null;
  const { x, y, w } = v as Record<string, unknown>;
  if (typeof x !== "number" || typeof y !== "number" || typeof w !== "number") return null;
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 2 && w >= 0.1 && w <= 1.2)) return null;
  return { x, y, w };
}

/** The cut-out images a product hangs on the clothing rail with, and how each sits on its hanger. */
export type RackImages = {
  front: string;
  back: string | null;
  aspect: number;
  backAspect: number;
  hang: Hang;
  backHang: Hang;
};

/** What a product card shows in Night Mode. */
export type NightShot = { kind: "image" | "video"; src: string; poster: string | null };

/** A model video plus the picture to show until (or instead of) it playing. */
export type VideoSource = { src: string; poster: string | null };

type MediaRow = {
  kind: "IMAGE" | "VIDEO";
  url: string;
  posterUrl: string | null;
  alt: string | null;
  night: boolean;
  rack: "FRONT" | "BACK" | null;
  aspect: number | null;
  hang?: unknown;
};

const lower = (r: MediaRow["rack"]) => (r === "FRONT" ? "front" : r === "BACK" ? "back" : null);

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
    return rows.map((r) => ({
      kind: r.kind === "VIDEO" ? "video" : "image",
      url: r.url,
      poster: r.posterUrl,
      alt: r.alt,
      night: r.night,
      rack: r.kind === "IMAGE" ? lower(r.rack) : null,
      aspect: r.aspect,
      hang: parseHang(r.hang),
    }));
  }
  const out: StoreMedia[] = legacyImages.map((url) => ({ kind: "image", url, poster: null, alt: null, night: false, rack: null, aspect: null, hang: null }));
  if (legacyVideo) out.push({ kind: "video", url: legacyVideo, poster: null, alt: null, night: false, rack: null, aspect: null, hang: null });
  return out;
}

/** The product's first (daytime) model video, with a poster (its own, else the first photo). */
export function showcaseVideo(media: StoreMedia[]): VideoSource | null {
  const video = media.find((m) => m.kind === "video" && !m.night);
  if (!video) return null;
  return { src: video.url, poster: video.poster ?? media.find((m) => m.kind === "image" && !m.night && !m.rack)?.url ?? null };
}

/**
 * The night shot a product card switches to in Night Mode: a night video when
 * the card shows a video and one exists, otherwise a night photo, otherwise
 * any night video. Null when the product has no night shots.
 */
export function nightShotFor(media: StoreMedia[], preferVideo: boolean): NightShot | null {
  const nightPhoto = media.find((m) => m.night && m.kind === "image" && !m.rack);
  const nightVideo = media.find((m) => m.night && m.kind === "video");
  const pick = preferVideo ? (nightVideo ?? nightPhoto) : (nightPhoto ?? nightVideo);
  if (!pick) return null;
  return pick.kind === "video"
    ? { kind: "video", src: pick.url, poster: pick.poster ?? nightPhoto?.url ?? null }
    : { kind: "image", src: pick.url, poster: null };
}

/** The product's rail images (front required), or null when it has none. */
export function rackImagesFor(media: StoreMedia[]): RackImages | null {
  const front = media.find((m) => m.rack === "front");
  if (!front) return null;
  const back = media.find((m) => m.rack === "back");
  const aspect = front.aspect && front.aspect > 0 ? front.aspect : 1.3;
  return {
    front: front.url,
    back: back?.url ?? null,
    aspect,
    backAspect: back?.aspect && back.aspect > 0 ? back.aspect : aspect,
    hang: front.hang ?? DEFAULT_HANG,
    backHang: back?.hang ?? front.hang ?? DEFAULT_HANG,
  };
}

/** Media for the product page gallery: everything except rail cut-outs. */
export const galleryMedia = (media: StoreMedia[]) => media.filter((m) => !m.rack);
