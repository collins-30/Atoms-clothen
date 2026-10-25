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
  return order.shipEmail || order.user?.email || null;
}

/**
 * Your Base44 shared/orderEmail.ts, same look. Differences: values are
 * HTML-escaped, and a Discount row appears when a code was used (the old email
 * showed a total that didn't add up when there was a discount).
 */
export function orderEmailHtml(
  order: OrderForEmail,
  opts: { heading: string; message: string },
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
      <p style="font-size:13px;letter-spacing:3px;color:#8a8a8a;margin:0 0 24px;">ATELIER</p>
      <h2 style="font-size:20px;color:#1a1a1a;margin:0 0 8px;">${escapeHtml(opts.heading)}</h2>
      <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px;">${escapeHtml(opts.message)}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e5e5;font-size:13px;">${rows}</table>
      ${totalRows.length ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${totalRows.join("")}</table>` : ""}
      <p style="font-size:14px;color:#1a1a1a;margin:16px 0 0;text-align:right;"><strong>Total: ${money(order.total)}</strong></p>
      <p style="font-size:12px;color:#8a8a8a;margin-top:32px;">You can follow your order's progress in your account.</p>
    </div>`;
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
    }),
  });
}
