"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "@/lib/store-context";
import { formatPrice } from "@/lib/format";
import { FREE_STANDARD_SHIPPING_FROM } from "@/lib/pricing";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { readableOn, themeVars, type StoreTheme } from "@/lib/theme";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import ThemeDecorations from "./ThemeDecorations";

function AnnouncementBar() {
  const { theme } = useTheme();
  const { market } = useStore();

  if (theme.announcementEnabled && theme.announcementText) {
    const bg = theme.colorButton || theme.colorPrimary || "#1A1A1A";
    return (
      <div
        className="w-full text-center text-[10px] md:text-[11px] tracking-[0.2em] uppercase py-2 px-4"
        style={{ background: bg, color: readableOn(bg) }}
      >
        {theme.announcementText}
      </div>
    );
  }
  return (
    <div className="w-full bg-foreground text-background text-center text-[10px] md:text-[11px] tracking-[0.2em] uppercase py-2 px-4">
      Complimentary shipping on orders over {formatPrice(FREE_STANDARD_SHIPPING_FROM, market)} — Worldwide express available
    </div>
  );
}

function SeasonalBanner() {
  const { theme } = useTheme();
  if (!theme.bannerImage) return null;
  return (
    <Link href={theme.bannerLink || "/shop"} className="block relative h-40 md:h-56 overflow-hidden">
      <Image
        src={theme.bannerImage}
        alt={theme.bannerHeading || ""}
        fill
        sizes="100vw"
        className="object-cover"
        // Admin-entered pictures can live on any host; skip Next's image
        // optimizer for those so they don't need to be pre-approved.
        unoptimized={theme.bannerImage.startsWith("http")}
      />
      {(theme.bannerHeading || theme.bannerSubheading) && (
        <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center text-center px-4">
          {theme.bannerHeading && (
            <h2 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-white" style={{ fontFamily: "var(--font-heading)" }}>
              {theme.bannerHeading}
            </h2>
          )}
          {theme.bannerSubheading && (
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/80 mt-2">{theme.bannerSubheading}</p>
          )}
        </div>
      )}
    </Link>
  );
}

function StoreShell({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div style={themeVars(theme)} className="relative min-h-screen flex flex-col bg-background text-foreground">
      {theme.decorations.length > 0 && <ThemeDecorations kinds={theme.decorations} />}
      <AnnouncementBar />
      <Navbar isAdmin={isAdmin} />
      <SeasonalBanner />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}

// Replaces your Base44 StoreLayout (which used <Outlet/>). Every storefront
// page is wrapped by this through app/(store)/layout.tsx.
export default function StoreLayout({
  theme,
  isAdmin,
  children,
}: {
  theme: StoreTheme;
  isAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <StoreShell isAdmin={isAdmin}>{children}</StoreShell>
    </ThemeProvider>
  );
}
