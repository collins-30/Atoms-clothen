import { create } from "zustand";
import { persist } from "zustand/middleware";

// Max per line. Matches the limit enforced by the server (checkout validator).
export const MAX_QTY = 20;

export type CartItem = {
  id: string; // `${productSlug}-${color}-${size}`
  productSlug: string;
  name: string;
  image?: string;
  color: string;
  size: string;
  sku?: string;
  qty: number;
  // Display only: the server re-prices every item from the database at checkout.
  price: number;
};

export type NewCartItem = Omit<CartItem, "id" | "qty"> & { qty?: number };

type CartState = {
  items: CartItem[];
  open: boolean;
  add: (item: NewCartItem) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

const clampQty = (n: number) => Math.min(MAX_QTY, Math.max(1, Math.floor(n) || 1));

// skipHydration: the server render has no localStorage, so the provider loads
// the saved bag right after mount. This avoids React hydration mismatches.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item) =>
        set((s) => {
          const id = `${item.productSlug}-${item.color}-${item.size}`;
          const addQty = item.qty ?? 1;
          const existing = s.items.find((i) => i.id === id);
          const items = existing
            ? s.items.map((i) => (i.id === id ? { ...i, qty: clampQty(i.qty + addQty) } : i))
            : [...s.items, { ...item, id, qty: clampQty(addQty) }];
          return { items, open: true };
        }),
      setQty: (id, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty: clampQty(qty) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: "JAMAS_cart", partialize: (s) => ({ items: s.items }), skipHydration: true },
  ),
);
