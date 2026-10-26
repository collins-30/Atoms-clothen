import { Suspense } from "react";
import CategoriesView from "@/components/admin/CategoriesView";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { getAdminCategories } from "@/server/admin-categories";

async function CategoriesContent() {
  const categories = await getAdminCategories();
  return <CategoriesView categories={categories} />;
}

export default function AdminCategories() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CategoriesContent />
    </Suspense>
  );
}
