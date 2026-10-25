import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getOrderBySessionId } from "@/server/orders";
import OrderConfirmationView, { type ConfirmationOrder } from "./OrderConfirmationView";

// Stripe sends the customer back here: /order-confirmation?session_id=cs_...
// This page only DISPLAYS the order. The webhook is what marks it paid.
async function ConfirmationContent({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  await connection(); // the order changes (unpaid -> paid), never cache it
  const { session_id } = await searchParams;
  const order = session_id ? await getOrderBySessionId(session_id) : null;

  if (!order) {
    return (
      <div className="max-w-[720px] mx-auto px-4 md:px-8 py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)" }}>Order not found</h1>
        <p className="text-stone-500 mb-8">We couldn&apos;t find that order. If you were charged, check your email for a confirmation.</p>
        <Link href="/shop" className="inline-block text-xs tracking-[0.2em] uppercase border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors">
          Continue shopping
        </Link>
      </div>
    );
  }

  // Plain numbers/strings only: Prisma Decimals can't cross to a client component.
  const data: ConfirmationOrder = {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    currencySymbol: order.currencySymbol,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    shipping: Number(order.shipping),
    tax: Number(order.tax),
    total: Number(order.total),
    email: order.shipEmail,
    address: [order.shipLine1, order.shipLine2, order.shipCity, order.shipRegion, order.shipPostalCode, order.shipCountry]
      .filter(Boolean)
      .join(", "),
    items: order.items.map((i) => ({
      id: i.id,
      name: i.name,
      color: i.color,
      size: i.size,
      qty: i.qty,
      price: Number(i.price),
    })),
  };

  return <OrderConfirmationView order={data} />;
}

export default function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <ConfirmationContent searchParams={searchParams} />
    </Suspense>
  );
}
