"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatPrice } from "@/lib/format";

export type ConfirmationOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  currencySymbol: string;
  subtotal: number;
  discountAmount: number;
  shipping: number;
  tax: number;
  total: number;
  email: string;
  address: string;
  items: { id: string; name: string; color: string | null; size: string | null; qty: number; price: number }[];
};

const MAX_POLLS = 15; // ~30 seconds

// A simple version. Send me your Base44 OrderConfirmation.jsx to match your design.
export default function OrderConfirmationView({ order }: { order: ConfirmationOrder }) {
  const router = useRouter();
  const { clearCart, hydrated } = useStore();
  const paid = order.paymentStatus === "PAID";
  const failed = !paid && order.status === "CANCELLED";
  const polls = useRef(0);

  // Payment is confirmed by Stripe's webhook, which usually lands within a
  // second or two. Until then, re-check the order every 2 seconds.
  useEffect(() => {
    if (paid || failed) return;
    const t = setInterval(() => {
      if (polls.current++ >= MAX_POLLS) return clearInterval(t);
      router.refresh();
    }, 2000);
    return () => clearInterval(t);
  }, [paid, failed, router]);

  // Empty the bag only once the payment is really confirmed.
  useEffect(() => {
    if (paid && hydrated) clearCart();
  }, [paid, hydrated, clearCart]);

  const fmt = (n: number) => formatPrice(n, order);

  return (
    <div className="max-w-[720px] mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="text-center mb-10">
        {paid ? (
          <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-[#2D5A27]" />
        ) : failed ? (
          <XCircle className="w-10 h-10 mx-auto mb-4 text-destructive" />
        ) : (
          <Clock className="w-10 h-10 mx-auto mb-4 text-stone-400" />
        )}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          {paid ? "Thank you for your order" : failed ? "Payment not completed" : "Confirming your payment…"}
        </h1>
        <p className="text-sm text-stone-500">
          {paid
            ? `Order ${order.orderNumber} is confirmed. A receipt is on its way to ${order.email}.`
            : failed
              ? "The payment session expired, so no order was placed. Your bag is still saved."
              : "This usually takes a few seconds. Please don't close this page."}
        </p>
      </div>

      {!failed && (
        <div className="border border-stone-200 p-6">
          <ul className="divide-y divide-stone-200 mb-5">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-3 first:pt-0 text-sm">
                <span>
                  {i.name} × {i.qty}
                  <span className="text-stone-500"> ({[i.color, i.size].filter(Boolean).join(" / ")})</span>
                </span>
                <span className="font-mono">{fmt(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-600">Subtotal</span><span className="font-mono">{fmt(order.subtotal)}</span></div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between"><span className="text-stone-600">Discount</span><span className="font-mono">-{fmt(order.discountAmount)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-stone-600">Shipping</span><span className="font-mono">{order.shipping === 0 ? "Free" : fmt(order.shipping)}</span></div>
            <div className="flex justify-between"><span className="text-stone-600">Tax</span><span className="font-mono">{fmt(order.tax)}</span></div>
            <div className="pt-3 border-t border-stone-200 flex justify-between text-base font-medium"><span>Total</span><span className="font-mono">{fmt(order.total)}</span></div>
          </div>
          <p className="mt-6 text-xs text-stone-500">Shipping to: {order.address}</p>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href={failed ? "/checkout" : "/shop"}
          className="inline-block text-xs tracking-[0.2em] uppercase border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors"
        >
          {failed ? "Back to checkout" : "Continue shopping"}
        </Link>
      </div>
    </div>
  );
}
