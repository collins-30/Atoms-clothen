import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import { PLACED_ORDERS, fmtDate, fmtMoney, itemsSummary, requireUserId } from "@/server/account-data";

export const metadata: Metadata = { title: "My account" };

export default async function AccountOverviewPage() {
  const userId = await requireUserId("/account");

  const [counts, recent] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: { userId, ...PLACED_ORDERS }, _count: { _all: true } }),
    prisma.order.findMany({
      where: { userId, ...PLACED_ORDERS },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        total: true,
        currencySymbol: true,
        status: true,
        items: { select: { name: true }, orderBy: { id: "asc" } },
      },
    }),
  ]);

  const by = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);
  const inTransit = by("CONFIRMED") + by("PROCESSING") + by("SHIPPED");
  const stats = [
    { label: "Total orders", value: total },
    { label: "In transit", value: inTransit },
    { label: "Delivered", value: by("DELIVERED") },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 md:gap-8 border-y border-stone-200 py-6">
        {stats.map((s, i) => (
          <div key={s.label} className={i > 0 ? "border-l border-stone-200 pl-4 md:pl-8" : ""}>
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">{s.label}</p>
            <p className="text-2xl md:text-3xl font-semibold text-[#1a1a1a] mt-1" style={{ fontFamily: "var(--font-heading)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]">Recent orders</h2>
          {total > 0 && (
            <Link href="/account/orders" className="inline-flex items-center gap-1 text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-[#1a1a1a]">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="border border-stone-200 py-16 text-center">
            <p className="text-stone-500 mb-6">Your orders will appear here once you place your first one.</p>
            <Link href="/shop" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase border border-[#1a1a1a] px-6 py-3 text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#F9F9F7] transition-colors">
              Continue shopping <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-200 border-t border-stone-200">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between gap-4 py-4 hover:bg-stone-50 transition-colors px-2 -mx-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a]">{o.orderNumber}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {fmtDate(o.createdAt)} · {itemsSummary(o.items)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm text-[#1a1a1a] hidden sm:block">{fmtMoney(o.total, o.currencySymbol)}</span>
                  <OrderStatusBadge status={o.status} />
                  <ChevronRight className="w-4 h-4 text-stone-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 border-t border-stone-200 pt-8">
        <Link href="/account/details" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-[#1a1a1a]">
          Manage personal details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
