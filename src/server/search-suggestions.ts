"use server";

import { prisma } from "@/lib/db";

/**
 * Category names for the search box's "Try searching for…" animation: active
 * categories that have at least one published product, in display order.
 * (Men's and women's "Knitwear" appear once.)
 */
export async function getSearchSuggestions(): Promise<string[]> {
  try {
    const rows = await prisma.category.findMany({
      where: { active: true, products: { some: { status: "PUBLISHED" } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true },
      take: 60,
    });
    const seen = new Set<string>();
    const out: string[] = [];
    for (const { name } of rows) {
      const key = name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(name.trim());
    }
    return out.slice(0, 12);
  } catch (e) {
    console.error("[search-suggestions] failed:", e);
    return [];
  }
}
