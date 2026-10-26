"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OrderStatusBadge, { ORDER_STATUS_LABELS } from "@/components/account/OrderStatusBadge";
import StatusTimeline from "@/components/account/StatusTimeline";
import { fmtMoney, ORDER_STATUSES } from "@/lib/admin-format";
import { updateOrderStatus } from "@/server/admin-orders";
import { saveOrderTracking, type AdminOrder } from "@/server/admin-orders-data";

type Notice = { tone: "ok" | "error"; text: string } | null;

const fieldCls =
  "h-9 px-3 text-sm bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a]";

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: OrderStatus;
  onChange: (s: OrderStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      className="h-8 w-[130px] px-2 text-xs bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a] disabled:opacity-50"
      aria-label="Order status"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role="status"
      className={`text-sm px-4 py-3 border ${
        notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"
      }`}
    >
      {notice.text}
    </p>
  );
}

// Tracking number + carrier. Save these BEFORE moving an order to "Shipped".
function TrackingForm({ order, onSaved }: { order: AdminOrder; onSaved: (n: Notice) => void }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [saving, setSaving] = useState(false);
  const unchanged = carrier.trim() === (order.carrier ?? "") && tracking.trim() === (order.trackingNumber ?? "");

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveOrderTracking({ orderId: order.id, carrier, trackingNumber: tracking });
      if (res.ok) {
        onSaved({ tone: "ok", text: "Tracking details saved." });
        router.refresh();
      } else {
        onSaved({ tone: "error", text: res.error });
      }
    } catch {
      onSaved({ tone: "error", text: "Could not save tracking details. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-2">Tracking</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier (DHL…)" maxLength={80} className={fieldCls} aria-label="Carrier" />
        <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" maxLength={120} className={fieldCls} aria-label="Tracking number" />
      </div>
      <button
        onClick={save}
        disabled={saving || unchanged}
        className="mt-2 h-9 px-5 text-xs tracking-[0.15em] uppercase border border-stone-300 hover:border-[#1a1a1a] disabled:opacity-40 disabled:hover:border-stone-300 inline-flex items-center gap-2"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save tracking
      </button>
    </div>
  );
}

function OrderDetail({
  order,
  busy,
  onStatus,
}: {
  order: AdminOrder;
  busy: boolean;
  onStatus: (o: AdminOrder, s: OrderStatus) => void;
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const money = (n: number) => fmtMoney(n, order.currencySymbol);

  return (
    <div className="space-y-4">
      <NoticeBar notice={notice} />
      {order.notes && (
        <p className="text-sm px-4 py-3 border border-amber-200 bg-amber-50 text-amber-900 whitespace-pre-line">{order.notes}</p>
      )}
      <div className="grid sm:grid-cols-2 gap-8">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-3">Items</p>
          <div className="divide-y divide-stone-100 border-y border-stone-100">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-3 py-2.5 text-sm">
                <span className="text-[#1a1a1a]">
                  {it.name}{" "}
                  <span className="text-stone-400">
                    × {it.qty}
                    {(it.color || it.size) && ` · ${[it.color, it.size].filter(Boolean).join("/")}`}
                  </span>
                </span>
                <span>{money(it.price * it.qty)}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mt-6 mb-2">Ship to</p>
          <div className="text-sm text-stone-600 leading-relaxed">
            {order.shipTo.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mt-6 mb-2">Customer</p>
          <div className="text-sm text-stone-600">
            <p>{order.customerEmail ?? "—"}</p>
            {order.customerPhone && <p>{order.customerPhone}</p>}
            <p className="mt-1">
              Payment:{" "}
              <span className={order.paymentStatus === "PAID" ? "text-emerald-800" : "text-stone-400"}>
                {order.paymentStatus.toLowerCase()}
              </span>
            </p>
          </div>
        </div>

        <div>
          <StatusTimeline order={order} />
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{money(order.subtotal)}</span></div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-500">Discount{order.discountCode ? ` (${order.discountCode})` : ""}</span>
                <span>-{money(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-stone-500">Shipping</span><span>{order.shipping ? money(order.shipping) : "Free"}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Tax</span><span>{money(order.tax)}</span></div>
            <div className="flex justify-between pt-2 border-t border-stone-200 font-medium"><span>Total</span><span>{money(order.total)}</span></div>
          </div>

          <div className="mt-6 space-y-6">
            <TrackingForm key={`${order.carrier}|${order.trackingNumber}`} order={order} onSaved={setNotice} />
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-2">Update status</p>
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              ) : (
                <StatusSelect value={order.status} onChange={(s) => onStatus(order, s)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersView({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // Replaces base44.functions.invoke("notifyOrderStatus"): the server action
  // changes the status, restocks on cancel and emails the customer.
  const changeStatus = async (order: AdminOrder, status: OrderStatus) => {
    if (status === order.status) return;
    setBusyId(order.id);
    setNotice(null);
    try {
      const res = await updateOrderStatus(order.id, status);
      if (!res.ok) {
        setNotice({ tone: "error", text: `Could not update ${order.orderNumber}: ${res.error}` });
      } else {
        const email = res.emailSent
          ? "Customer notified by email."
          : res.emailError
            ? "Status saved, but the customer email failed."
            : "No email on the order — customer was not notified.";
        setNotice({ tone: res.emailError ? "error" : "ok", text: `${order.orderNumber} → ${ORDER_STATUS_LABELS[status]}. ${email}` });
        router.refresh(); // reload the list from the server
      }
    } catch {
      setNotice({ tone: "error", text: "Could not update the status. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const counts = orders.reduce<Partial<Record<OrderStatus, number>>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const needle = q.trim().toLowerCase();
  const visible = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (needle && !`${o.orderNumber} ${o.customerEmail ?? ""}`.toLowerCase().includes(needle)) return false;
    return true;
  });

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto flex-1">
          {(["all", ...ORDER_STATUSES] as const).map((f) => {
            const count = f === "all" ? orders.length : (counts[f] ?? 0);
            if (f !== "all" && count === 0) return null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase whitespace-nowrap border transition-colors ${
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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order # or customer…"
          className="h-9 px-3 text-sm bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a] md:w-64"
          aria-label="Search orders"
        />
      </div>

      {notice && (
        <div className="mb-4">
          <NoticeBar notice={notice} />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="border border-stone-200 py-16 text-center">
          <p className="text-sm text-stone-400">{orders.length === 0 ? "No orders yet." : "No matching orders."}</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-200 border-t border-stone-200">
          {visible.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 py-4">
              <button onClick={() => setSelectedId(o.id)} className="text-left min-w-[150px]">
                <p className="text-sm font-medium text-[#1a1a1a] hover:underline">{o.orderNumber}</p>
                <p className="text-xs text-stone-500">{o.createdLabel}</p>
              </button>
              <p className="text-xs text-stone-500 flex-1 min-w-[160px] truncate">{o.customerEmail ?? "—"}</p>
              <span className="text-sm text-[#1a1a1a] w-28 text-right">{fmtMoney(o.total, o.currencySymbol)}</span>
              <span className={`text-[10px] tracking-[0.15em] uppercase ${o.paymentStatus === "PAID" ? "text-emerald-800" : "text-stone-400"}`}>
                {o.paymentStatus.toLowerCase()}
              </span>
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={o.status} />
                {busyId === o.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                ) : (
                  <StatusSelect value={o.status} onChange={(s) => changeStatus(o, s)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-none bg-[#F9F9F7]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
                  {selected.orderNumber}
                  <span className="ml-3 align-middle">
                    <OrderStatusBadge status={selected.status} />
                  </span>
                </DialogTitle>
              </DialogHeader>
              <OrderDetail key={selected.id} order={selected} busy={busyId === selected.id} onStatus={changeStatus} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
