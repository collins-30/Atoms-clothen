import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { prisma } from "@/lib/db";

// Built per request (the product list lives in the database), then cached by the CDN.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const pages = ["", "/shop", "/about", "/help", "/privacy", "/terms", "/legal"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  let products: MetadataRoute.Sitemap = [];
  try {
    const rows = await prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
    products = rows.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    // A database hiccup must not break the sitemap: list the static pages only.
    console.error("[sitemap] could not load products", error);
  }

  return [...pages, ...products];
}
