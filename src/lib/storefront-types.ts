// Plain, JSON-safe shapes sent from the server to storefront components.
// (No Prisma types here: Decimal and Date can't cross to client components.)

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  gender: "men" | "women" | "unisex"; // lowercase so it matches ?gender=women in URLs
  categorySlug: string | null;
  images: string[];
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
  buttonText: string | null;
  link: string | null;
};
