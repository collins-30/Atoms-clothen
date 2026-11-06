// Browser-side helpers for sending product photos and model videos straight to
// Cloudflare R2 (the server only hands out a short-lived upload link).

import { createImageUpload, createVideoUpload } from "@/server/admin-uploads";

export type Uploaded = { ok: true; url: string } | { ok: false; error: string };

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

const STORAGE_HELP = "The upload failed. Check the bucket's CORS settings and the R2 keys in .env.";

/** PUT a file to a pre-signed R2 link, reporting progress (0-1) when asked. */
function putFile(uploadUrl: string, file: Blob, contentType: string, onProgress?: (fraction: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}

export type UploadFolder = "products" | "banners";

export async function uploadImageFile(file: File, folder: UploadFolder = "products"): Promise<Uploaded> {
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, error: "Use a JPG, PNG, WebP or AVIF image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images can be at most 8 MB." };
  const ticket = await createImageUpload({ folder, filename: file.name, contentType: file.type, size: file.size });
  if (!ticket.ok) return ticket;
  return (await putFile(ticket.uploadUrl, file, ticket.contentType)) ? { ok: true, url: ticket.publicUrl } : { ok: false, error: STORAGE_HELP };
}

export async function uploadVideoFile(
  file: File,
  onProgress?: (fraction: number) => void,
  folder: UploadFolder = "products",
): Promise<Uploaded> {
  if (file.type === "video/quicktime" || /\.mov$/i.test(file.name)) {
    return { ok: false, error: "That's a .mov file, which most browsers can't play. Export it as MP4 first (see README › Model videos)." };
  }
  if (!VIDEO_TYPES.includes(file.type)) return { ok: false, error: "Use an MP4 or WebM video." };
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: "Videos can be at most 60 MB. Shorten or compress it first." };
  const ticket = await createVideoUpload({ folder, filename: file.name, contentType: file.type, size: file.size });
  if (!ticket.ok) return ticket;
  return (await putFile(ticket.uploadUrl, file, ticket.contentType, onProgress))
    ? { ok: true, url: ticket.publicUrl }
    : { ok: false, error: STORAGE_HELP };
}

function waitFor(el: HTMLMediaElement, event: string, ms = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    el.addEventListener(event, () => { clearTimeout(timer); resolve(); }, { once: true });
    el.addEventListener("error", () => { clearTimeout(timer); reject(new Error("error")); }, { once: true });
  });
}

export type VideoInfo = { duration: number; width: number; height: number; poster: File | null };

/**
 * Reads a video file in the browser: its length and size, plus a JPG still
 * taken from early in the clip to use as the poster.
 */
export async function inspectVideo(file: File): Promise<VideoInfo | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await waitFor(video, "loadeddata");
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.min(0.6, duration / 3 || 0);
    await waitFor(video, "seeked");

    const scale = Math.min(1, 1080 / (video.videoWidth || 1080));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((video.videoWidth || 720) * scale);
    canvas.height = Math.round((video.videoHeight || 960) * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    const base = file.name.replace(/\.[^.]+$/, "") || "video";
    return {
      duration,
      width: video.videoWidth,
      height: video.videoHeight,
      poster: blob ? new File([blob], `${base}-poster.jpg`, { type: "image/jpeg" }) : null,
    };
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
