import { env } from "../config/env.js";

// Termii transactional SMS — Nigerian SMS provider, used as a fallback
// channel alongside email for reminders (basic pass: sent alongside email,
// not conditionally on email failure — a true "fallback" would need to
// inspect Brevo's delivery status, which isn't available synchronously).
const TERMII_URL = "https://api.ng.termii.com/api/sms/send";

// Never throws — same contract as brevoService.sendEmail. No API key
// configured is a normal, supported state (SMS is optional), not an error
// worth surfacing to the caller as a failure.
export async function sendSms({ to, message }) {
  if (!env.termii.apiKey) {
    return { success: false, error: "TERMII_API_KEY not configured — SMS skipped." };
  }
  if (!to) {
    return { success: false, error: "No recipient phone number." };
  }

  try {
    const res = await fetch(TERMII_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: env.termii.apiKey,
        to,
        from: env.termii.senderId,
        sms: message,
        type: "plain",
        channel: "generic",
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, error: body?.message || `Termii request failed (${res.status})` };
    }
    return { success: true, messageId: body?.message_id || null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
