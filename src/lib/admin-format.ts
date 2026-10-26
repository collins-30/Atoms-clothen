import type { OrderStatus } from "@prisma/client";

// Plain helpers (no "use client") so BOTH server pages and client components can
// import them. A function exported from a client component can't be called from
// a server component, which is why these don't live next to the charts.

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

// Fixed "en-US" (Base44 used the browser default) so the server and the browser
// always print the same text and React never reports a hydration mismatch.
export const fmtMoney = (n: number, symbol?: string | null) =>
  `${symbol ?? ""}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
