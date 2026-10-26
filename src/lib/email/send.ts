import { Resend } from "resend";

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Sends one email through Resend. Never throws: a failed email must not break
 * an order. Callers get { ok:false, error } and can log it.
 *
 * Resend's free tier only delivers to your own address until you verify a
 * domain at resend.com/domains. Set EMAIL_FROM to an address on that domain.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set, skipped: "${args.subject}"`);
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "JAMAS <onboarding@resend.dev>",
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    if (error) {
      console.error("[email] Resend error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed:", message);
    return { ok: false, error: message };
  }
}
