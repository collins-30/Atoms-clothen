import { Suspense } from "react";
import { connection } from "next/server";
import { getActiveBanners } from "@/server/banners";
import HomeView from "./HomeView";

// Banners are loaded here on the server so the hero is already in the page
// when it first loads. Products load in HomeView because they depend on the
// visitor's chosen market.
async function HomeContent() {
  await connection(); // read banners on every request
  const banners = await getActiveBanners();
  return <HomeView banners={banners} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <HomeContent />
    </Suspense>
  );
}
