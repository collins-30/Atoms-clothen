"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Base44 used react-router NavLink. Next.js has no NavLink, so we compare the
// current path ourselves. "Details" points at /account/details, like Base44.
const TABS = [
  { label: "Overview", href: "/account", exact: true },
  { label: "Orders", href: "/account/orders", exact: false },
  { label: "Details", href: "/account/details", exact: false },
];

export default function AccountTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-6 md:gap-10 border-b border-stone-200 mt-6 overflow-x-auto" aria-label="Account">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`pb-3 -mb-px text-xs tracking-[0.15em] uppercase whitespace-nowrap border-b-2 transition-colors ${
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
