"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createPresignedUpload, isR2Configured } from "@/lib/r2";

export type UploadResult =
  | { ok: true; uploadUrl: string; publicUrl: string; contentType: string }
  | { ok: false; error: string };

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as const;

const schema = z.object({
  folder: z.enum(["products", "banners", "themes"]),
  filename: z.string().max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  size: z.number().int().positive().max(MAX_BYTES, "Images can be at most 8 MB."),
});

/** Step 1 of an upload: an admin asks for permission to store one image. */
export async function createImageUpload(raw: unknown): Promise<UploadResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (!isR2Configured()) {
    return { ok: false, error: "Image storage isn't set up yet. Paste an image link instead, or add the R2 settings to .env." };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Use a JPG, PNG, WebP or AVIF image up to 8 MB." };
  const { folder, filename, contentType } = parsed.data;

  // e.g. products/summer-dress-3f9c1a2b.jpg  (a random suffix means two files with the same name never overwrite each other)
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "image";
  const key = `${folder}/${base}-${randomUUID().slice(0, 8)}.${EXT[contentType]}`;

  try {
    const { uploadUrl, publicUrl } = await createPresignedUpload(key, contentType);
    return { ok: true, uploadUrl, publicUrl, contentType };
  } catch (e) {
    console.error("[admin-uploads] presign failed:", e);
    return { ok: false, error: "Could not start the upload. Check the R2 settings in .env." };
  }
}
