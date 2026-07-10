import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { dueDayOf } from "../utils/cycles.js";
import { getCurrentCycleSummary } from "./reconciliationService.js";
import {
  sendEmail,
  rentReminderEmailHtml,
  rentReminderSummary,
  leaseRenewalEmailHtml,
  leaseRenewalSummary,
} from "./brevoService.js";
import { sendSms } from "./termiiService.js";

// How many days before the due date to send a reminder — 3 days ahead,
// and again on the due date itself.
const REMINDER_WINDOWS = [3, 0];

// Sends a rent reminder to every active tenant whose due date falls within
// REMINDER_WINDOWS and whose current cycle isn't already settled (respects
// carry-forward credit via getCurrentCycleSummary — a tenant fully covered
// by credit gets no reminder). Scoped to one landlord for the manual
// "Send Reminders Now" button, or every landlord's tenants for the daily
// cron job. Returns the number of reminders actually sent.
export async function runRentReminders(landlordId = null) {
  let query = supabaseAdmin.from("tenants").select("*").neq("status", "CLOSED").not("email", "is", null);
  if (landlordId) query = query.eq("landlord_id", landlordId);
  const { data: tenants } = await query;
  if (!tenants || tenants.length === 0) return 0;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Dedup: skip anyone who already got a reminder today (handles the cron
  // firing more than once, or the manual button being clicked twice).
  const { data: sentToday } = await supabaseAdmin
    .from("notification_logs")
    .select("tenant_id")
    .eq("kind", "reminder")
    .gte("sent_at", todayStart.toISOString());
  const alreadySent = new Set((sentToday || []).map((r) => r.tenant_id));

  let sentCount = 0;
  for (const tenant of tenants) {
    if (alreadySent.has(tenant.id)) continue;

    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDayOf(tenant));
    const daysUntilDue = Math.round((dueDate - todayStart) / (1000 * 60 * 60 * 24));
    if (!REMINDER_WINDOWS.includes(daysUntilDue)) continue;

    const currentCycle = await getCurrentCycleSummary(tenant);
    if (currentCycle.status === "PAID" || currentCycle.status === "OVERPAID") continue;

    const subject = "Rent reminder — RentStack";
    const summary = rentReminderSummary(tenant, daysUntilDue, currentCycle.balance);
    const html = rentReminderEmailHtml(tenant, daysUntilDue, currentCycle.balance);
    const result = await sendEmail({ to: tenant.email, toName: tenant.name, subject, html });
    await supabaseAdmin.from("notification_logs").insert({
      tenant_id: tenant.id,
      channel: "email",
      kind: "reminder",
      to_address: tenant.email,
      subject,
      message: summary,
      status: result.success ? "sent" : "failed",
      provider_message_id: result.messageId || null,
    });

    // SMS fallback channel — sent alongside email (not conditional on it
    // failing), only when the tenant has a phone number and Termii is
    // configured (sendSms no-ops otherwise).
    if (tenant.phone) {
      const smsResult = await sendSms({ to: tenant.phone, message: summary });
      await supabaseAdmin.from("notification_logs").insert({
        tenant_id: tenant.id,
        channel: "sms",
        kind: "reminder",
        to_address: tenant.phone,
        subject,
        message: summary,
        status: smsResult.success ? "sent" : "failed",
        provider_message_id: smsResult.messageId || null,
      });
    }

    sentCount++;
  }

  return sentCount;
}

// Lease-expiry heads-up — a single 30-day-out threshold (basic: no repeat
// windows like rent reminders have). Same dedup approach: skip anyone
// already sent a lease_reminder in the last 30 days, so this is safe to
// call daily without spamming.
const LEASE_REMINDER_WINDOW_DAYS = 30;

export async function runLeaseRenewalReminders(landlordId = null) {
  let query = supabaseAdmin
    .from("tenants")
    .select("*")
    .neq("status", "CLOSED")
    .not("email", "is", null)
    .not("lease_end_date", "is", null);
  if (landlordId) query = query.eq("landlord_id", landlordId);
  const { data: tenants } = await query;
  if (!tenants || tenants.length === 0) return 0;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const windowStart = new Date(todayStart);
  windowStart.setDate(windowStart.getDate() - LEASE_REMINDER_WINDOW_DAYS);

  const { data: sentRecently } = await supabaseAdmin
    .from("notification_logs")
    .select("tenant_id")
    .eq("kind", "lease_reminder")
    .gte("sent_at", windowStart.toISOString());
  const alreadySent = new Set((sentRecently || []).map((r) => r.tenant_id));

  let sentCount = 0;
  for (const tenant of tenants) {
    if (alreadySent.has(tenant.id)) continue;

    const daysUntilEnd = Math.round((new Date(tenant.lease_end_date) - todayStart) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd < 0 || daysUntilEnd > LEASE_REMINDER_WINDOW_DAYS) continue;

    const subject = "Lease renewal coming up — RentStack";
    const html = leaseRenewalEmailHtml(tenant, daysUntilEnd);
    const result = await sendEmail({ to: tenant.email, toName: tenant.name, subject, html });
    await supabaseAdmin.from("notification_logs").insert({
      tenant_id: tenant.id,
      channel: "email",
      kind: "lease_reminder",
      to_address: tenant.email,
      subject,
      message: leaseRenewalSummary(tenant, daysUntilEnd),
      status: result.success ? "sent" : "failed",
      provider_message_id: result.messageId || null,
    });
    sentCount++;
  }

  return sentCount;
}
