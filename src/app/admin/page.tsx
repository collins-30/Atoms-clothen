import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Package, Layers, AlertTriangle, ReceiptText } from "lucide-react";
import OrderStatusBadge, { ORDER_STATUS_LABELS } from "@/components/account/OrderStatusBadge";
import { fmtMoney, ORDER_STATUSES } from "@/lib/admin-format";
import { getDashboardStats } from "@/server/admin-stats";

// Replaces AdminHome.jsx. A server component: it reads the database directly,
// so there is no loading state or useEffect.
async function DashboardContent() {
  const { published, variants, lowStock, orders, byStatus, revenue, recent } = await getDashboardStats();

  const stats = [
    { label: "Published products", value: published, icon: Package },
    { label: "Variants tracked", value: variants, icon: Layers },
    { label: "Low stock (<5)", value: lowStock, icon: AlertTriangle },
    { label: "Orders", value: orders, icon: ReceiptText },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-stone-200 p-5">
            <s.icon className="w-4 h-4 text-stone-400 mb-3" />
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">{s.label}</p>
            <p className="text-3xl font-semibold text-[#1a1a1a] mt-1" style={{ fontFamily: "var(--font-heading)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mt-10">
        <div className="border border-stone-200 p-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-5">Orders by status</h2>
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((s) => (
              <span
                key={s}
                className={`text-xs px-3 py-1.5 border ${byStatus[s] ? "border-stone-300 text-[#1a1a1a]" : "border-stone-100 text-stone-300"}`}
              >
                {ORDER_STATUS_LABELS[s]} · {byStatus[s] ?? 0}
              </span>
            ))}
          </div>

          <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mt-8 mb-3">Revenue (paid)</h2>
          <div className="flex flex-wrap gap-6">
            {revenue.map((r) => (
              <p key={r.symbol} className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
                {fmtMoney(r.total, r.symbol)}
              </p>
            ))}
            {revenue.length === 0 && <p className="text-sm text-stone-400">No paid orders yet.</p>}
          </div>
        </div>

        <div className="border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]">Recent orders</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-[#1a1a1a]">
              All orders <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-stone-400">No orders yet.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a]">{o.orderNumber}</p>
                    <p className="text-xs text-stone-500 truncate">{o.email ?? "—"}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <span className="text-sm text-[#1a1a1a] w-24 text-right">{fmtMoney(o.total, o.symbol)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminHome() {
  return (
    <Suspense fallback={<div className="h-64 border border-stone-100 animate-pulse" />}>
      <DashboardContent />
    </Suspense>
  );
}