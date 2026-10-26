import { Suspense } from "react";
import CustomersView from "@/components/admin/CustomersView";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { getAdminCustomers } from "@/server/admin-customers";

async function CustomersContent() {
  const customers = await getAdminCustomers();
  return <CustomersView customers={customers} />;
}

export default function AdminCustomers() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CustomersContent />
    </Suspense>
  );
}
