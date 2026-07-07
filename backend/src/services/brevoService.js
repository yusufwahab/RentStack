import { env } from "../config/env.js";

// Brevo transactional email client. Endpoint/payload confirmed from
// developers.brevo.com/docs/send-a-transactional-email (fetched while
// building this, not guessed):
//   POST https://api.brevo.com/v3/smtp/email
//   headers: api-key, content-type: application/json
//   body: { sender: {email,name}, to: [{email,name}], subject, htmlContent }
//   -> 201 { messageId }
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

// Never throws — a failed email should never block a signup, a payment
// reconciliation, or anything else. Callers get { success, error? } and
// decide what to log.
export async function sendEmail({ to, toName, subject, html }) {
  if (!env.brevo.apiKey) {
    return { success: false, error: "BREVO_API_KEY not configured." };
  }
  if (!to) {
    return { success: false, error: "No recipient email address." };
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": env.brevo.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: env.brevo.senderEmail, name: env.brevo.senderName },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, error: body?.message || `Brevo request failed (${res.status})` };
    }
    return { success: true, messageId: body?.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function otpEmailHtml(code) {
  return `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <h2 style="color:#0B1F17;margin-bottom:8px">Verify your email</h2>
      <p style="color:#334155;font-size:14px">Use this code to finish creating your RentStack account. It expires in 10 minutes.</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#15803D;margin:24px 0">${code}</p>
      <p style="color:#64748B;font-size:12px">If you didn't request this, you can ignore this email.</p>
    </div>`;
}

export function paymentReceiptEmailHtml(tenant, payment) {
  const amount = Number(payment.amount).toLocaleString("en-NG");
  return `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <h2 style="color:#0B1F17;margin-bottom:8px">Payment received</h2>
      <p style="color:#334155;font-size:14px">Hi ${tenant.name.split(" ")[0]}, we've received your payment of
        <strong>₦${amount}</strong> for ${tenant.unit}. Thank you.</p>
      <p style="color:#64748B;font-size:12px">Reference: ${payment.reference}</p>
    </div>`;
}
