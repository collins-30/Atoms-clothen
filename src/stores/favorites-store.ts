import { create } from "zustand";
import { persist } from "zustand/middleware";

type FavoritesState = {
  slugs: string[];
  toggle: (slug: string) => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      slugs: [],
      toggle: (slug) =>
        set((s) => ({
          slugs: s.slugs.includes(slug) ? s.slugs.filter((x) => x !== slug) : [...s.slugs, slug],
        })),
    }),
    { name: "JAMAS_wishlist", partialize: (s) => ({ slugs: s.slugs }), skipHydration: true },
  ),
);
