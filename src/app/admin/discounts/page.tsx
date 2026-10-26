import { Suspense } from "react";
import DiscountsView from "@/components/admin/DiscountsView";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { getAdminDiscounts } from "@/server/admin-discounts";

async function DiscountsContent() {
  const discounts = await getAdminDiscounts();
  return <DiscountsView discounts={discounts} />;
}

export default function AdminDiscounts() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <DiscountsContent />
    </Suspense>
  );
}
