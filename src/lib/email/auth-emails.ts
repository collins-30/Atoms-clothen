import { sendEmail, type SendResult } from "./send";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Same look as your order emails (ATELIER header, off-white card).
function shell(heading: string, inner: string) {
  return `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#F9F9F7;padding:32px;">
      <p style="font-size:13px;letter-spacing:3px;color:#8a8a8a;margin:0 0 24px;">ATELIER</p>
      <h2 style="font-size:20px;color:#1a1a1a;margin:0 0 8px;">${escapeHtml(heading)}</h2>
      ${inner}
    </div>`;
}

/**
 * While you're developing, a missing or unverified Resend setup would leave you
 * locked out of your own sign-up. So in development ONLY, the code/link is also
 * printed in the terminal that runs `npm run dev`. Never printed in production.
 */
function devEcho(label: string, to: string, secret: string) {
  if (process.env.NODE_ENV === "development") console.info(`[dev only] ${label} for ${to}: ${secret}`);
}

export async function sendVerificationCodeEmail(to: string, code: string): Promise<SendResult> {
  devEcho("verification code", to, code);
  return sendEmail({
    to,
    subject: `${code} is your Atelier verification code`,
    html: shell(
      "Verify your email",
      `<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Enter this code to finish creating your account. It expires in 15 minutes.</p>
       <p style="font-size:32px;letter-spacing:8px;color:#1a1a1a;margin:0 0 20px;font-family:'Courier New',monospace;"><strong>${escapeHtml(code)}</strong></p>
       <p style="font-size:12px;color:#8a8a8a;margin-top:32px;">If you didn't request this, you can ignore this email.</p>`,
    ),
  });
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<SendResult> {
  devEcho("password reset link", to, link);
  return sendEmail({
    to,
    subject: "Reset your Atelier password",
    html: shell(
      "Reset your password",
      `<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Click the button below to choose a new password. The link works once and expires in 1 hour.</p>
       <p style="margin:0 0 20px;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#1a1a1a;color:#F9F9F7;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;">Reset password</a></p>
       <p style="font-size:12px;color:#8a8a8a;margin-top:32px;">If you didn't ask for this, you can ignore this email. Your password won't change.</p>`,
    ),
  });
}
