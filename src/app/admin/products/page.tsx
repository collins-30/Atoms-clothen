import { Suspense } from "react";
import ProductsView from "@/components/admin/ProductsView";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { getAdminProducts } from "@/server/admin-products";

async function ProductsContent() {
  const data = await getAdminProducts();
  return <ProductsView {...data} />;
}

export default function AdminProducts() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}
