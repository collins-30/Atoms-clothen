"use client";

import { useState } from "react";
import { ReceiptText, CircleDollarSign, TrendingUp, XCircle } from "lucide-react";
import { RevenueTrend, StatusBars, TopProducts } from "@/components/admin/OrderAnalysisCharts";
import { fmtMoney } from "@/lib/admin-format";
import type { CurrencyAnalysis } from "@/server/admin-stats";

// The page's interactive part: only the currency switcher needs the browser.
export default function AnalysisView({ data }: { data: CurrencyAnalysis[] }) {
  const [symbol, setSymbol] = useState(data[0]?.symbol ?? "$");
  const current = data.find((d) => d.symbol === symbol) ?? data[0];
  if (!current) return null;

  const stats = [
    { label: "Orders", value: String(current.orders), icon: ReceiptText },
    { label: `Revenue (paid) ${current.symbol}`, value: fmtMoney(current.revenue, current.symbol), icon: CircleDollarSign },
    { label: "Avg order value", value: fmtMoney(current.aov, current.symbol), icon: TrendingUp },
    { label: "Cancelled / refunded", value: `${current.lost} · ${current.lostRate}%`, icon: XCircle },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
          Order Analysis
        </h1>
        {data.length > 1 && (
          <div className="flex gap-2">
            {data.map((d) => (
              <button
                key={d.symbol}
                onClick={() => setSymbol(d.symbol)}
                className={`text-xs px-3 py-1.5 border transition-colors ${
                  d.symbol === current.symbol ? "border-[#1a1a1a] text-[#1a1a1a]" : "border-stone-200 text-stone-400 hover:text-[#1a1a1a]"
                }`}
              >
                {d.symbol}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {stats.map((s) => (
          <div key={s.label} className="border border-stone-200 p-5">
            <s.icon className="w-4 h-4 text-stone-400 mb-3" />
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">{s.label}</p>
            <p className="text-2xl font-semibold text-[#1a1a1a] mt-1 truncate" style={{ fontFamily: "var(--font-heading)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        <RevenueTrend trend={current.trend} symbol={current.symbol} paidOrders={current.paidOrders} />
        <StatusBars counts={current.statusCounts} />
      </div>

      <div className="mt-8">
        <TopProducts rows={current.topProducts} symbol={current.symbol} />
      </div>
    </div>
  );
}
