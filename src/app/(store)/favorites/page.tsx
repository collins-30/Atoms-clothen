import type { Metadata } from "next";
import FavoritesView from "./FavoritesView";

export const metadata: Metadata = { title: "Favorites" };

export default function FavoritesPage() {
  return <FavoritesView />;
}
