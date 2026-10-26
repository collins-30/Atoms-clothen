import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Help",
  description: "Shipping, returns, sizing and how to reach us.",
};

// The ids match the footer links: /help#shipping, /help#sizes, /help#contact.
const FAQ = [
  {
    id: "shipping",
    q: "Shipping & Returns",
    a: "Standard shipping takes 3–6 business days; express takes 1–2. Standard shipping is free on orders above 150 in your market's currency.\n\nUnworn items can be returned within 30 days of delivery for a full refund to the original payment method. Returns are free in all our markets — just start the return from your account page and we'll email you a prepaid label.",
  },
  {
    id: "sizes",
    q: "Size Guide",
    a: "Our pieces run true to size and are cut in a relaxed, considered fit. If you're between sizes, we suggest sizing down for tailored pieces and staying with your usual size for knitwear.\n\nEach product page lists the garment's measurements for every size — compare them to a similar piece you already own for the most accurate fit.",
  },
  {
    id: "track",
    q: "Track Order",
    a: "Once your order ships you'll receive a confirmation email with a tracking link. You can also see live status for every order under your account page, along with the carrier and tracking number.",
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Help</h1>
      <p className="mt-3 text-sm text-muted-foreground">Short answers to the questions we hear most. Can&apos;t find yours? Contact us below.</p>

      <div className="mt-10">
        {FAQ.map((f) => (
          <div key={f.id} id={f.id} className="py-6 border-b border-border scroll-mt-28">
            <h2 className="text-lg font-semibold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>{f.q}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{f.a}</p>
          </div>
        ))}
      </div>

      <section id="contact" className="mt-14 scroll-mt-28">
        <h2 className="text-xl font-semibold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>Contact</h2>
        <div className="mt-5 space-y-4 text-sm text-muted-foreground">
          <a href="mailto:care@atelier.example" className="flex items-center gap-3 hover:text-foreground"><Mail className="w-4 h-4" /> care@atelier.example</a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-foreground"><MessageCircle className="w-4 h-4" /> Message us on Instagram</a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Our team replies within one business day, Monday to Friday.</p>
      </section>

      <div className="mt-16 pt-8 border-t border-border">
        <Link href="/account" className="text-xs tracking-[0.2em] uppercase hover:opacity-60">Track your order →</Link>
      </div>
    </div>
  );
}
