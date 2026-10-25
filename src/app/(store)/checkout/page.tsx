"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, CreditCard, Truck } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import CheckoutSummary from "@/components/checkout/CheckoutSummary";
import { quoteCheckout, type QuoteResult } from "@/server/quote";
import { createCheckout } from "@/server/checkout";

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Germany", "France", "Italy", "Spain",
  "Netherlands", "Belgium", "Sweden", "Denmark", "Norway", "Ireland", "Portugal",
  "Poland", "United Arab Emirates", "Saudi Arabia", "South Africa", "Nigeria",
  "Kenya", "Egypt", "Ghana", "Morocco",
];

// Prices are NOT here any more: the server decides them per market.
const DELIVERY_OPTIONS = [
  { id: "standard", title: "Standard", detail: "5–7 business days" },
  { id: "express", title: "Express", detail: "2–3 business days" },
] as const;
type DeliveryId = (typeof DELIVERY_OPTIONS)[number]["id"];

type Quote = Extract<QuoteResult, { ok: true }>;

const inputClass =
  "h-11 w-full px-3 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "text-xs tracking-[0.1em] uppercase text-stone-500 mb-1.5 block";

export default function CheckoutPage() {
  const { cart, market, hydrated } = useStore();
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState({ email: "", full_name: "", phone: "" });
  const [address, setAddress] = useState({
    full_name: "", line1: "", line2: "", city: "", region: "", postal_code: "", country: "",
  });
  const [delivery, setDelivery] = useState<DeliveryId>("standard");
  const [promo, setPromo] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  // What we send to the server: only WHAT is in the bag, never prices.
  const items = useMemo(
    () => cart.map(({ productSlug, color, size, qty }) => ({ productSlug, color, size, qty })),
    [cart],
  );

  // Real totals from the server (database prices, discount, shipping, tax).
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    let cancelled = false;
    quoteCheckout({ marketCode: market.code, items, delivery, discountCode: discountCode || undefined })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setQuote(r);
          setQuoteError("");
        } else if (r.kind === "discount") {
          // The code stopped being valid (e.g. the bag dropped below the minimum).
          setDiscountCode("");
          setPromo("");
          setQuoteError(r.error);
        } else {
          setQuoteError(r.error);
        }
      })
      .catch(() => !cancelled && setQuoteError("Could not update your totals. Please try again."));
    return () => {
      cancelled = true;
    };
  }, [hydrated, items, market.code, delivery, discountCode]);

  // Only trust a quote for the market currently shown (switching market makes
  // the old numbers wrong until the new quote arrives).
  const fresh = quote && quote.marketCode === market.code ? quote : null;
  const subtotal = fresh?.subtotal ?? 0;
  const discount = fresh?.discount ?? 0;
  const shipping = fresh?.shipping ?? 0;
  const tax = fresh?.tax ?? 0;
  const total = fresh?.total ?? 0;
  const deliveryCosts = fresh?.deliveryCosts;
  const freeFrom = fresh?.freeShippingFrom ?? 0;

  if (!hydrated) {
    return <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-10 md:py-14 min-h-[50vh]" />;
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)" }}>Checkout</h1>
        <p className="text-stone-500 py-16 text-center">Your bag is empty — nothing to check out.</p>
        <div className="text-center">
          <Link href="/shop" className="inline-block text-xs tracking-[0.2em] uppercase border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors">Shop the collection</Link>
        </div>
      </div>
    );
  }

  const canContinue = () => {
    if (step === 1) return Boolean(customer.email && customer.full_name && /.+@.+\..+/.test(customer.email));
    if (step === 2) {
      return Boolean(
        address.full_name && address.line1 && address.city && address.region && address.postal_code && address.country,
      );
    }
    return true;
  };

  const next = () => {
    if (canContinue()) {
      setError("");
      setStep((s) => Math.min(5, s + 1));
    } else setError("Please fill in the required fields.");
  };
  const back = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  // Returns an error message, or null when the code was accepted.
  const applyPromo = async (code: string): Promise<string | null> => {
    try {
      const r = await quoteCheckout({ marketCode: market.code, items, delivery, discountCode: code });
      if (!r.ok) return r.kind === "discount" ? r.error : r.error;
      setDiscountCode(r.discountCode ?? code);
      return null;
    } catch {
      return "Could not verify code";
    }
  };
  const removePromo = () => {
    setDiscountCode("");
    setPromo("");
  };

  const placeOrder = async () => {
    if (placing) return;
    setPlacing(true);
    setError("");
    try {
      const res = await createCheckout({
        marketCode: market.code,
        items,
        customer: { email: customer.email },
        shippingAddress: {
          fullName: address.full_name,
          phone: customer.phone || undefined,
          line1: address.line1,
          line2: address.line2 || undefined,
          city: address.city,
          region: address.region || undefined,
          postalCode: address.postal_code,
          country: address.country,
        },
        delivery,
        discountCode: discountCode || undefined,
      });
      if (!res.ok) throw new Error(res.error);
      // Go to Stripe. The bag is cleared on the confirmation page once payment
      // is confirmed, so an abandoned payment keeps the bag.
      window.location.assign(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPlacing(false);
    }
  };

  const shownError = error || quoteError;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-10 md:py-14">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8" style={{ fontFamily: "var(--font-heading)" }}>Checkout</h1>
      <div className="mb-10"><CheckoutSteps current={step} /></div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
        <div>
          {/* Step 1 — Customer information */}
          {step === 1 && (
            <section>
              <h2 className="text-lg font-medium mb-6">Customer information</h2>
              <div className="space-y-5 max-w-md">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input className={inputClass} type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="you@example.com" />
                </div>
                <div>
                  <label className={labelClass}>Full name *</label>
                  <input className={inputClass} value={customer.full_name} onChange={(e) => setCustomer({ ...customer, full_name: e.target.value })} placeholder="First and last name" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                </div>
              </div>
            </section>
          )}

          {/* Step 2 — Shipping address */}
          {step === 2 && (
            <section>
              <h2 className="text-lg font-medium mb-6">Shipping address</h2>
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className={labelClass}>Full name *</label>
                  <input className={inputClass} value={address.full_name} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Address *</label>
                  <input className={inputClass} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="Street and house number" />
                  <input className={`${inputClass} mt-3`} value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Apartment, suite, etc. (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>City *</label>
                    <input className={inputClass} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Region / State *</label>
                    <input className={inputClass} value={address.region} onChange={(e) => setAddress({ ...address, region: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Postal code *</label>
                    <input className={inputClass} value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Country *</label>
                    <select className={inputClass} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })}>
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Step 3 — Delivery method */}
          {step === 3 && (
            <section>
              <h2 className="text-lg font-medium mb-6">Delivery method</h2>
              <div className="space-y-4 max-w-lg">
                {DELIVERY_OPTIONS.map((opt) => {
                  const cost = deliveryCosts?.[opt.id];
                  const selected = delivery === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setDelivery(opt.id)}
                      className={`w-full flex items-center justify-between gap-4 border p-5 text-left transition-colors ${selected ? "border-foreground" : "border-stone-200 hover:border-stone-400"}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selected ? "border-foreground" : "border-stone-300"}`}>
                          {selected && <span className="w-2 h-2 rounded-full bg-foreground" />}
                        </span>
                        <Truck className="w-4 h-4 text-stone-500" />
                        <div>
                          <p className="text-sm font-medium">{opt.title}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{opt.detail}</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm">
                        {cost === undefined ? "…" : cost === 0 ? "Free" : formatPrice(cost, market)}
                      </span>
                    </button>
                  );
                })}
                {freeFrom > 0 && subtotal < freeFrom && delivery === "standard" && (
                  <p className="text-xs text-stone-500">Free standard delivery on orders over {formatPrice(freeFrom, market)}.</p>
                )}
              </div>
            </section>
          )}

          {/* Step 4 — Payment */}
          {step === 4 && (
            <section>
              <h2 className="text-lg font-medium mb-6">Payment</h2>
              <div className="max-w-lg border border-stone-200 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <CreditCard className="w-5 h-5 text-stone-500" />
                  <div>
                    <p className="text-sm font-medium">Card payment</p>
                    <p className="text-xs text-stone-500 mt-0.5">All major credit and debit cards</p>
                  </div>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed mb-4">
                  On the next step you&apos;ll be taken to Stripe&apos;s secure payment page to enter your card details. Your information is encrypted and never touches our servers.
                </p>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Lock className="w-3.5 h-3.5" /> Secured by Stripe · Test mode
                </div>
              </div>
            </section>
          )}

          {/* Step 5 — Order review */}
          {step === 5 && (
            <section className="space-y-8">
              <h2 className="text-lg font-medium">Review your order</h2>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="border border-stone-200 p-5">
                  <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Customer</p>
                  <p className="text-sm">{customer.full_name}</p>
                  <p className="text-sm text-stone-500">{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p>
                </div>
                <div className="border border-stone-200 p-5">
                  <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Shipping address</p>
                  <p className="text-sm">{address.full_name}</p>
                  <p className="text-sm text-stone-500">
                    {[address.line1, address.line2, address.city, address.region, address.postal_code, address.country].filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="border border-stone-200 p-5">
                  <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Delivery</p>
                  <p className="text-sm">{delivery === "express" ? "Express" : "Standard"} · {delivery === "express" ? "2–3" : "5–7"} business days</p>
                  <p className="text-sm text-stone-500">{shipping === 0 ? "Free" : formatPrice(shipping, market)}</p>
                </div>
                <div className="border border-stone-200 p-5">
                  <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Payment</p>
                  <p className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-stone-500" /> Card via Stripe</p>
                  <p className="text-sm text-stone-500 mt-0.5">Charged on the next step</p>
                </div>
              </div>
            </section>
          )}

          {shownError && <p className="mt-6 text-sm text-destructive">{shownError}</p>}

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="ghost" onClick={back} className="text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : <span />}
            {step < 5 ? (
              <Button onClick={next} className="h-12 px-8 bg-foreground text-background text-xs tracking-[0.2em] uppercase hover:bg-[#2D5A27]">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={placeOrder} disabled={placing || !fresh} className="h-12 px-8 bg-foreground text-background text-xs tracking-[0.2em] uppercase hover:bg-[#2D5A27] disabled:opacity-60">
                {placing ? "Redirecting…" : "Place order"} <Lock className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24">
          <CheckoutSummary
            cart={cart}
            market={market}
            subtotal={subtotal}
            discount={discount}
            shipping={shipping}
            tax={tax}
            total={total}
            delivery={delivery}
            promo={promo}
            setPromo={setPromo}
            discountCode={discountCode}
            onApplyPromo={applyPromo}
            removePromo={removePromo}
            unitPrices={fresh?.unitPrices ?? null}
          />
        </div>
      </div>
    </div>
  );
}
