import type { OrderStatus, Prisma } from "@prisma/client";
import { sendEmail, type SendResult } from "./send";

export type OrderForEmail = Prisma.OrderGetPayload<{
  include: { items: true; user: { select: { email: true } } };
}>;

// Same wording as your Base44 notifyOrderStatus function.
const STATUS_MESSAGES: Record<OrderStatus, string> = {
  PENDING: "Your order status has been updated to pending.",
  CONFIRMED: "Your order has been confirmed and is being prepared.",
  PROCESSING: "Your order is being prepared for shipment.",
  SHIPPED: "Good news — your order is on its way.",
  DELIVERED: "Your order has been delivered. We hope you love it.",
  CANCELLED:
    "Your order has been cancelled. If this was unexpected, please contact our support team.",
  REFUNDED: "A refund for your order has been issued.",
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Guests gave an email at checkout; fall back to the account email. */
export function orderRecipient(order: OrderForEmail): string | null {
  // Lower-case: some orders were saved with capitals, and Resend compares addresses exactly.
  const to = (order.shipEmail || order.user?.email || "").trim().toLowerCase();
  return to || null;
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || null;

function shipToHtml(order: OrderForEmail): string {
  const cityLine = [order.shipCity, order.shipRegion, order.shipPostalCode].filter(Boolean).join(", ");
  const lines = [order.shipFullName, order.shipLine1, order.shipLine2, cityLine, order.shipCountry, order.shipPhone]
    .filter((l): l is string => Boolean(l && l.trim()))
    .map((l) => escapeHtml(l));
  return lines.join("<br>");
}

const section = (label: string, body: string) => `
      <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a8a8a;margin:24px 0 6px;">${label}</p>
      <p style="font-size:13px;color:#1a1a1a;line-height:1.6;margin:0;">${body}</p>`;

const button = (label: string, href: string) => `
      <p style="margin:28px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1a1a1a;color:#F9F9F7;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;">${escapeHtml(label)}</a></p>`;

/**
 * Your Base44 shared/orderEmail.ts, same look. Differences: values are
 * HTML-escaped, and a Discount row appears when a code was used (the old email
 * showed a total that didn't add up when there was a discount).
 */
export function orderEmailHtml(
  order: OrderForEmail,
  opts: { heading: string; message: string; button?: { label: string; href: string }; footer?: string; extra?: string },
): string {
  const sym = escapeHtml(order.currencySymbol || "");
  const money = (v: number | string | Prisma.Decimal) => `${sym}${Number(v).toFixed(2)}`;

  const rows = order.items
    .map(
      (it) => `
    <tr>
      <td style="padding:8px 0;color:#1a1a1a;">${escapeHtml(it.name)} × ${it.qty} <span style="color:#8a8a8a;">(${escapeHtml(it.color ?? "")}/${escapeHtml(it.size ?? "")})</span></td>
      <td style="padding:8px 0;text-align:right;color:#1a1a1a;">${money(Number(it.price) * it.qty)}</td>
    </tr>`,
    )
    .join("");

  const line = (label: string, amount: string) => `
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#8a8a8a;">${label}</td>
        <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;">${amount}</td>
      </tr>`;

  const totalRows: string[] = [];
  if (Number(order.subtotal) > 0) {
    totalRows.push(line("Subtotal", money(order.subtotal)));
    if (Number(order.discountAmount) > 0) {
      totalRows.push(line("Discount", `-${money(order.discountAmount)}`));
    }
    if (Number(order.shipping) > 0) totalRows.push(line("Shipping", money(order.shipping)));
    if (Number(order.tax) > 0) totalRows.push(line("Tax", money(order.tax)));
  }

  return `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#F9F9F7;padding:32px;">
      <p style="font-size:13px;letter-spacing:3px;color:#8a8a8a;margin:0 0 24px;">JAMAS</p>
      <h2 style="font-size:20px;color:#1a1a1a;margin:0 0 8px;">${escapeHtml(opts.heading)}</h2>
      <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px;">${escapeHtml(opts.message)}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e5e5;font-size:13px;">${rows}</table>
      ${totalRows.length ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${totalRows.join("")}</table>` : ""}
      <p style="font-size:14px;color:#1a1a1a;margin:16px 0 0;text-align:right;"><strong>Total: ${money(order.total)}</strong></p>
      ${opts.extra ?? ""}
      ${section("Ship to", shipToHtml(order))}
      ${order.trackingNumber ? section("Tracking", `${order.carrier ? escapeHtml(order.carrier) + " &middot; " : ""}${escapeHtml(order.trackingNumber)}`) : ""}
      ${opts.button ? button(opts.button.label, opts.button.href) : ""}
      <p style="font-size:12px;color:#8a8a8a;margin-top:32px;">${escapeHtml(opts.footer ?? "You can follow your order's progress in your account.")}</p>
    </div>`;
}

function viewOrderButton(order: OrderForEmail) {
  const base = appUrl();
  return base ? { label: "View your order", href: `${base}/account/orders/${order.id}` } : undefined;
}

export function sendOrderConfirmationEmail(order: OrderForEmail): Promise<SendResult> {
  const to = orderRecipient(order);
  if (!to) return Promise.resolve({ ok: false, error: "No recipient" });
  return sendEmail({
    to,
    subject: `Order ${order.orderNumber}: Confirmed`,
    html: orderEmailHtml(order, {
      heading: `Order ${order.orderNumber}: confirmed`,
      message:
        "Thank you for your order. We have received your payment and your order is confirmed — it is now being prepared.",
      button: viewOrderButton(order),
    }),
  });
}

export function sendOrderStatusEmail(
  order: OrderForEmail,
  status: OrderStatus,
): Promise<SendResult> {
  const to = orderRecipient(order);
  if (!to) return Promise.resolve({ ok: false, error: "No recipient" });
  return sendEmail({
    to,
    subject: `Order ${order.orderNumber}: ${titleCase(status)}`,
    html: orderEmailHtml(order, {
      heading: `Order ${order.orderNumber}: ${status}`,
      message: STATUS_MESSAGES[status] ?? "Your order status has been updated.",
      button: viewOrderButton(order),
    }),
  });
}

/**
 * Tells the store owner a new paid order came in. Recipients come from
 * ADMIN_NOTIFY_EMAIL (one address, or several separated by commas). If it is
 * not set, nothing is sent. Never throws.
 */
export async function sendAdminNewOrderEmail(order: OrderForEmail): Promise<SendResult> {
  const recipients = (process.env.ADMIN_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (recipients.length === 0) return { ok: false, error: "ADMIN_NOTIFY_EMAIL not set" };

  const base = appUrl();
  const sym = order.currencySymbol || "";
  const customer = [order.shipFullName, order.shipEmail || order.user?.email, order.shipPhone]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((v) => escapeHtml(v))
    .join("<br>");
  const html = orderEmailHtml(order, {
    heading: `New order ${order.orderNumber}`,
    message: `A customer has paid ${sym}${Number(order.total).toFixed(2)}${order.discountCode ? ` (code ${order.discountCode})` : ""}. The order is confirmed and ready to be prepared.`,
    extra: section("Customer", customer),
    button: base ? { label: "Open orders in admin", href: `${base}/admin/orders` } : undefined,
    footer: "You are receiving this because this address is set as the store's order notification email.",
  });

  const subject = `New order ${order.orderNumber} (${sym}${Number(order.total).toFixed(2)})`;
  let failed: SendResult | null = null;
  for (const to of recipients) {
    const res = await sendEmail({ to, subject, html }); // one at a time: Resend rate-limits bursts
    if (!res.ok) failed = res;
  }
  return failed ?? { ok: true };
}
