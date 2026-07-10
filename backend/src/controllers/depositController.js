import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

async function fetchOwnedTenant(landlordId, tenantId) {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .eq("landlord_id", landlordId)
    .single();
  if (error || !data) throw ApiError.notFound("Tenant not found.");
}

// GET /api/tenants/:id/deposit — most recent deposit record, or null.
export const getDeposit = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const { data } = await supabaseAdmin
    .from("deposits")
    .select("*")
    .eq("tenant_id", req.params.id)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  res.json(data || null);
});

// POST /api/tenants/:id/deposit — records a new deposit. One HELD/
// PARTIALLY_REFUNDED deposit at a time per tenant (basic — not a full
// multi-transaction ledger).
export const recordDeposit = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) throw ApiError.badRequest("amount must be a positive number.");

  const { data: existing } = await supabaseAdmin
    .from("deposits")
    .select("id")
    .eq("tenant_id", req.params.id)
    .eq("status", "HELD")
    .maybeSingle();
  if (existing) throw ApiError.conflict("A deposit is already on record for this tenant.");

  const { data, error } = await supabaseAdmin
    .from("deposits")
    .insert({ tenant_id: req.params.id, landlord_id: req.landlordId, amount })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  res.status(201).json(data);
});

// POST /api/tenants/:id/deposit/refund — body { deductions, reason }. A
// one-shot terminal action (this basic model has no "still pending"
// partial-refund state): deductions >= amount forfeits the whole deposit;
// 0 < deductions < amount refunds the remainder and keeps the deduction on
// record; deductions === 0 fully refunds.
export const refundDeposit = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const { data: deposit } = await supabaseAdmin
    .from("deposits")
    .select("*")
    .eq("tenant_id", req.params.id)
    .eq("status", "HELD")
    .maybeSingle();
  if (!deposit) throw ApiError.notFound("No held deposit found for this tenant.");

  const deductions = Number(req.body.deductions) || 0;
  if (deductions < 0) throw ApiError.badRequest("deductions cannot be negative.");
  const status = deductions >= Number(deposit.amount) ? "FORFEITED" : deductions > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED";

  const { data, error } = await supabaseAdmin
    .from("deposits")
    .update({
      deductions,
      deduction_reason: req.body.reason || null,
      status,
      refunded_at: new Date().toISOString(),
    })
    .eq("id", deposit.id)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  res.json(data);
});
