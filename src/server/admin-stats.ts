// Read-only numbers for the admin dashboard and the analysis page.
// No "use server" on purpose: these are only imported by server pages, so they
// are never exposed as endpoints. They still re-check the admin role themselves.

import type { OrderStatus } from "@prisma/client";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/admin-format";

const num = (d: { toNumber(): number } | null | undefined) => (d ? d.toNumber() : 0);

// ───────────── Dashboard (replaces AdminHome's three list() calls) ─────────────

export type DashboardStats = {
  published: number;
  variants: number;
  lowStock: number;
  orders: number;
  byStatus: Partial<Record<OrderStatus, number>>;
  revenue: { symbol: string; total: number }[];
  recent: {
    id: string;
    orderNumber: string;
    email: string | null;
    status: OrderStatus;
    total: number;
    symbol: string;
  }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();

  // The database does the counting, so this stays fast with thousands of orders
  // (Base44 downloaded up to 700 records into the browser to count them).
  const [published, variants, lowStock, orders, statusGroups, revenueGroups, recent] = await Promise.all([
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.productVariant.count(),
    prisma.productVariant.count({ where: { stock: { lt: 5 } } }),
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.groupBy({ by: ["currencySymbol"], where: { paymentStatus: "PAID" }, _sum: { total: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        currencySymbol: true,
        shipEmail: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const byStatus: Partial<Record<OrderStatus, number>> = {};
  for (const g of statusGroups) byStatus[g.status] = g._count._all;

  return {
    published,
    variants,
    lowStock,
    orders,
    byStatus,
    revenue: revenueGroups.map((g) => ({ symbol: g.currencySymbol, total: num(g._sum.total) })),
    recent: recent.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      email: o.shipEmail || o.user?.email || null,
      status: o.status,
      total: num(o.total),
      symbol: o.currencySymbol,
    })),
  };
}

// ───────────── Analysis (replaces AdminAnalysis + the chart maths) ─────────────

export type CurrencyAnalysis = {
  symbol: string;
  orders: number;
  paidOrders: number;
  revenue: number;
  aov: number;
  lost: number; // cancelled + refunded
  lostRate: number; // % of orders
  trend: { month: string; revenue: number }[]; // last 12 months, paid orders
  statusCounts: Record<OrderStatus, number>;
  topProducts: { name: string; units: number; revenue: number }[];
};

type AnalysisOrder = {
  createdAt: Date;
  total: { toNumber(): number };
  status: OrderStatus;
  paymentStatus: string;
  items: { slug: string; name: string; qty: number; price: { toNumber(): number } }[];
};

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

function analyse(symbol: string, list: AnalysisOrder[], months: { key: string; label: string }[]): CurrencyAnalysis {
  const paid = list.filter((o) => o.paymentStatus === "PAID");
  const revenue = paid.reduce((a, o) => a + num(o.total), 0);

  const perMonth = new Map<string, number>();
  for (const o of paid) perMonth.set(monthKey(o.createdAt), (perMonth.get(monthKey(o.createdAt)) ?? 0) + num(o.total));

  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const o of list) statusCounts[o.status] += 1;

  const products = new Map<string, { name: string; units: number; revenue: number }>();
  for (const o of paid) {
    for (const it of o.items) {
      const key = it.slug || it.name;
      const row = products.get(key) ?? { name: it.name, units: 0, revenue: 0 };
      row.units += it.qty;
      row.revenue += num(it.price) * it.qty;
      products.set(key, row);
    }
  }

  const lost = statusCounts.CANCELLED + statusCounts.REFUNDED;
  return {
    symbol,
    orders: list.length,
    paidOrders: paid.length,
    revenue,
    aov: paid.length ? revenue / paid.length : 0,
    lost,
    lostRate: list.length ? Math.round((lost / list.length) * 100) : 0,
    trend: months.map((m) => ({ month: m.label, revenue: +(perMonth.get(m.key) ?? 0).toFixed(2) })),
    statusCounts,
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  };
}

/** One entry per currency symbol, most-used currency first. Looks at the latest 2,000 orders. */
export async function getOrderAnalysis(): Promise<CurrencyAnalysis[]> {
  await connection(); // read request data first: required before crypto/random in Next 16
  await requireAdmin();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      createdAt: true,
      total: true,
      status: true,
      paymentStatus: true,
      currencySymbol: true,
      items: { select: { slug: true, name: true, qty: true, price: true } },
    },
  });

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1));
    return {
      key: monthKey(d),
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
    };
  });

  const bySymbol = new Map<string, AnalysisOrder[]>();
  for (const o of orders) {
    const list = bySymbol.get(o.currencySymbol) ?? [];
    list.push(o);
    bySymbol.set(o.currencySymbol, list);
  }
  if (bySymbol.size === 0) bySymbol.set("$", []);

  return [...bySymbol.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([symbol, list]) => analyse(symbol, list, months));
}