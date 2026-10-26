"use server";

import { z } from "zod";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { AdminResult } from "@/server/admin-categories";

export type AdminTheme = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  autoActivate: boolean;
  startDate: string; // "MM-DD" or ""
  endDate: string;
  colorPrimary: string;
  colorSecondary: string;
  colorBackground: string;
  colorText: string;
  colorButton: string;
  headerStyle: "DEFAULT" | "TINTED" | "BORDERED";
  announcementEnabled: boolean;
  announcementText: string;
  bannerImage: string;
  bannerHeading: string;
  bannerSubheading: string;
  bannerLink: string;
  decorations: string[];
  displayOrder: number;
};
export type ThemesData = { themes: AdminTheme[]; override: string };

const DECOR = ["snow", "hearts", "sparkles", "confetti"] as const;

export async function getAdminThemes(): Promise<ThemesData> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();
  const [rows, settings] = await Promise.all([
    prisma.theme.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.storeSettings.findUnique({ where: { id: "default" } }),
  ]);
  return {
    override: settings?.overrideTheme ?? "auto",
    themes: rows.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      active: t.active,
      autoActivate: t.autoActivate,
      startDate: t.startDate ?? "",
      endDate: t.endDate ?? "",
      colorPrimary: t.colorPrimary ?? "",
      colorSecondary: t.colorSecondary ?? "",
      colorBackground: t.colorBackground ?? "",
      colorText: t.colorText ?? "",
      colorButton: t.colorButton ?? "",
      headerStyle: t.headerStyle,
      announcementEnabled: t.announcementEnabled,
      announcementText: t.announcementText ?? "",
      bannerImage: t.bannerImage ?? "",
      bannerHeading: t.bannerHeading ?? "",
      bannerSubheading: t.bannerSubheading ?? "",
      bannerLink: t.bannerLink ?? "",
      decorations: Array.isArray(t.decorations) ? t.decorations.filter((d): d is string => typeof d === "string") : [],
      displayOrder: t.displayOrder,
    })),
  };
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const localOrHttps = (v: string) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://");
const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Colors must look like #1A1A1A.");
const mmdd = z.string().trim().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Dates must use MM-DD, e.g. 12-01.").or(z.literal(""));

const schema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Theme name is required.").max(60),
  active: z.boolean(),
  autoActivate: z.boolean(),
  startDate: mmdd,
  endDate: mmdd,
  colorPrimary: hex,
  colorSecondary: hex,
  colorBackground: hex,
  colorText: hex,
  colorButton: hex,
  headerStyle: z.enum(["DEFAULT", "TINTED", "BORDERED"]),
  announcementEnabled: z.boolean(),
  announcementText: z.string().trim().max(200),
  bannerImage: z.string().trim().max(2000).refine(localOrHttps, "Image links must start with / or https://"),
  bannerHeading: z.string().trim().max(120),
  bannerSubheading: z.string().trim().max(200),
  bannerLink: z.string().trim().max(500).refine(localOrHttps, "Links must start with / or https://"),
  decorations: z.array(z.enum(DECOR)).max(4),
  displayOrder: z.number().int().min(0).max(100000),
});

export async function saveTheme(raw: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { id, ...d } = parsed.data;

  if (d.autoActivate && (!d.startDate || !d.endDate)) {
    return { ok: false, error: "Automatic activation needs both a start and an end date." };
  }
  if (d.announcementEnabled && !d.announcementText) {
    return { ok: false, error: "Write the announcement text, or switch the announcement bar off." };
  }

  const data = {
    name: d.name,
    active: d.active,
    autoActivate: d.autoActivate,
    startDate: d.startDate || null,
    endDate: d.endDate || null,
    colorPrimary: d.colorPrimary.toUpperCase(),
    colorSecondary: d.colorSecondary.toUpperCase(),
    colorBackground: d.colorBackground.toUpperCase(),
    colorText: d.colorText.toUpperCase(),
    colorButton: d.colorButton.toUpperCase(),
    headerStyle: d.headerStyle,
    announcementEnabled: d.announcementEnabled,
    announcementText: d.announcementText || null,
    bannerImage: d.bannerImage || null,
    bannerHeading: d.bannerHeading || null,
    bannerSubheading: d.bannerSubheading || null,
    bannerLink: d.bannerLink || null,
    decorations: d.decorations,
    displayOrder: d.displayOrder,
  };

  try {
    if (id) {
      // The slug is how the store remembers a manual choice, so it never changes after creation.
      await prisma.theme.update({ where: { id }, data });
    } else {
      const base = slugify(d.name) || "theme";
      const taken = new Set((await prisma.theme.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((t) => t.slug));
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      await prisma.theme.create({ data: { ...data, slug } });
    }
  } catch (e) {
    console.error("[admin-themes] save failed:", e);
    return { ok: false, error: "Could not save the theme. Please try again." };
  }
  return { ok: true };
}

export async function deleteTheme(id: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (typeof id !== "string" || !id) return { ok: false, error: "Theme not found." };
  const t = await prisma.theme.findUnique({ where: { id }, select: { slug: true } });
  if (!t) return { ok: false, error: "Theme not found." };
  if (t.slug === "default") return { ok: false, error: 'The "default" theme is the store\'s fallback and can\'t be deleted. Edit it instead.' };

  await prisma.$transaction([
    prisma.theme.delete({ where: { id } }),
    // If it was the manually chosen theme, go back to the automatic schedule.
    prisma.storeSettings.updateMany({ where: { id: "default", overrideTheme: t.slug }, data: { overrideTheme: "auto" } }),
  ]);
  return { ok: true };
}

/** "auto" follows the date schedule; otherwise the slug of an active theme. */
export async function setThemeOverride(value: unknown): Promise<AdminResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (typeof value !== "string" || !value || value.length > 100) return { ok: false, error: "Invalid theme." };
  if (value !== "auto" && !(await prisma.theme.findFirst({ where: { slug: value, active: true }, select: { id: true } }))) {
    return { ok: false, error: "That theme doesn't exist or isn't active." };
  }
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: { overrideTheme: value },
    create: { id: "default", overrideTheme: value },
  });
  return { ok: true };
}
