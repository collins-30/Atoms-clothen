import type { OrderStatus } from "@prisma/client";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "PENDING", label: "Order placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

type TimelineOrder = {
  status: OrderStatus;
  createdAt: Date | string;
  carrier?: string | null;
  trackingNumber?: string | null;
};

// Replaces StatusTimeline.jsx. Field names follow the Prisma Order model
// (createdAt, trackingNumber) instead of Base44's created_date / tracking_number.
export default function StatusTimeline({ order }: { order: TimelineOrder }) {
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return (
      <div className="border border-stone-200 p-4 text-sm text-stone-600">
        {order.status === "CANCELLED"
          ? "This order was cancelled — no further updates are expected."
          : "A refund has been issued to your original payment method."}
      </div>
    );
  }

  const idx = STEPS.findIndex((s) => s.key === order.status);
  const placed = new Date(order.createdAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <ol>
      {STEPS.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
            {i < STEPS.length - 1 && (
              <span className={`absolute left-[7px] top-5 bottom-0 w-px ${i < idx ? "bg-stone-800" : "bg-stone-200"}`} />
            )}
            <span
              className={`relative z-10 mt-0.5 w-[15px] h-[15px] shrink-0 rounded-full border flex items-center justify-center ${
                done ? "bg-[#1a1a1a] border-[#1a1a1a]" : "bg-[#F9F9F7] border-stone-300"
              }`}
            >
              {done && <span className="w-1.5 h-1.5 bg-[#F9F9F7] rounded-full" />}
            </span>
            <div className="min-w-0">
              <p className={`text-sm ${done ? "text-[#1a1a1a] font-medium" : "text-stone-400"}`}>{s.label}</p>
              {i === 0 && <p className="text-xs text-stone-500 mt-1">{placed}</p>}
              {current && s.key === "SHIPPED" && (order.carrier || order.trackingNumber) && (
                <p className="text-xs text-stone-500 mt-1">
                  {[order.carrier, order.trackingNumber].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
