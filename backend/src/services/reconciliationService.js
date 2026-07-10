import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  sendEmail,
  paymentReceiptEmailHtml,
  paymentReceiptSummary,
  landlordPaymentAlertEmailHtml,
  landlordPaymentAlertSummary,
} from "./brevoService.js";
import { currentCycleKey, cycleBounds, classifyCycle } from "../utils/cycles.js";

// Payment types that represent money that actually belongs to a tenant —
// misdirected/returned payments never had a tenant, so no receipt email
// is sent for them. Also used to decide when the landlord gets alerted —
// misdirected payments have no known landlord_id to alert anyway (see
// schema.sql comment on payments.landlord_id).
const NOTIFIABLE_TYPES = ["full", "partial", "overpayment", "disputed"];

// Nigerian names are commonly rendered in different orders/cases across
// bank apps ("EZE CHIAMAKA" vs "Chiamaka Eze"), so we compare the *set* of
// words rather than requiring an exact string match before flagging a
// sender-name mismatch as disputed.
function namesLooselyMatch(a, b) {
  if (!a || !b) return true; // can't compare — don't falsely flag as disputed
  const normalize = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .sort();
  const wordsA = normalize(a);
  const wordsB = normalize(b);
  return wordsA.some((w) => wordsB.includes(w));
}

// Core of the "payment state machine": takes one already-parsed incoming
// transfer (see nombaService.extractIncomingTransfer) and turns it into a
// row in `payments`, updating the tenant's cached status. Idempotent on
// `reference` — safe to call twice for the same Nomba transaction (Nomba
// retries webhooks on anything but a 2XX response).
export async function processIncomingTransfer(transfer) {
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("reference", transfer.reference)
    .maybeSingle();
  if (existing) return { status: "duplicate", paymentId: existing.id };

  let tenant = null;
  if (transfer.accountRef) {
    const { data } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("nomba_account_ref", transfer.accountRef)
      .maybeSingle();
    tenant = data;
  }

  const nameMismatch = tenant && !namesLooselyMatch(transfer.senderAccountName, tenant.accountName);
  const type = !tenant ? "misdirected" : nameMismatch ? "disputed" : await classifyAgainstCycle(tenant, transfer.amount);

  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .insert({
      landlord_id: tenant?.landlord_id ?? null,
      tenant_id: tenant?.id ?? null,
      amount: transfer.amount,
      type,
      reference: transfer.reference,
      sender_bank: transfer.senderBank,
      sender_account_name: transfer.senderAccountName,
      sender_account_number: transfer.senderAccountNumber,
      nomba_account_ref: transfer.accountRef,
      occurred_at: transfer.occurredAt,
      raw_payload: transfer.rawPayload ?? null,
      source: transfer.source || "nomba",
    })
    .select()
    .single();
  if (error) throw error;

  if (tenant) {
    await refreshTenantStatus(tenant.id);
  }

  if (tenant && NOTIFIABLE_TYPES.includes(type) && tenant.email) {
    const subject = "Payment received — RentStack";
    const html = paymentReceiptEmailHtml(tenant, payment);
    const result = await sendEmail({ to: tenant.email, toName: tenant.name, subject, html });
    await supabaseAdmin.from("notification_logs").insert({
      tenant_id: tenant.id,
      payment_id: payment.id,
      channel: "email",
      kind: "receipt",
      to_address: tenant.email,
      subject,
      message: paymentReceiptSummary(tenant, payment),
      status: result.success ? "sent" : "failed",
      provider_message_id: result.messageId || null,
    });
  }

  if (tenant && NOTIFIABLE_TYPES.includes(type) && tenant.landlord_id) {
    const { data: landlord } = await supabaseAdmin
      .from("landlords")
      .select("name, email")
      .eq("id", tenant.landlord_id)
      .maybeSingle();
    if (landlord?.email) {
      const subject = `${type === "full" ? "Payment" : type[0].toUpperCase() + type.slice(1)} received from ${tenant.name}`;
      const html = landlordPaymentAlertEmailHtml(landlord, tenant, payment, type);
      const result = await sendEmail({ to: landlord.email, toName: landlord.name, subject, html });
      await supabaseAdmin.from("notification_logs").insert({
        tenant_id: tenant.id,
        payment_id: payment.id,
        channel: "email",
        kind: "landlord_alert",
        to_address: landlord.email,
        subject,
        message: landlordPaymentAlertSummary(landlord, tenant, payment, type),
        status: result.success ? "sent" : "failed",
        provider_message_id: result.messageId || null,
      });
    }
  }

  return { status: "processed", paymentId: payment.id, type, tenantId: tenant?.id ?? null };
}

// Compares this cycle's *total so far, including this new transfer* (plus
// any carried credit) against rent due, to decide full/partial/overpayment.
// Mirrors classifyCycle's "available funds" model in utils/cycles.js.
async function classifyAgainstCycle(tenant, incomingAmount) {
  const cycle = currentCycleKey();
  const { start, end } = cycleBounds(cycle);
  const { data: cyclePayments } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("tenant_id", tenant.id)
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString());

  const priorTotal = (cyclePayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const newTotal = priorTotal + Number(incomingAmount);
  const available = newTotal + Number(tenant.credit_balance || 0);

  if (available === Number(tenant.rent_amount)) return "full";
  if (available < Number(tenant.rent_amount)) return "partial";
  return "overpayment";
}

// Recomputes and caches a tenant's `status` (and `credit_balance`) from the
// current cycle's payments — called after every processed transfer and
// after misdirected-payment resolution so `tenants.status` never drifts
// from the underlying payment history. Credit is only ever written here
// (single source of truth): consumed to 0 on PAID, replenished to the
// leftover on OVERPAID, left untouched otherwise (PARTIAL/UNPAID/DISPUTED
// mean the cycle hasn't resolved, so nothing's been consumed yet).
export async function refreshTenantStatus(tenantId) {
  const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", tenantId).single();
  if (!tenant || tenant.status === "CLOSED") return;

  const cycle = currentCycleKey();
  const { start, end } = cycleBounds(cycle);
  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("amount, type")
    .eq("tenant_id", tenantId)
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString());

  const summary = classifyCycle(payments || [], Number(tenant.rent_amount), Number(tenant.credit_balance || 0));

  const update = { status: summary.status };
  if (summary.status === "PAID" || summary.status === "OVERPAID") {
    update.credit_balance = summary.credit;
  }

  await supabaseAdmin.from("tenants").update(update).eq("id", tenantId);
}

// Current cycle's { status, due, paid, balance, credit, creditApplied } for
// a tenant — used by the tenant list/detail endpoints so the frontend gets
// a live, credit-aware status even before any new payment triggers
// refreshTenantStatus (e.g. a tenant fully covered by carried credit with
// zero new payments this cycle).
export async function getCurrentCycleSummary(tenant) {
  if (tenant.status === "CLOSED") return { status: "CLOSED", due: 0, paid: 0, balance: 0, credit: 0, creditApplied: 0 };
  const { start, end } = cycleBounds(currentCycleKey());
  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("amount, type")
    .eq("tenant_id", tenant.id)
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString());
  return classifyCycle(payments || [], Number(tenant.rent_amount), Number(tenant.credit_balance || 0));
}
