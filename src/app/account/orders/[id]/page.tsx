import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import StatusTimeline from "@/components/account/StatusTimeline";
import { PLACED_ORDERS, fmtDate, fmtMoney, requireUserId } from "@/server/account-data";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderDetailPage({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const userId = await requireUserId(`/account/orders/${id}`);

  // Filtering by userId means nobody can open someone else's order by guessing its id.
  const order = await prisma.order.findFirst({
    where: { id, userId, ...PLACED_ORDERS },
    include: { items: { orderBy: { id: "asc" } } },
  });

  if (!order) {
    return (
      <div className="border border-stone-200 py-16 text-center">
        <p className="text-stone-500 mb-6">We couldn&apos;t find this order.</p>
        <Link href="/account/orders" className="text-xs tracking-[0.15em] uppercase border border-[#1a1a1a] px-6 py-3 text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#F9F9F7] transition-colors">
          Back to orders
        </Link>
      </div>
    );
  }

  const money = (n: unknown) => fmtMoney(n, order.currencySymbol);
  const shippingCost = Number(order.shipping);

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-[#1a1a1a] mb-8">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center gap-4 pb-8 border-b border-stone-200">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
            {order.orderNumber}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Placed {fmtDate(order.createdAt, "long")} · {order.marketCode} market
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <span className="text-[10px] tracking-[0.15em] uppercase text-stone-500">
            {order.paymentStatus === "PAID" ? "Paid" : order.paymentStatus === "REFUNDED" ? "Refunded" : "Payment pending"}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-10 lg:gap-16 mt-10">
        <div>
          <h3 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-6">Items</h3>
          <div className="divide-y divide-stone-200 border-t border-stone-200">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-5">
                <div className="relative w-16 h-20 shrink-0 bg-stone-100 overflow-hidden">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.slug}`} className="text-sm font-medium text-[#1a1a1a] hover:opacity-60">
                    {item.name}
                  </Link>
                  <p className="text-xs text-stone-500 mt-1">
                    {item.color}
                    {item.color && item.size ? " · " : ""}
                    {item.size} · Qty {item.qty}
                  </p>
                  {order.status === "DELIVERED" && (
                    <Link
                      href={`/product/${item.slug}?review=1`}
                      className="mt-2 inline-block text-xs tracking-[0.15em] uppercase text-[#1a1a1a] border-b border-[#1a1a1a] pb-0.5"
                    >
                      Write a review
                    </Link>
                  )}
                </div>
                <span className="text-sm text-[#1a1a1a]">{money(Number(item.price) * item.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Shipping address
              </h3>
              <div className="text-sm text-stone-600 leading-relaxed">
                <p className="text-[#1a1a1a]">{order.shipFullName}</p>
                <p>{order.shipLine1}</p>
                {order.shipLine2 && <p>{order.shipLine2}</p>}
                <p>{[order.shipCity, order.shipRegion, order.shipPostalCode].filter(Boolean).join(", ")}</p>
                <p>{order.shipCountry}</p>
                {order.shipPhone && <p>{order.shipPhone}</p>}
              </div>
            </div>
            {order.trackingNumber && (
              <div>
                <h3 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Tracking
                </h3>
                <div className="text-sm text-stone-600 leading-relaxed">
                  {order.carrier && <p className="text-[#1a1a1a]">{order.carrier}</p>}
                  <p className="font-mono text-xs">{order.trackingNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:border-l lg:border-stone-200 lg:pl-12">
          <h3 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-6">Status</h3>
          <StatusTimeline order={order} />

          <div className="mt-10 pt-8 border-t border-stone-200">
            <h3 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-6">Summary</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-stone-500">Subtotal</dt><dd className="text-[#1a1a1a]">{money(order.subtotal)}</dd></div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
                  <dd className="text-[#1a1a1a]">-{money(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt className="text-stone-500">Shipping</dt><dd className="text-[#1a1a1a]">{shippingCost > 0 ? money(shippingCost) : "Free"}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">Tax</dt><dd className="text-[#1a1a1a]">{money(order.tax)}</dd></div>
              <div className="flex justify-between pt-3 border-t border-stone-200 text-base font-medium">
                <dt className="text-[#1a1a1a]">Total</dt><dd className="text-[#1a1a1a]">{money(order.total)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
