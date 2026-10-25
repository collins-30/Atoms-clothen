import { prisma } from "@/lib/db";
import { DECORATION_KINDS, pickActiveTheme, type DecorationKind, type StoreTheme } from "@/lib/theme";

// For server components (the store layout). Not a server action, so a browser
// can't call it.
export async function getActiveTheme(): Promise<StoreTheme> {
  const [rows, settings] = await Promise.all([
    prisma.theme.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.storeSettings.findUnique({ where: { id: "default" } }),
  ]);

  const themes = rows.map((t) => ({
    slug: t.slug,
    name: t.name,
    active: t.active,
    autoActivate: t.autoActivate,
    startDate: t.startDate,
    endDate: t.endDate,
    colorPrimary: t.colorPrimary,
    colorSecondary: t.colorSecondary,
    colorBackground: t.colorBackground,
    colorText: t.colorText,
    colorButton: t.colorButton,
    headerStyle: t.headerStyle.toLowerCase() as StoreTheme["headerStyle"],
    announcementEnabled: t.announcementEnabled,
    announcementText: t.announcementText,
    bannerImage: t.bannerImage,
    bannerHeading: t.bannerHeading,
    bannerSubheading: t.bannerSubheading,
    bannerLink: t.bannerLink,
    // Json column: keep only the kinds we know how to draw.
    decorations: (Array.isArray(t.decorations) ? t.decorations : []).filter(
      (d): d is DecorationKind => typeof d === "string" && (DECORATION_KINDS as string[]).includes(d),
    ),
  }));

  return pickActiveTheme(themes, settings?.overrideTheme ?? "auto", new Date(), process.env.STORE_TIMEZONE || "UTC");
}
