"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useCatalog } from "@/lib/use-catalog";
import ProductCard from "@/components/storefront/ProductCard";
import type { StoreBanner } from "@/lib/storefront-types";

// These two used to be Base44 CDN links. Save them into public/images/ with
// these names (see the instructions that came with this update).
const HERO = "/images/hero.jpg";
const BANNER = "/images/promo.jpg";

function Section({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-14 md:py-20">
      <div className="flex items-end justify-between mb-8 md:mb-10">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>{title}</h2>
        <Link href={to} className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase hover:opacity-60">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

const GRID = "grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6";

export default function HomeView({ banners }: { banners: StoreBanner[] }) {
  const { products, priceMap, market, loading } = useCatalog();

  const heroBanner = banners.find((b) => b.type === "hero");
  const promoBanner = banners.find((b) => b.type === "promo");

  const newArrivals = products.filter((p) => p.isNew).slice(0, 4);
  const trending = products.filter((p) => p.isTrending).slice(0, 4);
  const bestsellers = products.filter((p) => p.isBestseller).slice(0, 4);
  const featured = products.filter((p) => p.featured).slice(0, 4);

  const cards = (list: typeof products) =>
    list.map((p) => <ProductCard key={p.id} product={p} priceMap={priceMap} market={market} />);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[78vh] md:h-[92vh] -mt-16 overflow-hidden">
        <Image
          src={heroBanner?.image || HERO}
          alt={heroBanner?.title || "JAMAS seasonal campaign"}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/20" />
        <div className="relative h-full max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col justify-end pb-16 md:pb-24">
          <p className="text-background text-xs tracking-[0.3em] uppercase mb-4 opacity-90">{heroBanner?.subtitle || "Autumn / Winter 2026"}</p>
          <h1 className="text-background text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight max-w-3xl leading-[0.95]" style={{ fontFamily: "var(--font-heading)" }}>
            {heroBanner?.title || "Form, in its purest state."}
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={heroBanner?.link || "/shop?gender=women"} className="h-12 px-8 bg-background text-foreground text-xs tracking-[0.2em] uppercase flex items-center hover:bg-white">{heroBanner?.buttonText || "Shop Women"}</Link>
            {!heroBanner && <Link href="/shop?gender=men" className="h-12 px-8 border border-background text-background text-xs tracking-[0.2em] uppercase flex items-center hover:bg-background/10">Shop Men</Link>}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {(loading || newArrivals.length > 0) && (
        <Section title="New Arrivals" to="/shop?new=1">
          <div className={GRID}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-stone-100 animate-pulse" />)
              : cards(newArrivals)}
          </div>
        </Section>
      )}

      {/* Promotional banner */}
      <section className="relative h-[60vh] overflow-hidden">
        <Image src={promoBanner?.image || BANNER} alt={promoBanner?.title || "Winter Edit collection"} fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative h-full max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col items-center justify-center text-center">
          <p className="text-background text-xs tracking-[0.3em] uppercase mb-3 opacity-90">{promoBanner?.subtitle || "The Winter Edit"}</p>
          <h2 className="text-background text-4xl md:text-6xl font-bold tracking-tight max-w-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            {promoBanner?.title || "Tailored wool, built for the cold."}
          </h2>
          <Link href={promoBanner?.link || "/shop"} className="mt-8 h-12 px-8 bg-background text-foreground text-xs tracking-[0.2em] uppercase flex items-center hover:bg-white">{promoBanner?.buttonText || "Explore the collection"}</Link>
        </div>
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <Section title="Trending Now" to="/shop">
          <div className={GRID}>{cards(trending)}</div>
        </Section>
      )}

      {/* Editorial split */}
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-14 md:py-20 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
          <Image src={BANNER} alt="JAMAS craftsmanship" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="md:pl-8">
          <p className="text-xs tracking-[0.3em] uppercase text-stone-500 mb-4">The JAMAS Standard</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Considered design, responsible materials.
          </h2>
          <p className="mt-6 text-stone-600 leading-relaxed max-w-md">
            Every piece is cut from natural fibres and finished by partners who share our standard for craft and traceability. Made in limited runs, made to last.
          </p>
          <Link href="/about" className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1">Read our story <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </section>

      {/* Best sellers */}
      {bestsellers.length > 0 && (
        <Section title="Best Sellers" to="/shop">
          <div className={GRID}>{cards(bestsellers)}</div>
        </Section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <Section title="Featured" to="/shop">
          <div className={GRID}>{cards(featured)}</div>
        </Section>
      )}
    </div>
  );
}
