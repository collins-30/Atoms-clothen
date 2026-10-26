"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Base44's NAV list. A few labels point at the routes this project already has:
// Pricing -> /admin/markets, Content -> /admin/banners, Appearance -> /admin/themes.
const NAV = [
  { label: "Dashboard", href: "/admin", exact: true },
  { label: "Orders", href: "/admin/orders" },
  { label: "Analysis", href: "/admin/analysis" },
  { label: "Products", href: "/admin/products" },
  { label: "Pricing", href: "/admin/markets" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Discounts", href: "/admin/discounts" },
  { label: "Content", href: "/admin/banners" },
  { label: "Appearance", href: "/admin/themes" },
  { label: "Customers", href: "/admin/customers" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="max-w-[1400px] mx-auto px-4 md:px-8 flex gap-6 overflow-x-auto border-t border-stone-100" aria-label="Admin">
      {NAV.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`py-3.5 -mb-px text-xs tracking-[0.15em] uppercase whitespace-nowrap border-b-2 transition-colors ${
              active ? "border-[#1a1a1a] text-[#1a1a1a]" : "border-transparent text-stone-400 hover:text-[#1a1a1a]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
