"use client";

import { useState, type FormEvent, type SVGProps } from "react";
import Link from "next/link";
import { subscribeNewsletter } from "@/server/newsletter";

const COLS = [
  { title: "Shop", links: [["Women", "/shop?gender=women"], ["Men", "/shop?gender=men"], ["New Arrivals", "/shop?new=1"], ["Collections", "/shop"]] },
  { title: "Help", links: [["Shipping & Returns", "/help#shipping"], ["Size Guide", "/help#sizes"], ["Track Order", "/account"], ["Contact", "/help#contact"]] },
  { title: "Company", links: [["About", "/about"], ["Sustainability", "/about#sustainability"], ["Careers", "/about#careers"], ["Stores", "/about#stores"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Cookie Policy", "/privacy#cookies"]] },
];

// Small inline icons. (Recent versions of lucide-react removed brand logos,
// so importing Instagram/Facebook/Twitter from it can fail.)
const icon = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const InstagramIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
);
const FacebookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" /></svg>
);
const TwitterIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><path d="M4 4l16 16M20 4L4 20" /></svg>
);

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const res = await subscribeNewsletter(email);
      if (res.ok) {
        setSubscribed(true);
        setEmail("");
      } else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <footer className="bg-foreground text-background mt-24">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-white/10">
        <div className="max-w-md">
          <h3 className="text-2xl font-bold tracking-[0.2em]" style={{ fontFamily: "var(--font-heading)" }}>ATELIER</h3>
          <p className="mt-4 text-sm text-white/60 leading-relaxed">
            Considered essentials and seasonal statements, made to last. Join the list for early access to new collections.
          </p>
          {subscribed ? (
            <p className="mt-6 text-sm text-white/80 border-b border-white/30 pb-2">Thank you — you&apos;re on the list.</p>
          ) : (
            <>
              <form onSubmit={onSubmit} className="mt-6 flex border-b border-white/30 pb-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="Email address"
                  aria-label="Email address"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40"
                />
                <button disabled={pending} className="text-xs tracking-[0.2em] uppercase hover:opacity-60 disabled:opacity-40">
                  {pending ? "…" : "Subscribe"}
                </button>
              </form>
              {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
            </>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-4">{c.title}</p>
              <ul className="space-y-2.5">
                {c.links.map(([label, to]) => (
                  <li key={label}><Link href={to} className="text-sm text-white/80 hover:text-white">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Atelier. All rights reserved.</p>
        <div className="flex gap-5">
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramIcon className="text-white/70 hover:text-white" /></a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookIcon className="text-white/70 hover:text-white" /></a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter"><TwitterIcon className="text-white/70 hover:text-white" /></a>
        </div>
      </div>
    </footer>
  );
}
