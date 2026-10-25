// Shows a price like "$95", "$95.50" or "₦372,000".
// If you already have your own format.js from Base44, keep yours: it only
// needs to accept (amount, market).

export type PriceMarket = {
  currency: string;
  currencySymbol?: string;
  currency_symbol?: string;
};

export function formatPrice(amount: number, market: PriceMarket): string {
  const symbol = market.currencySymbol ?? market.currency_symbol ?? "";
  const n = Number(amount) || 0;
  const whole = Number.isInteger(n);
  const body = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : ""}${symbol}${body}`;
}
