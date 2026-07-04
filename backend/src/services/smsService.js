import { env } from "../config/env.js";

// Termii SMS client. Request/response shape confirmed from
// developers.termii.com/messaging-api. The base host below
// (api.ng.termii.com) is the widely-documented Termii API host, but
// their docs page itself renders it as a template placeholder rather
// than literal text — double-check it against your Termii dashboard
// before going live. See backend/README.md.
const TERMII_BASE_URL = "https://api.ng.termii.com";

function messageFor(tenant, payment) {
  const firstName = (tenant.name || "").split(" ")[0];
  const amount = Number(payment.amount).toLocaleString("en-NG");
  return `RentStack: Hi ${firstName}, we've received your payment of ₦${amount} for ${tenant.unit}. Thank you.`;
}

// Payment types that represent money that actually belongs to a tenant —
// misdirected/returned payments never had a tenant, so no SMS is sent.
const NOTIFIABLE_TYPES = ["full", "partial", "overpayment", "disputed"];

export function shouldNotify(paymentType) {
  return NOTIFIABLE_TYPES.includes(paymentType);
}

// Sends the receipt SMS and returns what to persist in sms_logs — callers
// (reconciliationService) decide whether/how to store the result; this
// function never throws for a failed send, it returns { success: false }
// so a flaky SMS provider never blocks payment reconciliation.
export async function sendPaymentReceiptSms(tenant, payment) {
  if (!env.termii.apiKey) {
    return { success: false, error: "TERMII_API_KEY not configured.", message: messageFor(tenant, payment) };
  }
  if (!tenant.phone) {
    return { success: false, error: "Tenant has no phone number on file.", message: messageFor(tenant, payment) };
  }

  const message = messageFor(tenant, payment);

  try {
    const res = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.termii.apiKey,
        to: normalizeToInternational(tenant.phone),
        from: env.termii.senderId,
        sms: message,
        type: "plain",
        channel: "dnd", // "dnd" = transactional route; use "generic" for promo-only sender IDs
      }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok || body?.code !== "ok") {
      return { success: false, error: body?.message || `Termii request failed (${res.status})`, message };
    }
    return { success: true, providerMessageId: body.message_id, message };
  } catch (err) {
    return { success: false, error: err.message, message };
  }
}

// Termii expects international format (234XXXXXXXXXX) without a leading '+' or '0'.
function normalizeToInternational(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}
