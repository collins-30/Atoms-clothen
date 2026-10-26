import { Suspense } from "react";
import AnalysisView from "@/components/admin/AnalysisView";
import { getOrderAnalysis } from "@/server/admin-stats";

async function AnalysisContent() {
  const data = await getOrderAnalysis();
  return <AnalysisView data={data} />;
}

// The page itself is not async: the data loads inside its own <Suspense>
// (the same pattern as the storefront home page).
export default function AdminAnalysis() {
  return (
    <Suspense fallback={<div className="h-64 border border-stone-100 animate-pulse" />}>
      <AnalysisContent />
    </Suspense>
  );
}