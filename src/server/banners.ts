import { prisma } from "@/lib/db";
import type { StoreBanner } from "@/lib/storefront-types";

// For server components (like the home page). Not a server action, so it
// can't be called from a browser.
export async function getActiveBanners(): Promise<StoreBanner[]> {
  const rows = await prisma.banner.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
    take: 50,
  });
  return rows.map((b) => ({
    id: b.id,
    type: b.type === "HERO" ? "hero" : b.type === "CRAFT" ? "craft" : "promo",
    title: b.title,
    subtitle: b.subtitle,
    image: b.image,
    buttonText: b.buttonText,
    link: b.link,
  }));
}
