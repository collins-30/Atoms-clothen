// Money helpers. All checkout maths is done in integer "minor units" (cents)
// so we never get floating point drift like 0.1 + 0.2.

// Currencies Stripe treats as having no decimals (1 unit = 1 minor unit).
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

export const isZeroDecimal = (currency: string) =>
  ZERO_DECIMAL.has(currency.toLowerCase());

/** 12.34 USD -> 1234 */
export const toMinor = (amount: number, currency: string) =>
  isZeroDecimal(currency) ? Math.round(amount) : Math.round(amount * 100);

/** 1234 -> 12.34 USD */
export const fromMinor = (minor: number, currency: string) =>
  isZeroDecimal(currency) ? minor : minor / 100;

/** String for a Prisma Decimal(10,2) column. */
export const toDecimalString = (minor: number, currency: string) =>
  fromMinor(minor, currency).toFixed(2);
