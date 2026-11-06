// Plain, JSON-safe shapes sent from the server to storefront components.
// (No Prisma types here: Decimal and Date can't cross to client components.)

import type { NightShot, StoreMedia, VideoSource } from "@/lib/media";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  gender: "men" | "women" | "unisex"; // lowercase so it matches ?gender=women in URLs
  categorySlug: string | null;
  images: string[];
  /** Photos and model videos in display order. */
  media: StoreMedia[];
  /** Set when the admin chose "model video" for the card and the product has one. */
  cardVideo: VideoSource | null;
  /** The first model video (for the editorial section), or null. */
  video: VideoSource | null;
  /** Show in the large editorial video section on the home page. */
  editorial: boolean;
  /** Shown on the card when the shop's Night Mode is on (null: the photo is dimmed instead). */
  nightShot: NightShot | null;
  categoryName: string | null;
  colors: { name: string; hex: string }[];
  sizes: string[];
  tags: string[];
  collection: string | null;
  isNew: boolean;
  isBestseller: boolean;
  isTrending: boolean;
  featured: boolean;
  inStock: boolean; // at least one variant has stock
  createdAt: string; // ISO date
};

export type Catalog = {
  products: StoreProduct[];
  /** product slug -> price in the requested market (only products sold there) */
  priceMap: Record<string, number>;
};

export type StoreBanner = {
  id: string;
  type: "hero" | "promo" | "craft";
  title: string;
  subtitle: string | null;
  image: string | null;
  /** Muted, looping background video (image is its poster). */
  video: string | null;
  buttonText: string | null;
  link: string | null;
};
