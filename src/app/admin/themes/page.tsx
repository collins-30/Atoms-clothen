import { Suspense } from "react";
import ThemesView from "@/components/admin/ThemesView";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { getAdminThemes } from "@/server/admin-themes";

async function ThemesContent() {
  const data = await getAdminThemes();
  return <ThemesView {...data} />;
}

export default function AdminThemes() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ThemesContent />
    </Suspense>
  );
}
