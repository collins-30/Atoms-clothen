"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { Gender, ProductStatus } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ghostBtn, inputCls, labelCls, primaryBtn } from "@/components/admin/AdminUi";
import ImageUploadButton from "@/components/admin/ImageUploadButton";
import { saveProduct, type AdminCategoryLite, type AdminMarketLite, type AdminProduct } from "@/server/admin-products";

const GENDERS: Gender[] = ["WOMEN", "MEN", "UNISEX"];
const STATUSES: ProductStatus[] = ["PUBLISHED", "DRAFT", "ARCHIVED"];
const FLAGS = [
  ["isNew", "New"],
  ["isBestseller", "Bestseller"],
  ["isTrending", "Trending"],
  ["featured", "Featured"],
] as const;

const parseList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
// "Black:#1A1A1A, Ivory:#F3ECE0"  ->  [{ name, hex }]   (a missing/invalid hex becomes grey)
const parseColors = (s: string) =>
  parseList(s).map((item) => {
    const [name, hex] = item.split(":").map((x) => x.trim());
    return { name, hex: hex && /^#?[0-9a-f]{3,8}$/i.test(hex) ? (hex.startsWith("#") ? hex : `#${hex}`) : "#cccccc" };
  });
const colorsToText = (c: { name: string; hex: string }[]) => c.map((x) => `${x.name}:${x.hex}`).join(", ");

type PriceCell = { price: string; available: boolean };

export default function ProductFormDialog({
  product,
  categories,
  markets,
  onClose,
  onSaved,
}: {
  product: AdminProduct | null;
  categories: AdminCategoryLite[];
  markets: AdminMarketLite[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState(() => ({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? "",
    gender: (product?.gender ?? "WOMEN") as Gender,
    status: (product?.status ?? "PUBLISHED") as ProductStatus,
    collection: product?.collection ?? "",
    tags: (product?.tags ?? []).join(", "),
    sizes: (product?.sizes ?? []).join(", "),
    colors: colorsToText(product?.colors ?? []),
    materials: product?.materials ?? "",
    care: product?.care ?? "",
    isNew: product?.isNew ?? false,
    isBestseller: product?.isBestseller ?? false,
    isTrending: product?.isTrending ?? false,
    featured: product?.featured ?? false,
  }));
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imgUrl, setImgUrl] = useState("");
  const [prices, setPrices] = useState<Record<string, PriceCell>>(() => {
    const out: Record<string, PriceCell> = {};
    for (const m of markets) {
      const existing = product?.prices.find((p) => p.marketId === m.id);
      out[m.id] = { price: existing ? String(existing.price) : "", available: existing?.available ?? true };
    }
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setPrice = (marketId: string, patch: Partial<PriceCell>) => setPrices((p) => ({ ...p, [marketId]: { ...p[marketId], ...patch } }));

  const addImage = () => {
    const v = imgUrl.trim();
    if (!v) return;
    if (!(v.startsWith("/") && !v.startsWith("//")) && !v.startsWith("https://")) {
      setError("Image links must start with / (a file in your public folder) or https://");
      return;
    }
    setError("");
    setImages((imgs) => [...imgs, v]);
    setImgUrl("");
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await saveProduct({
        id: product?.id,
        name: form.name,
        slug: form.slug,
        description: form.description,
        sku: form.sku,
        categoryId: form.categoryId || null,
        gender: form.gender,
        status: form.status,
        collection: form.collection,
        isNew: form.isNew,
        isBestseller: form.isBestseller,
        isTrending: form.isTrending,
        featured: form.featured,
        tags: parseList(form.tags),
        sizes: parseList(form.sizes),
        colors: parseColors(form.colors),
        materials: form.materials,
        care: form.care,
        images,
        // a blank price = "not sold in this market"
        prices: markets
          .filter((m) => prices[m.id]?.price.trim() !== "")
          .map((m) => ({ marketId: m.id, price: Number(prices[m.id].price), available: prices[m.id].available })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved(isEdit ? "Product updated." : "Product created.");
      onClose();
    } catch {
      setError("Could not save the product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-none bg-[#F9F9F7]">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
            {isEdit ? "Edit product" : "New product"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-name" className={labelCls}>Name *</label>
              <input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="p-sku" className={labelCls}>SKU</label>
              <input id="p-sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="p-slug" className={labelCls}>Slug (auto from the name if blank)</label>
            <input id="p-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} className={`${inputCls} font-mono`} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="p-gender" className={labelCls}>Gender</label>
              <select id="p-gender" value={form.gender} onChange={(e) => set("gender", e.target.value as Gender)} className={inputCls}>
                {GENDERS.map((g) => <option key={g} value={g}>{g.toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-cat" className={labelCls}>Category</label>
              <select id="p-cat" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputCls}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.gender.toLowerCase()})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-status" className={labelCls}>Status</label>
              <select id="p-status" value={form.status} onChange={(e) => set("status", e.target.value as ProductStatus)} className={inputCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="p-desc" className={labelCls}>Description</label>
            <textarea id="p-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={`${inputCls} h-auto py-2`} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-coll" className={labelCls}>Collection</label>
              <input id="p-coll" value={form.collection} onChange={(e) => set("collection", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="p-tags" className={labelCls}>Tags (comma-separated)</label>
              <input id="p-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-sizes" className={labelCls}>Sizes (comma-separated)</label>
              <input id="p-sizes" value={form.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="XS, S, M, L" className={inputCls} />
            </div>
            <div>
              <label htmlFor="p-colors" className={labelCls}>Colors (Name:#hex, comma-separated)</label>
              <input id="p-colors" value={form.colors} onChange={(e) => set("colors", e.target.value)} placeholder="Black:#1A1A1A, Ivory:#F3ECE0" className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-mat" className={labelCls}>Materials</label>
              <textarea id="p-mat" value={form.materials} onChange={(e) => set("materials", e.target.value)} rows={2} className={`${inputCls} h-auto py-2`} />
            </div>
            <div>
              <label htmlFor="p-care" className={labelCls}>Care</label>
              <textarea id="p-care" value={form.care} onChange={(e) => set("care", e.target.value)} rows={2} className={`${inputCls} h-auto py-2`} />
            </div>
          </div>

          <div>
            <p className={labelCls}>Images</p>
            <div className="flex flex-wrap gap-3">
              {images.map((src, i) => (
                <div key={`${src}-${i}`} className="relative w-16 h-20 border border-stone-200 bg-stone-100 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute inset-0 bg-black/60 text-white text-[10px] uppercase opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {images.length === 0 && <p className="text-xs text-stone-400">No images yet.</p>}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImage(); } }}
                placeholder="Paste an image link, or a path like /products/dress.jpg"
                aria-label="Image link"
                className={inputCls}
              />
              <button type="button" onClick={addImage} className="h-10 px-4 border border-stone-300 text-xs tracking-[0.1em] uppercase hover:border-[#1a1a1a] inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="mt-2">
              <ImageUploadButton folder="products" multiple label="Upload images" onUploaded={(url) => setImages((imgs) => [...imgs, url])} />
            </div>
            <p className="text-xs text-stone-400 mt-1.5">The first image is the main one. Upload files, or paste a link or a path like /products/dress.jpg.</p>
          </div>

          <div>
            <p className={labelCls}>Prices by market</p>
            <div className="divide-y divide-stone-200 border-y border-stone-200">
              {markets.map((m) => (
                <div key={m.id} className="flex items-center gap-4 py-2.5">
                  <span className="text-sm text-[#1a1a1a] flex-1 min-w-0 truncate">
                    {m.name} <span className="text-xs text-stone-400">({m.code}, {m.currency}){!m.active && " · inactive"}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-400">{m.symbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="—"
                      value={prices[m.id]?.price ?? ""}
                      onChange={(e) => setPrice(m.id, { price: e.target.value })}
                      aria-label={`Price in ${m.code}`}
                      className="w-28 h-9 px-2 text-sm text-right bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a]"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-stone-500 cursor-pointer w-24">
                    <input
                      type="checkbox"
                      checked={prices[m.id]?.available ?? true}
                      onChange={(e) => setPrice(m.id, { available: e.target.checked })}
                      className="size-4 accent-[#1a1a1a]"
                    />
                    Available
                  </label>
                </div>
              ))}
              {markets.length === 0 && <p className="py-3 text-sm text-stone-400">No markets yet.</p>}
            </div>
            <p className="text-xs text-stone-400 mt-1.5">Leave a price blank and the product isn&apos;t sold in that market.</p>
          </div>

          <div className="flex flex-wrap gap-6">
            {FLAGS.map(([key, text]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="size-4 accent-[#1a1a1a]" />
                {text}
              </label>
            ))}
          </div>

          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className={ghostBtn}>Cancel</button>
            <button onClick={save} disabled={saving} className={primaryBtn}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create product"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
