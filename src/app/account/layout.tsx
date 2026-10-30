import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import AccountTabs from "@/components/account/AccountTabs";
import { displayNameFor } from "@/server/account-data";

// Account pages need a signed-in customer. (Each account query must also filter
// by the signed-in user's id; this layout only decides who gets to see the page.)
async function AccountGate({ children }: { children: ReactNode }) {
  await connection(); // render on every request (required before anything using crypto/random in Next 16)
  const session = await auth();
  if (!session?.user?.id) redirect("/login?returnTo=/account");

  const firstName = (await displayNameFor(session.user.id)).split(" ")[0] || "there";
  const isAdmin = session.user.role === "ADMIN";

  // Replaces useAuth().logout(true)
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-10 md:py-14 min-h-[60vh]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-8 border-b border-stone-200">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">My account</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
            Hello, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-6 self-start sm:self-auto">
          <Link href="/shop" className="text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-[#1a1a1a]">
            Continue shopping
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-[#1a1a1a]">
              Admin
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-[#1a1a1a]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </div>

      <AccountTabs />

      <div className="pt-10">{children}</div>
    </div>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}