import { Suspense, type ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// The real admin gate. The role is read from the DATABASE on every request,
// so demoting an admin takes effect immediately (the cookie can be stale).
// Everyone who isn't an admin sees a plain 404, so /admin looks like it doesn't exist.
async function AdminGate({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?returnTo=/admin");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== "ADMIN") notFound();
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
