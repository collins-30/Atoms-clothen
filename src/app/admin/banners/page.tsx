import { Suspense } from "react";
import BannersView from "@/components/admin/BannersView";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { getAdminBanners } from "@/server/admin-banners";

async function BannersContent() {
  const banners = await getAdminBanners();
  return <BannersView banners={banners} />;
}

export default function AdminBanners() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <BannersContent />
    </Suspense>
  );
}
