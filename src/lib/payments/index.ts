import type { PaymentProvider } from "./provider";
import { stripeProvider } from "./stripe";

// To add Paystack later: implement PaymentProvider in paystack.ts, import it
// here and add it to this object. Nothing else in the app needs to change.
const providers: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
};

export function getPaymentProvider(name = "stripe"): PaymentProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  return provider;
}
