import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Store } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminNav from "@/components/admin/AdminNav";

// The real admin gate. The role is read from the DATABASE on every request,
// so demoting an admin takes effect immediately (the cookie can be stale).
// Everyone who isn't an admin sees a plain 404, so /admin looks like it doesn't exist.
async function AdminGate({ children }: { children: ReactNode }) {
  await connection(); // render on every request (required before anything using crypto/random in Next 16)
  const session = await auth();
  if (!session?.user?.id) redirect("/login?returnTo=/admin");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== "ADMIN") notFound();

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col">
      <header className="border-b border-stone-200 bg-[#F9F9F7] sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-[0.3em] text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
              JAMAS
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase bg-[#1a1a1a] text-[#F9F9F7] px-2 py-0.5">Admin</span>
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-[#1a1a1a]">
            <Store className="w-3.5 h-3.5" /> View store
          </Link>
        </div>
        <AdminNav />
      </header>
      <main className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-10 flex-1">
        {/* Own Suspense: the header shows at once while a page loads its data. */}
        <Suspense
          fallback={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 border border-stone-100 animate-pulse" />
              ))}
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}