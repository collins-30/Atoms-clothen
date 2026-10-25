"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useCatalog } from "@/lib/use-catalog";
import ProductCard from "@/components/storefront/ProductCard";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "popular", label: "Popular" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

export default function ShopView() {
  const { products, priceMap, market, loading } = useCatalog();
  const params = useSearchParams();
  const [sort, setSort] = useState<SortValue>("recommended");
  const [showFilters, setShowFilters] = useState(false);

  const genderParam = params.get("gender") || "";
  const newOnly = params.get("new") === "1";
  const q = params.get("q") || "";

  const categories = useMemo(() => {
    const set = new Set(products.filter((p) => !genderParam || p.gender === genderParam).map((p) => p.categorySlug));
    return [...set].filter((c): c is string => Boolean(c));
  }, [products, genderParam]);

  const allColors = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => p.colors.forEach((c) => { if (!map[c.name]) map[c.name] = c.hex; }));
    return Object.entries(map);
  }, [products]);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => set.add(s)));
    return [...set];
  }, [products]);

  const [selCategory, setSelCategory] = useState("");
  const [selColors, setSelColors] = useState<string[]>([]);
  const [selSizes, setSelSizes] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const filtered = useMemo(() => {
    let list = products;
    if (genderParam) list = list.filter((p) => p.gender === genderParam);
    if (newOnly) list = list.filter((p) => p.isNew);
    if (q) {
      const t = q.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(t) || p.categorySlug?.toLowerCase().includes(t) || p.tags.some((tag) => tag.toLowerCase().includes(t)),
      );
    }
    if (selCategory) list = list.filter((p) => p.categorySlug === selCategory);
    if (selColors.length) list = list.filter((p) => p.colors.some((c) => selColors.includes(c.name)));
    if (selSizes.length) list = list.filter((p) => p.sizes.some((s) => selSizes.includes(s)));
    // Unlike Base44 (which only checked that a price existed), this checks real stock.
    if (inStockOnly) list = list.filter((p) => p.inStock);
    if (maxPrice) list = list.filter((p) => priceMap[p.slug] != null && priceMap[p.slug] <= Number(maxPrice));

    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === "price-asc") sorted.sort((a, b) => (priceMap[a.slug] ?? 9e9) - (priceMap[b.slug] ?? 9e9));
    else if (sort === "price-desc") sorted.sort((a, b) => (priceMap[b.slug] ?? 0) - (priceMap[a.slug] ?? 0));
    else if (sort === "popular") sorted.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller));
    return sorted;
  }, [products, priceMap, genderParam, newOnly, q, selCategory, selColors, selSizes, inStockOnly, maxPrice, sort]);

  const title = genderParam ? (genderParam === "women" ? "Women" : "Men") : newOnly ? "New Arrivals" : q ? `Search: "${q}"` : "All Collections";

  // A JSX value, NOT a component defined inside this component. (The Base44
  // version was a nested component, which re-created the Max Price box on every
  // keystroke and made it lose focus after each digit.)
  const filterPanel = (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-3">Category</p>
        <ul className="space-y-2">
          <li><button onClick={() => setSelCategory("")} className={`text-sm ${!selCategory ? "text-foreground font-medium" : "text-stone-500 hover:text-foreground"}`}>All</button></li>
          {categories.map((c) => (
            <li key={c}><button onClick={() => setSelCategory(c)} className={`text-sm capitalize ${selCategory === c ? "text-foreground font-medium" : "text-stone-500 hover:text-foreground"}`}>{c}</button></li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-3">Color</p>
        <div className="flex flex-wrap gap-2">
          {allColors.map(([name, hex]) => (
            <button key={name} onClick={() => toggle(selColors, setSelColors, name)} title={name} aria-label={name}
              className={`w-7 h-7 rounded-full border-2 ${selColors.includes(name) ? "border-foreground" : "border-stone-200"}`} style={{ background: hex }} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-3">Size</p>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((s) => (
            <button key={s} onClick={() => toggle(selSizes, setSelSizes, s)}
              className={`min-w-[2.5rem] h-9 px-2 text-xs border ${selSizes.includes(s) ? "border-foreground bg-foreground text-background" : "border-stone-300 text-foreground hover:border-foreground"}`}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-3">Max Price</p>
        <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="No limit" className="w-full border-b border-stone-300 bg-transparent py-1 text-sm outline-none focus:border-foreground" />
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
        <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-[#1a1a1a]" />
        In stock only
      </label>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8 pb-20">
      <div className="mb-8 md:mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">{newOnly ? "Just landed" : "Collection"}</p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>{title}</h1>
      </div>

      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
        <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase md:hidden">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
        <p className="hidden md:block text-sm text-stone-500">{filtered.length} pieces</p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-xs tracking-[0.15em] uppercase text-stone-400 hidden sm:block">Sort</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortValue)} className="text-sm bg-transparent border-b border-stone-300 py-1 outline-none focus:border-foreground cursor-pointer">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-12">
        <aside className="hidden md:block w-56 shrink-0">{filterPanel}</aside>
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-stone-100 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center text-stone-500">No pieces match your filters.</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6">
              {filtered.map((p) => <ProductCard key={p.id} product={p} priceMap={priceMap} market={market} />)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-background p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs tracking-[0.2em] uppercase">Filters</p>
              <button onClick={() => setShowFilters(false)} aria-label="Close filters"><X className="w-5 h-5" /></button>
            </div>
            {filterPanel}
            <button onClick={() => setShowFilters(false)} className="mt-8 w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase">Show {filtered.length} results</button>
          </div>
        </div>
      )}
    </div>
  );
}
