// Server-only helpers for the /account pages. No "use server": these are never
// callable from the browser. Every query filters by the signed-in user's id.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireUserId(returnTo = "/account"): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  return session.user.id;
}

/**
 * Checkout creates the order as UNPAID/PENDING before the customer pays, and
 * cancels it if the payment page expires. Customers should only see orders they
 * actually paid for, not abandoned checkouts.
 */
export const PLACED_ORDERS = { paymentStatus: { not: "UNPAID" } } as const;

export function fmtMoney(n: unknown, symbol: string | null | undefined): string {
  return `${symbol ?? ""}${Number(n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtDate(d: Date, style: "short" | "long" = "short"): string {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Shirt +2 more" */
export function itemsSummary(items: { name: string }[]): string {
  if (items.length === 0) return "";
  return items[0].name + (items.length > 1 ? ` +${items.length - 1} more` : "");
}
