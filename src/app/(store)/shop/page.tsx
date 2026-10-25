import { Suspense } from "react";
import ShopView from "./ShopView";

// ShopView reads the URL (?gender=women&new=1&q=...), which Next requires to
// sit inside a <Suspense> boundary.
export default function ShopPage() {
  return (
    <Suspense fallback={<div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8 pb-20 min-h-[60vh]" />}>
      <ShopView />
    </Suspense>
  );
}
