import { prisma } from "@/lib/db";

// Shape the storefront components expect. Both spellings are included so your
// old components (which read market.currency_symbol) keep working untouched.
export type MarketInfo = {
  code: string;
  name: string;
  currency: string;
  currency_symbol: string;
  currencySymbol: string;
};

export async function getActiveMarkets(): Promise<MarketInfo[]> {
  const rows = await prisma.market.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
  return rows.map((m) => ({
    code: m.code,
    name: m.name,
    currency: m.currency,
    currency_symbol: m.currencySymbol,
    currencySymbol: m.currencySymbol,
  }));
}
