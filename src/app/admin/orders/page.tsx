import { Suspense } from "react";
import AdminOrdersView from "@/components/admin/AdminOrdersView";
import { getAdminOrders } from "@/server/admin-orders-data";

async function OrdersContent() {
  const orders = await getAdminOrders();
  return <AdminOrdersView orders={orders} />;
}

export default function AdminOrders() {
  return (
    <Suspense fallback={<div className="h-64 border border-stone-100 animate-pulse" />}>
      <OrdersContent />
    </Suspense>
  );
}