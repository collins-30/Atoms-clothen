import type { OrderStatus } from "@prisma/client";

const STYLES: Record<OrderStatus, string> = {
  PENDING: "text-stone-600 bg-stone-100",
  CONFIRMED: "text-stone-800 bg-stone-200",
  PROCESSING: "text-amber-800 bg-amber-50",
  SHIPPED: "text-sky-900 bg-sky-50",
  DELIVERED: "text-emerald-900 bg-emerald-50",
  CANCELLED: "text-rose-900 bg-rose-50",
  REFUNDED: "text-stone-500 bg-stone-100",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

// Works in server and client components (no hooks).
export default function OrderStatusBadge({ status, className = "" }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[10px] tracking-[0.15em] uppercase whitespace-nowrap ${STYLES[status] ?? STYLES.PENDING} ${className}`}
    >
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
