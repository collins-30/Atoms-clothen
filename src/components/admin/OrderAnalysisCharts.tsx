"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/components/account/OrderStatusBadge";
import { fmtMoney, ORDER_STATUSES } from "@/lib/admin-format";
import type { CurrencyAnalysis } from "@/server/admin-stats";

const PALETTE = ["#1a1a1a", "#57534e", "#78716c", "#a8a29e", "#d6d3d1"];
const TOOLTIP_STYLE = { fontSize: 12, border: "1px solid #e7e5e4", borderRadius: 0 };
const AXIS_TICK = { fontSize: 10, fill: "#a8a29e" };

// The month-by-month sums are now worked out on the server (admin-stats.ts), so
// these components only draw. That also removes the `moment` dependency.

export function RevenueTrend({ trend, symbol, paidOrders }: { trend: CurrencyAnalysis["trend"]; symbol: string; paidOrders: number }) {
  return (
    <div className="border border-stone-200 p-6">
      <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-5">Revenue — last 12 months (paid)</h2>
      {paidOrders === 0 ? (
        <p className="text-sm text-stone-400">No paid orders in this currency yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={55} />
            <Tooltip formatter={(v) => [fmtMoney(Number(v), symbol), "Revenue"]} contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="revenue" stroke="#1a1a1a" fill="#1a1a1a" fillOpacity={0.07} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function StatusBars({ counts }: { counts: Record<OrderStatus, number> }) {
  const data = ORDER_STATUSES.map((s) => ({ status: ORDER_STATUS_LABELS[s], count: counts[s] ?? 0 }));
  return (
    <div className="border border-stone-200 p-6">
      <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-5">Orders by status</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <XAxis dataKey="status" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} interval={0} angle={-35} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={45} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count">
            {data.map((d, i) => (
              <Cell key={d.status} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProducts({ rows, symbol }: { rows: CurrencyAnalysis["topProducts"]; symbol: string }) {
  return (
    <div className="border border-stone-200 p-6">
      <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-5">Top products (paid)</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-400">No sales yet.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {rows.map((r, i) => (
            <div key={`${r.name}-${i}`} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] text-stone-400 w-5">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm font-medium text-[#1a1a1a] truncate">{r.name}</p>
              </div>
              <p className="text-xs text-stone-500 shrink-0">{r.units} sold</p>
              <p className="text-sm text-[#1a1a1a] w-28 text-right shrink-0">{fmtMoney(r.revenue, symbol)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
