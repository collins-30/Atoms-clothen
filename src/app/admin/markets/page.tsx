import { Suspense } from "react";
import PricingView from "@/components/admin/PricingView";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { getPricingData } from "@/server/admin-markets";

async function PricingContent() {
  const data = await getPricingData();
  return <PricingView {...data} />;
}

export default function AdminPricing() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <PricingContent />
    </Suspense>
  );
}
