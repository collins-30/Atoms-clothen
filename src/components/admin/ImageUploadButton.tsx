"use client";

import { useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { createImageUpload } from "@/server/admin-uploads";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024;

export default function ImageUploadButton({
  folder,
  onUploaded,
  multiple = false,
  label = "Upload",
}: {
  folder: "products" | "banners" | "themes";
  onUploaded: (publicUrl: string) => void; // called once per uploaded file
  multiple?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Returns true when the file was stored.
  const uploadOne = async (file: File): Promise<boolean> => {
    if (!TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, WebP or AVIF image.");
      return false;
    }
    if (file.size > MAX_BYTES) {
      setError("Images can be at most 8 MB.");
      return false;
    }
    const ticket = await createImageUpload({ folder, filename: file.name, contentType: file.type, size: file.size });
    if (!ticket.ok) {
      setError(ticket.error);
      return false;
    }
    try {
      // The file goes straight from this browser to Cloudflare R2.
      const put = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": ticket.contentType }, body: file });
      if (!put.ok) throw new Error(`R2 answered ${put.status}`);
    } catch {
      setError("The upload failed. Check the bucket's CORS settings and the R2 keys in .env.");
      return false;
    }
    onUploaded(ticket.publicUrl);
    return true;
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // so the same file can be picked again
    if (files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        if (!(await uploadOne(file))) break;
      }
    } catch {
      setError("The upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label
        className={`inline-flex items-center gap-2 h-10 px-5 border border-stone-300 text-xs tracking-[0.15em] uppercase transition-colors focus-within:border-[#1a1a1a] ${
          busy ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-[#1a1a1a]"
        }`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
        {busy ? "Uploading…" : label}
        <input type="file" accept={TYPES.join(",")} multiple={multiple} disabled={busy} onChange={onPick} className="sr-only" />
      </label>
      {error && <p role="alert" className="text-xs text-rose-700 mt-1.5">{error}</p>}
    </div>
  );
}
