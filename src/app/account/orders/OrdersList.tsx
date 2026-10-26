"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import OrderStatusBadge, { ORDER_STATUS_LABELS } from "@/components/account/OrderStatusBadge";

export type OrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  dateLabel: string;
  totalLabel: string;
  summary: string;
};

type Filter = "all" | OrderStatus;
const FILTERS: Filter[] = ["all", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function OrdersList({ orders }: { orders: OrderRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = orders.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});
  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {FILTERS.map((f) => {
          const count = f === "all" ? orders.length : (counts[f] ?? 0);
          if (f !== "all" && count === 0) return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[10px] tracking-[0.15em] uppercase whitespace-nowrap border transition-colors ${
                filter === f
                  ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#F9F9F7]"
                  : "border-stone-200 text-stone-500 hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
              }`}
            >
              {f === "all" ? "All" : ORDER_STATUS_LABELS[f]} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="border border-stone-200 py-16 text-center mt-8">
          <p className="text-stone-500 mb-6">
            {orders.length === 0
              ? "You have no orders yet."
              : `You have no ${filter === "all" ? "" : ORDER_STATUS_LABELS[filter].toLowerCase()} orders.`}
          </p>
          <Link href="/shop" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase border border-[#1a1a1a] px-6 py-3 text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#F9F9F7] transition-colors">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-stone-200 border-t border-stone-200 mt-8">
          {visible.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="flex flex-wrap items-center justify-between gap-3 py-5 px-2 -mx-2 hover:bg-stone-50 transition-colors"
            >
              <div className="min-w-[140px]">
                <p className="text-sm font-medium text-[#1a1a1a]">{o.orderNumber}</p>
                <p className="text-xs text-stone-500 mt-0.5">{o.dateLabel}</p>
              </div>
              <p className="text-sm text-stone-600 flex-1 min-w-[180px] truncate">{o.summary}</p>
              <span className="text-sm text-[#1a1a1a]">{o.totalLabel}</span>
              <div className="flex items-center gap-4">
                <OrderStatusBadge status={o.status} />
                <ChevronRight className="w-4 h-4 text-stone-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
