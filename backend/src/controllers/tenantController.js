import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { createVirtualAccount } from "../services/nombaService.js";
import { getReliabilityScore, createShareToken } from "../services/reliabilityService.js";
import { getCurrentCycleSummary } from "../services/reconciliationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const TIER_LIMITS = {
  "Tier 1": "Max balance ₦50,000 · ₦50,000 daily transfer limit",
  "Tier 2": "Max balance ₦200,000 · ₦200,000 daily transfer limit",
  "Tier 3": "No balance limit · No daily transfer limit",
};

// GET /api/tenants
export const listTenants = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("landlord_id", req.landlordId)
    .order("created_at", { ascending: true });
  if (error) throw ApiError.internal(error.message);
  const withCycle = await Promise.all(
    data.map(async (t) => ({ ...t, currentCycle: await getCurrentCycleSummary(t) }))
  );
  res.json(withCycle);
});

// GET /api/tenants/:id
export const getTenant = asyncHandler(async (req, res) => {
  const tenant = await fetchOwnedTenant(req.landlordId, req.params.id);
  const currentCycle = await getCurrentCycleSummary(tenant);
  res.json({ ...tenant, currentCycle });
});

// POST /api/tenants
// Creates the DB row AND provisions a real Nomba virtual account. If the
// Nomba call fails, no tenant row is created — the frontend should surface
// the error and let the landlord retry rather than end up with a tenant
// that has no way to collect rent.
export const createTenant = asyncHandler(async (req, res) => {
  const { name, unit, email, phone, moveInDate, rentAmount } = req.body;
  if (!name || !unit || !moveInDate) throw ApiError.badRequest("name, unit and moveInDate are required.");

  const tenantId = crypto.randomUUID();
  const accountRef = `rentstack-${tenantId}`; // 16-64 chars, satisfies Nomba's constraint

  const account = await createVirtualAccount({ accountRef, accountName: name });

  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      id: tenantId,
      landlord_id: req.landlordId,
      name,
      unit,
      email,
      phone,
      rent_amount: rentAmount || req.landlord.rent_per_unit || 85000,
      move_in_date: moveInDate,
      status: "UNPAID",
      nomba_account_ref: account.accountRef,
      virtual_account_number: account.accountNumber,
      bank_name: account.bankName,
      account_name: account.accountName,
    })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);

  res.status(201).json(tenant);
});

// PUT /api/tenants/:id
export const updateTenant = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id); // 404s if not owned
  const { name, unit, email, phone, rentAmount } = req.body;
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update({ name, unit, email, phone, rent_amount: rentAmount })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  res.json(data);
});

// POST /api/tenants/:id/offboard
export const offboardTenant = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ status: "CLOSED", move_out_date: new Date().toISOString().slice(0, 10) })
    .eq("id", req.params.id);
  if (error) throw ApiError.internal(error.message);

  // NOTE: this does not call Nomba's "expire a virtual account" endpoint
  // yet (POST .../v1/accounts/virtual/{ref}/expire per their docs) — add
  // that call here once you're ready to actually stop the account from
  // accepting further transfers.
  res.json({ success: true });
});

// GET /api/tenants/:id/transactions
export const getTenantTransactions = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("tenant_id", req.params.id)
    .order("occurred_at", { ascending: false });
  if (error) throw ApiError.internal(error.message);
  res.json(data);
});

// GET /api/tenants/:id/kyc
export const getTenantKyc = asyncHandler(async (req, res) => {
  const tenant = await fetchOwnedTenant(req.landlordId, req.params.id);
  const { data: latestChange } = await supabaseAdmin
    .from("tenant_kyc_events")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("changed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  res.json({
    tier: tenant.kyc_tier,
    limit: TIER_LIMITS[tenant.kyc_tier] || null,
    tierChange: latestChange
      ? { from: latestChange.from_tier, to: latestChange.to_tier, date: latestChange.changed_at, reason: latestChange.reason }
      : null,
  });
});

// GET /api/tenants/:id/reliability-score
export const getTenantReliabilityScore = asyncHandler(async (req, res) => {
  const score = await getReliabilityScore(req.params.id, req.landlordId);
  res.json(score);
});

// GET /api/tenants/:id/reliability-score/share
export const shareTenantReliabilityScore = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const token = createShareToken(req.params.id);
  res.json({ url: `${req.protocol}://${req.get("host")}/public/score/${token}` });
});

// GET /api/tenants/:id/statement/share
export const shareTenantStatement = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const token = createShareToken(req.params.id);
  res.json({ url: `${req.protocol}://${req.get("host")}/public/statement/${token}` });
});

// GET /api/tenants/:id/notifications
export const getTenantNotifications = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const { data, error } = await supabaseAdmin
    .from("notification_logs")
    .select("*")
    .eq("tenant_id", req.params.id)
    .order("sent_at", { ascending: false });
  if (error) throw ApiError.internal(error.message);
  res.json(data);
});

async function fetchOwnedTenant(landlordId, tenantId) {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .eq("landlord_id", landlordId)
    .single();
  if (error || !data) throw ApiError.notFound("Tenant not found.");
  return data;
}
