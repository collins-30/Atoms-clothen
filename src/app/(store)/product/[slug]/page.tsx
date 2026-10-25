import { Suspense } from "react";
import ProductDetailView from "./ProductDetailView";

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // key={slug}: opening another product starts from a clean state (color, size, quantity).
  return <ProductDetailView key={slug} slug={slug} />;
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-32">
          <div className="aspect-[3/4] max-w-md bg-stone-100 animate-pulse" />
        </div>
      }
    >
      <ProductContent params={params} />
    </Suspense>
  );
}
