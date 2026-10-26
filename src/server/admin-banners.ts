"use server";

import { z } from "zod";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { AdminResult } from "@/server/admin-categories";

export type AdminBanner = {
  id: string;
  type: "HERO" | "PROMO";
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
  link: string;
  active: boolean;
  displayOrder: number;
};

export async function getAdminBanners(): Promise<AdminBanner[]> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();
  const rows = await prisma.banner.findMany({ orderBy: [{ type: "asc" }, { displayOrder: "asc" }] });
  return rows.map((b) => ({
    id: b.id,
    type: b.type,
    title: b.title,
    subtitle: b.subtitle ?? "",
    image: b.image ?? "",
    buttonText: b.buttonText ?? "",
    link: b.link ?? "",
    active: b.active,
    displayOrder: b.displayOrder,
  }));
}

// A link is either a page of this store (/shop) or a full https:// address.
const localOrHttps = (v: string) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://");

const schema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(["HERO", "PROMO"]),
  title: z.string().trim().min(1, "Title is required.").max(120),
  subtitle: z.string().trim().max(200),
  image: z.string().trim().max(2000).refine(localOrHttps, "Image links must start with / or https://"),
  buttonText: z.string().trim().max(40),
  link: z.string().trim().max(500).refine(localOrHttps, "Links must start with / (a page of this store) or https://"),
  active: z.boolean(),
  displayOrder: z.number().int().min(0).max(100000),
});

export async function saveBanner(raw: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { id, ...d } = parsed.data;
  const data = {
    type: d.type,
    title: d.title,
    subtitle: d.subtitle || null,
    image: d.image || null,
    buttonText: d.buttonText || null,
    link: d.link || null,
    active: d.active,
    displayOrder: d.displayOrder,
  };
  try {
    if (id) await prisma.banner.update({ where: { id }, data });
    else await prisma.banner.create({ data });
  } catch (e) {
    console.error("[admin-banners] save failed:", e);
    return { ok: false, error: "Could not save the banner. Please try again." };
  }
  return { ok: true };
}

export async function setBannerActive(id: unknown, active: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (typeof id !== "string" || typeof active !== "boolean") return { ok: false, error: "Invalid request." };
  try {
    await prisma.banner.update({ where: { id }, data: { active } });
  } catch {
    return { ok: false, error: "Banner not found." };
  }
  return { ok: true };
}

export async function deleteBanner(id: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (typeof id !== "string" || !id) return { ok: false, error: "Banner not found." };
  try {
    await prisma.banner.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Banner not found." };
  }
  return { ok: true };
}
