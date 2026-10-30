"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LayoutDashboard, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useTheme } from "@/lib/theme-context";
import MarketSelector from "./MarketSelector";

const NAV = [
  { label: "Women", to: "/shop?gender=women" },
  { label: "Men", to: "/shop?gender=men" },
  { label: "New", to: "/shop?new=1" },
  { label: "Collections", to: "/shop" },
];

// `isAdmin` comes from the server (the store layout reads the session), which
// replaces your old useAuth() hook.
export default function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { cartCount, setCartOpen, wishlist } = useStore();
  const { theme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
      setSearchOpen(false);
      setQ("");
    }
  };

  const solid = scrolled || !isHome || menuOpen;
  const headerBg =
    theme.headerStyle === "tinted" ? "bg-secondary" : solid ? "bg-background/95 backdrop-blur" : "bg-transparent";

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${headerBg} ${solid ? "border-b border-border" : ""}`}
        style={
          theme.headerStyle === "bordered" && theme.colorPrimary
            ? { borderBottom: `2px solid ${theme.colorPrimary}` }
            : undefined
        }
      >
        <nav className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="md:hidden p-1 -ml-1" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div className="hidden md:flex items-center gap-6">
              {NAV.slice(0, 2).map((n) => (
                <Link key={n.label} href={n.to} className="text-xs tracking-[0.15em] uppercase text-foreground hover:opacity-60">
                  {n.label}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-xl md:text-2xl font-bold tracking-[0.3em] text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            JAMAS
          </Link>

          <div className="flex items-center gap-4 md:gap-5">
            <div className="hidden md:flex items-center gap-6">
              {NAV.slice(2).map((n) => (
                <Link key={n.label} href={n.to} className="text-xs tracking-[0.15em] uppercase text-foreground hover:opacity-60">
                  {n.label}
                </Link>
              ))}
            </div>
            <button onClick={() => setSearchOpen((s) => !s)} className="text-foreground hover:opacity-60" aria-label="Search">
              <Search className="w-[18px] h-[18px]" />
            </button>
            <div className="hidden md:block"><MarketSelector /></div>
            {isAdmin && (
              <Link href="/admin" className="text-foreground hover:opacity-60 hidden sm:block" aria-label="Admin dashboard">
                <LayoutDashboard className="w-[18px] h-[18px]" />
              </Link>
            )}
            <Link href="/account" className="text-foreground hover:opacity-60 hidden sm:block" aria-label="Account">
              <User className="w-[18px] h-[18px]" />
            </Link>
            <Link href="/favorites" className="relative text-foreground hover:opacity-60 hidden sm:block" aria-label="Favorites">
              <Heart className="w-[18px] h-[18px]" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-foreground text-background rounded-full w-3.5 h-3.5 flex items-center justify-center">{wishlist.length}</span>
              )}
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative text-foreground hover:opacity-60" aria-label={`Cart, ${cartCount} items`}>
              <ShoppingBag className="w-[18px] h-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-foreground text-background rounded-full w-3.5 h-3.5 flex items-center justify-center">{cartCount}</span>
              )}
            </button>
          </div>
        </nav>
        {searchOpen && (
          <div className="border-t border-border bg-background">
            <form onSubmit={submitSearch} className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for products, categories…"
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-stone-400"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </form>
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-background md:hidden flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <span className="text-xl font-bold tracking-[0.3em] text-foreground" style={{ fontFamily: "var(--font-heading)" }}>JAMAS</span>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X className="w-5 h-5 text-foreground" /></button>
          </div>
          <div className="flex-1 flex flex-col px-6 py-8 gap-1">
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.to}
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-semibold text-foreground py-3 border-b border-border"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-6 flex items-center justify-between">
              <MarketSelector align="left" />
              <div className="flex gap-6">
                {isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-sm text-foreground">Admin</Link>}
                <Link href="/account" onClick={() => setMenuOpen(false)} className="text-sm text-foreground">Account</Link>
                <Link href="/favorites" onClick={() => setMenuOpen(false)} className="text-sm text-foreground">Favorites</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
