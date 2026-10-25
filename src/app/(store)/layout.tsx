import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveMarkets } from "@/server/markets";
import { getActiveTheme } from "@/server/theme";
import { StoreProvider } from "@/lib/store-context";
import StoreLayout from "@/components/storefront/StoreLayout";

// Everything in here is read per request (markets and the theme come from the
// database, the theme also depends on today's date, the header shows an admin
// link). Next.js 16 wants that kind of work inside <Suspense>, hence the split.
async function StoreFrame({ children }: { children: ReactNode }) {
  await connection(); // "render this on every request, not at build time"
  const [markets, theme, session] = await Promise.all([getActiveMarkets(), getActiveTheme(), auth()]);

  return (
    <StoreProvider markets={markets}>
      <StoreLayout theme={theme} isAdmin={session?.user?.role === "ADMIN"}>
        {children}
      </StoreLayout>
    </StoreProvider>
  );
}

export default function StoreGroupLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <StoreFrame>{children}</StoreFrame>
    </Suspense>
  );
}
