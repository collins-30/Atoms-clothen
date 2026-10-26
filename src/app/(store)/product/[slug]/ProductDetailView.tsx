"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useCatalog } from "@/lib/use-catalog";
import { formatPrice } from "@/lib/format";
import { FREE_STANDARD_SHIPPING_FROM } from "@/lib/pricing";
import { MAX_QTY } from "@/stores/cart-store";
import ProductCard from "@/components/storefront/ProductCard";
import ProductReviews from "@/components/storefront/ProductReviews";
import {
  getProductDetail,
  type ProductDetailResult,
} from "@/server/product";

export default function ProductDetailView({ slug }: { slug: string }) {
  const { products, priceMap } = useCatalog();
  const { addToCart, toggleWish, isWished, market, hydrated } = useStore();

  // The product comes from the server for the CURRENT market.
  // Remember which slug + market was loaded to avoid showing stale prices.
  const [fetched, setFetched] = useState<{
    key: string;
    result: ProductDetailResult;
  } | null>(null);

  const key = `${slug}|${market.code}`;

  useEffect(() => {
    if (!hydrated) return;

    let active = true;

    getProductDetail(slug, market.code)
      .then((result) => {
        if (active) {
          setFetched({ key, result });
        }
      })
      .catch(() => {
        if (active) {
          setFetched({
            key,
            result: {
              ok: false,
              error: "Could not load this product. Please try again.",
            },
          });
        }
      });

    return () => {
      active = false;
    };
  }, [hydrated, slug, market.code, key]);

  const result = fetched?.key === key ? fetched.result : null;
  const detail = result?.ok ? result.detail : null;
  const product = detail?.product ?? null;

  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const colors = product?.colors ?? [];

  const activeColor = colors.some((c) => c.name === color)
    ? color
    : (colors[0]?.name ?? "");

  const sizesForColor =
    detail?.variants.filter((v) => v.color === activeColor) ?? [];

  const currentVariant = sizesForColor.find((v) => v.size === size);
  const stock = currentVariant?.stock ?? 0;
  const maxQty = Math.min(stock || MAX_QTY, MAX_QTY);
  const shownQty = Math.min(qty, maxQty);

  const similar = useMemo(() => {
    if (!product) return [];

    return products
      .filter(
        (p) =>
          p.categorySlug === product.categorySlug &&
          p.gender === product.gender &&
          p.slug !== product.slug,
      )
      .slice(0, 4);
  }, [products, product]);

  const youMayLike = useMemo(() => {
    if (!product) return [];

    return products
      .filter(
        (p) =>
          p.gender === product.gender &&
          p.slug !== product.slug &&
          !similar.includes(p),
      )
      .slice(0, 4);
  }, [products, product, similar]);

  if (!result) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-32">
        <div className="aspect-[3/4] max-w-md bg-stone-100 animate-pulse" />
      </div>
    );
  }

  if (!detail || !product) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-32 text-center">
        <p className="text-stone-500 mb-4">
          {result.ok ? "Product unavailable." : result.error}
        </p>

        <Link
          href="/shop"
          className="text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const handleAdd = () => {
    if (!activeColor || !size || !currentVariant || stock <= 0) return;

    addToCart({
      productSlug: product.slug,
      name: product.name,
      image: product.images[0],
      color: activeColor,
      size,
      price: detail.price,
      qty: shownQty,
      sku: currentVariant.sku,
    });
  };

  const wished = isWished(product.slug);
  const mainImg = product.images[activeImg] ?? product.images[0];

  return (
    <div>
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <nav className="text-xs text-stone-400 mb-6 flex gap-2">
          <Link href="/shop" className="hover:text-foreground">
            Shop
          </Link>

          <span>/</span>

          <Link
            href={`/shop?gender=${product.gender}`}
            className="hover:text-foreground capitalize"
          >
            {product.gender}
          </Link>

          {product.categoryName && (
            <>
              <span>/</span>
              <span className="text-stone-600">
                {product.categoryName}
              </span>
            </>
          )}
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Gallery */}
          <div className="flex gap-4">
            {product.images.length > 1 && (
              <div className="hidden md:flex flex-col gap-3 w-20">
                {product.images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setActiveImg(i)}
                    className={`relative aspect-[3/4] overflow-hidden border ${
                      activeImg === i
                        ? "border-foreground"
                        : "border-transparent"
                    }`}
                    aria-label={`Show image ${i + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 aspect-[3/4] bg-stone-100 overflow-hidden">
              {mainImg && (
                <Image
                  src={mainImg}
                  alt={product.name}
                  fill
                  priority
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="object-cover"
                />
              )}
            </div>
          </div>

          {/* Product configuration */}
          <div className="md:sticky md:top-24 md:self-start">
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {product.name}
            </h1>

            <p className="mt-3 text-xl font-mono">
              {formatPrice(detail.price, market)}
            </p>

            <p className="mt-1 text-xs text-stone-400 font-mono">
              SKU: {currentVariant?.sku || product.sku}
            </p>

            <p className="mt-5 text-sm text-stone-600 leading-relaxed">
              {product.description}
            </p>

            {/* Color selection */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">
                  Color
                </p>

                <span className="text-sm text-stone-600">
                  {activeColor}
                </span>
              </div>

              <div className="flex gap-2.5">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setColor(c.name);
                      setSize("");
                    }}
                    title={c.name}
                    aria-label={c.name}
                    className={`w-9 h-9 rounded-full border-2 ${
                      activeColor === c.name
                        ? "border-foreground"
                        : "border-stone-200"
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Size selection */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">
                  Size
                </p>

                <button
                  onClick={() => setShowGuide((s) => !s)}
                  className="text-xs text-stone-500 underline hover:text-foreground"
                >
                  Size guide
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {sizesForColor.map((s) => (
                  <button
                    key={s.size}
                    onClick={() => setSize(s.size)}
                    disabled={s.stock <= 0}
                    className={`h-11 text-sm border transition-colors ${
                      size === s.size
                        ? "border-foreground bg-foreground text-background"
                        : s.stock <= 0
                          ? "border-stone-200 text-stone-300 line-through cursor-not-allowed"
                          : "border-stone-300 text-foreground hover:border-foreground"
                    }`}
                  >
                    {s.size}
                  </button>
                ))}
              </div>

              {showGuide && (
                <div className="mt-4 border border-stone-200 p-4 text-xs text-stone-600">
                  <p className="font-medium text-foreground mb-2">
                    Size guide (cm)
                  </p>

                  <p>
                    XS — 82–86 · S — 88–92 · M — 94–98 · L — 100–104 · XL —
                    106–110
                  </p>
                </div>
              )}
            </div>

            {/* Stock status */}
            {size && stock > 0 && stock <= 5 && (
              <p className="mt-4 text-xs text-[#2D5A27]">
                Only {stock} left in this size
              </p>
            )}

            {size && stock === 0 && (
              <p className="mt-4 text-xs text-red-600">
                Out of stock in this size
              </p>
            )}

            {/* Quantity and add to bag */}
            <div className="mt-6 flex gap-3">
              <div className="flex items-center border border-stone-300">
                <button
                  onClick={() =>
                    setQty((q) => Math.max(1, Math.min(q, maxQty) - 1))
                  }
                  className="w-11 h-12 flex items-center justify-center"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="w-10 text-center text-sm">
                  {shownQty}
                </span>

                <button
                  onClick={() =>
                    setQty((q) => Math.min(maxQty, Math.min(q, maxQty) + 1))
                  }
                  className="w-11 h-12 flex items-center justify-center"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAdd}
                disabled={!activeColor || !size || stock <= 0}
                className="flex-1 h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase hover:bg-[#2D5A27] transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                {!activeColor
                  ? "Select color"
                  : !size
                    ? "Select size"
                    : stock <= 0
                      ? "Out of stock"
                      : "Add to bag"}
              </button>

              <button
                onClick={() => toggleWish(product.slug)}
                className="w-12 h-12 border border-stone-300 flex items-center justify-center hover:border-foreground"
                aria-label="Toggle favorite"
              >
                <Heart
                  className={`w-5 h-5 ${
                    wished
                      ? "fill-[#1a1a1a] text-foreground"
                      : "text-foreground"
                  }`}
                  strokeWidth={1.4}
                />
              </button>
            </div>

            {/* Product details */}
            <div className="mt-10 space-y-5 text-sm">
              {product.materials && (
                <div className="flex gap-3">
                  <ShieldCheck className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />

                  <div>
                    <p className="font-medium">Materials</p>
                    <p className="text-stone-600">{product.materials}</p>
                  </div>
                </div>
              )}

              {product.care && (
                <div className="flex gap-3">
                  <RefreshCw className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />

                  <div>
                    <p className="font-medium">Care</p>
                    <p className="text-stone-600">{product.care}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Truck className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />

                <div>
                  <p className="font-medium">Shipping</p>
                  <p className="text-stone-600">
                    Complimentary on orders over{" "}
                    {formatPrice(FREE_STANDARD_SHIPPING_FROM, market)}.
                    Returns within 30 days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product reviews */}
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-14 md:py-20">
        <ProductReviews slug={slug} />
      </section>

      {/* Similar products */}
      {similar.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-14 md:py-20">
          <h2
            className="text-2xl md:text-3xl font-bold tracking-tight mb-8"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            You may also like
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {similar.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                priceMap={priceMap}
                market={market}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recommended products */}
      {youMayLike.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-4 md:px-8 pb-20">
          <h2
            className="text-2xl md:text-3xl font-bold tracking-tight mb-8"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Recommended for you
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {youMayLike.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                priceMap={priceMap}
                market={market}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
