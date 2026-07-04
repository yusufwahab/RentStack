import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { transferToBank, fetchBankCodes } from "../services/nombaService.js";
import { refreshTenantStatus } from "../services/reconciliationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// GET /api/payments — a landlord's own payment ledger (never includes
// unresolved misdirected payments — see getMisdirectedPayments below).
export const listPayments = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("*, tenants(name, unit)")
    .eq("landlord_id", req.landlordId)
    .order("occurred_at", { ascending: false });
  if (error) throw ApiError.internal(error.message);
  res.json(data.map(flattenTenant));
});

// GET /api/payments/misdirected
//
// KNOWN SIMPLIFICATION: a payment only ends up here when its accountRef
// matched no tenant in the whole database, which means we structurally
// don't know which landlord it belongs to (see the comment on
// `payments.landlord_id` in schema.sql). Rather than hide these
// permanently, they're surfaced to *every* authenticated landlord — the
// assign action below is what actually attaches an owner. For real
// multi-landlord isolation, provision each landlord as a distinct Nomba
// sub-account (see "create-virtual-account-for-sub-account" in Nomba's
// docs) so ownership is unambiguous even before assignment.
export const getMisdirectedPayments = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("*")
    .is("tenant_id", null)
    .eq("resolved", false)
    .order("occurred_at", { ascending: false });
  if (error) throw ApiError.internal(error.message);
  res.json(data);
});

// POST /api/payments/:id/assign  { tenantId }
export const assignMisdirectedPayment = asyncHandler(async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) throw ApiError.badRequest("tenantId is required.");

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("id", req.params.id)
    .is("tenant_id", null)
    .single();
  if (!payment) throw ApiError.notFound("Misdirected payment not found (already resolved?).");

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .eq("landlord_id", req.landlordId)
    .single();
  if (!tenant) throw ApiError.notFound("Tenant not found.");

  const { error } = await supabaseAdmin
    .from("payments")
    .update({
      tenant_id: tenant.id,
      landlord_id: req.landlordId,
      resolved: true,
      type: Number(payment.amount) >= Number(tenant.rent_amount) ? "full" : "partial",
    })
    .eq("id", payment.id);
  if (error) throw ApiError.internal(error.message);

  await refreshTenantStatus(tenant.id);
  res.json({ success: true });
});

// POST /api/payments/:id/return
// Sends the money back to whoever sent it, via Nomba's bank transfer API.
// Requires the original sender's account number + a resolvable bank code
// (looked up by matching sender_bank against Nomba's bank list) — see the
// caveat in nombaService.extractIncomingTransfer about how reliable
// sender_bank/sender_account_number are from the webhook payload today.
export const returnMisdirectedPayment = asyncHandler(async (req, res) => {
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("id", req.params.id)
    .is("tenant_id", null)
    .single();
  if (!payment) throw ApiError.notFound("Misdirected payment not found (already resolved?).");
  if (!payment.sender_account_number || !payment.sender_bank) {
    throw ApiError.badRequest("Missing sender account details — cannot auto-return this payment.");
  }

  const banks = await fetchBankCodes();
  const bank = banks.find((b) => b.name.toLowerCase().includes(payment.sender_bank.toLowerCase()));
  if (!bank) throw ApiError.badRequest(`Could not resolve a bank code for "${payment.sender_bank}".`);

  await transferToBank({
    amount: payment.amount,
    accountNumber: payment.sender_account_number,
    bankCode: bank.code,
    accountName: payment.sender_account_name,
    merchantTxRef: `return-${payment.id}`,
    narration: "RentStack: returning misdirected payment",
  });

  const { error } = await supabaseAdmin
    .from("payments")
    .update({ resolved: true, type: "returned" })
    .eq("id", payment.id);
  if (error) throw ApiError.internal(error.message);

  res.json({ success: true });
});

function flattenTenant(payment) {
  const { tenants, ...rest } = payment;
  return { ...rest, tenantName: tenants?.name || null, unit: tenants?.unit || null };
}
