// Text of the two legal pages, copied from the Base44 Legal.jsx.
// Have a lawyer review this before launch: it is placeholder wording.

export type LegalDoc = {
  title: string;
  updated: string;
  sections: [title: string, text: string][];
};

export const LEGAL: Record<"privacy" | "terms", LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: October 2026",
    sections: [
      ["What we collect", "When you browse the store, we collect the minimum data needed to run it: your account details if you create one, and standard technical information such as device type and pages visited, used only in aggregate to improve the store."],
      ["Orders and payments", "To fulfil an order we process your name, delivery address, contact details and order contents. Payments are handled entirely by Stripe — we never see or store your card details, only a payment reference and confirmation status."],
      ["Marketing", "If you join our mailing list we use your email to send occasional collection updates and early access. Every email includes a one-click unsubscribe link, and unsubscribing takes effect immediately."],
      ["Cookies", "We use a small number of strictly necessary cookies to keep your session and cart working. Analytics cookies, where used, are anonymous and can be declined without affecting your shopping experience. You can clear or block cookies in your browser settings at any time."],
      ["Your rights", "You can request a copy of your data, correct it, or ask us to delete your account at any time through your account page or by contacting us. We retain order records only as long as tax and accounting rules require."],
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "Last updated: October 2026",
    sections: [
      ["Using this store", "By placing an order you confirm you are able to enter a binding contract and that the details you provide are accurate. Prices are shown in your selected market’s currency and include applicable taxes unless stated otherwise at checkout."],
      ["Orders and acceptance", "An order is accepted once payment is confirmed and we send your order confirmation email. In the rare case an item becomes unavailable after ordering, we will cancel that line and refund it in full."],
      ["Shipping and delivery", "Delivery estimates shown at checkout are provided by our carriers and are not guaranteed, though most orders arrive within the stated window. Risk of loss passes to you on delivery."],
      ["Returns", "Unworn items can be returned within 30 days of delivery for a refund to the original payment method. Final-sale and personalised items are excluded, as stated on the product page."],
      ["Liability", "Our liability for any claim connected to a purchase is limited to the amount paid for the affected order. Nothing in these terms limits rights you have under mandatory consumer law in your market."],
    ],
  },
};
