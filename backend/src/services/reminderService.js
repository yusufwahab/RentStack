import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { dueDayOf } from "../utils/cycles.js";
import { getCurrentCycleSummary } from "./reconciliationService.js";
import { sendEmail, rentReminderEmailHtml, rentReminderSummary } from "./brevoService.js";

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
    const html = rentReminderEmailHtml(tenant, daysUntilDue, currentCycle.balance);
    const result = await sendEmail({ to: tenant.email, toName: tenant.name, subject, html });
    await supabaseAdmin.from("notification_logs").insert({
      tenant_id: tenant.id,
      channel: "email",
      kind: "reminder",
      to_address: tenant.email,
      subject,
      message: rentReminderSummary(tenant, daysUntilDue, currentCycle.balance),
      status: result.success ? "sent" : "failed",
      provider_message_id: result.messageId || null,
    });
    sentCount++;
  }

  return sentCount;
}
