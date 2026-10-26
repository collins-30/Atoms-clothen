import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PLACED_ORDERS, fmtDate, fmtMoney, itemsSummary, requireUserId } from "@/server/account-data";
import OrdersList, { type OrderRow } from "./OrdersList";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const userId = await requireUserId("/account/orders");

  const orders = await prisma.order.findMany({
    where: { userId, ...PLACED_ORDERS },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      total: true,
      currencySymbol: true,
      status: true,
      items: { select: { name: true }, orderBy: { id: "asc" } },
    },
  });

  // Text is formatted here so the browser shows exactly what the server rendered.
  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    dateLabel: fmtDate(o.createdAt),
    totalLabel: fmtMoney(o.total, o.currencySymbol),
    summary: itemsSummary(o.items),
  }));

  return <OrdersList orders={rows} />;
}
