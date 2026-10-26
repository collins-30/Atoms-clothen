"use server";

import type { Gender } from "@prisma/client";
import { z } from "zod";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  gender: Gender;
  parentId: string | null;
  active: boolean;
  displayOrder: number;
  productCount: number;
};

export type AdminResult = { ok: true } | { ok: false; error: string };

export async function getAdminCategories(): Promise<AdminCategory[]> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();
  const rows = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    gender: c.gender,
    parentId: c.parentId,
    active: c.active,
    displayOrder: c.displayOrder,
    productCount: c._count.products,
  }));
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const schema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Name is required.").max(80, "Name is too long."),
  slug: z.string().trim().max(80).optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX"]),
  parentId: z.string().min(1).nullable(),
  displayOrder: z.number().int().min(0).max(100000),
  active: z.boolean(),
});

export async function saveCategory(raw: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;

  const slug = d.slug ? slugify(d.slug) : slugify(d.name);
  if (!slug || !SLUG_RE.test(slug)) return { ok: false, error: "The slug can only use letters, numbers and dashes." };

  if (d.parentId) {
    if (d.parentId === d.id) return { ok: false, error: "A category can't be its own parent." };
    const parent = await prisma.category.findUnique({ where: { id: d.parentId }, select: { parentId: true, gender: true } });
    if (!parent) return { ok: false, error: "That parent category no longer exists." };
    if (parent.parentId) return { ok: false, error: "Sub-categories can only go one level deep." };
    if (parent.gender !== d.gender) return { ok: false, error: "A sub-category must have the same gender as its parent." };
    if (d.id) {
      const children = await prisma.category.count({ where: { parentId: d.id } });
      if (children > 0) return { ok: false, error: "This category has sub-categories, so it can't become a sub-category." };
    }
  }

  const data = {
    name: d.name,
    slug,
    gender: d.gender,
    parentId: d.parentId,
    displayOrder: d.displayOrder,
    active: d.active,
  };
  try {
    if (d.id) await prisma.category.update({ where: { id: d.id }, data });
    else await prisma.category.create({ data });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false, error: "Another category already uses that slug." };
    }
    console.error("[admin-categories] save failed:", e);
    return { ok: false, error: "Could not save the category. Please try again." };
  }
  return { ok: true };
}

// Products in this category keep existing but lose their category; its
// sub-categories become top-level (the schema uses ON DELETE SET NULL).
export async function deleteCategory(id: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (typeof id !== "string" || !id) return { ok: false, error: "Category not found." };
  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Category not found." };
  }
  return { ok: true };
}
