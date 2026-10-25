import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Account pages need a signed-in customer. (Each account query must also filter
// by the signed-in user's id; this layout only decides who gets to see the page.)
async function AccountGate({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?returnTo=/account");
  return <>{children}</>;
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}
