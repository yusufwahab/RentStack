import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { createVirtualAccount } from "../services/nombaService.js";
import { getReliabilityScore, createShareToken } from "../services/reliabilityService.js";
import { getCurrentCycleSummary, processIncomingTransfer } from "../services/reconciliationService.js";
import { getOrCreateDefaultProperty } from "./propertyController.js";
import { parseCsv } from "../utils/csv.js";
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
    data.map(async (t) => {
      const currentCycle = await getCurrentCycleSummary(t);
      return { ...t, status: currentCycle.status, currentCycle };
    })
  );
  res.json(withCycle);
});

// GET /api/tenants/:id
export const getTenant = asyncHandler(async (req, res) => {
  const tenant = await fetchOwnedTenant(req.landlordId, req.params.id);
  const currentCycle = await getCurrentCycleSummary(tenant);
  res.json({ ...tenant, status: currentCycle.status, currentCycle });
});

// Shared by the single-add endpoint and the bulk-CSV endpoint. Creates the
// DB row AND provisions a real Nomba virtual account. If the Nomba call
// fails, no tenant row is created — throws, letting the caller decide how
// to report the failure (a 500 for the single-add path, a per-row error
// for the bulk path).
async function createTenantRecord(landlord, propertyId, data) {
  const { name, unit, email, phone, moveInDate, rentAmount, leaseEndDate, serviceCharge, guarantorName, guarantorPhone, guarantorRelationship } = data;
  if (!name || !unit || !moveInDate) throw ApiError.badRequest("name, unit and moveInDate are required.");

  const tenantId = crypto.randomUUID();
  const accountRef = `rentstack-${tenantId}`; // 16-64 chars, satisfies Nomba's constraint

  const account = await createVirtualAccount({ accountRef, accountName: name });

  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      id: tenantId,
      landlord_id: landlord.id,
      property_id: propertyId,
      name,
      unit,
      email,
      phone,
      rent_amount: rentAmount || landlord.rent_per_unit || 85000,
      move_in_date: moveInDate,
      lease_end_date: leaseEndDate || null,
      service_charge: serviceCharge || 0,
      guarantor_name: guarantorName || null,
      guarantor_phone: guarantorPhone || null,
      guarantor_relationship: guarantorRelationship || null,
      status: "UNPAID",
      nomba_account_ref: account.accountRef,
      virtual_account_number: account.accountNumber,
      bank_name: account.bankName,
      account_name: account.accountName,
    })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);

  return tenant;
}

// POST /api/tenants
export const createTenant = asyncHandler(async (req, res) => {
  const propertyId = req.body.propertyId || (await getOrCreateDefaultProperty(req.landlord)).id;
  const tenant = await createTenantRecord(req.landlord, propertyId, req.body);
  res.status(201).json(tenant);
});

// POST /api/tenants/bulk
// Body: { propertyId, csv }. `csv` is raw pasted text with a header row:
// name,unit,email,phone,moveInDate,rentAmount. Processed sequentially (not
// Promise.all) so Nomba account provisioning isn't hammered concurrently,
// and so each row's success/failure can be attributed individually.
export const bulkCreateTenants = asyncHandler(async (req, res) => {
  const { csv } = req.body;
  if (!csv) throw ApiError.badRequest("csv is required.");
  const propertyId = req.body.propertyId || (await getOrCreateDefaultProperty(req.landlord)).id;

  const rows = parseCsv(csv);
  if (rows.length === 0) throw ApiError.badRequest("No data rows found in the pasted CSV.");

  const created = [];
  const failed = [];
  for (const [index, row] of rows.entries()) {
    try {
      const tenant = await createTenantRecord(req.landlord, propertyId, {
        name: row.name,
        unit: row.unit,
        email: row.email || undefined,
        phone: row.phone || undefined,
        moveInDate: row.moveInDate,
        rentAmount: row.rentAmount ? Number(row.rentAmount) : undefined,
      });
      created.push(tenant);
    } catch (err) {
      failed.push({ row: index + 2, name: row.name || "(no name)", error: err.message || "Failed to create tenant." });
    }
  }

  res.status(201).json({ created, failed });
});

// PUT /api/tenants/:id
export const updateTenant = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id); // 404s if not owned
  const { name, unit, email, phone, rentAmount, leaseEndDate, serviceCharge, guarantorName, guarantorPhone, guarantorRelationship } = req.body;
  const update = { name, unit, email, phone, rent_amount: rentAmount };
  if (leaseEndDate !== undefined) update.lease_end_date = leaseEndDate || null;
  if (serviceCharge !== undefined) update.service_charge = serviceCharge || 0;
  if (guarantorName !== undefined) update.guarantor_name = guarantorName || null;
  if (guarantorPhone !== undefined) update.guarantor_phone = guarantorPhone || null;
  if (guarantorRelationship !== undefined) update.guarantor_relationship = guarantorRelationship || null;

  const { data, error } = await supabaseAdmin.from("tenants").update(update).eq("id", req.params.id).select().single();
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

// POST /api/tenants/:id/process-payment
//
// "Tenant's View" test-payment button. Runs the payment through the exact
// same reconciliation engine a real Nomba webhook uses (processIncomingTransfer)
// — the only difference is the transfer is constructed here instead of parsed
// from a signed Nomba payload. Lets a landlord (or a judge) exercise the full
// full/partial/overpayment/disputed flow without a real bank transfer.
export const processPayment = asyncHandler(async (req, res) => {
  const tenant = await fetchOwnedTenant(req.landlordId, req.params.id);
  if (tenant.status === "CLOSED") throw ApiError.badRequest("This tenant has been offboarded.");

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) throw ApiError.badRequest("amount must be a positive number.");

  const transfer = {
    reference: `SIM-${crypto.randomUUID()}`,
    accountRef: tenant.nomba_account_ref,
    amount,
    senderBank: "RentStack (test payment)",
    senderAccountName: tenant.account_name,
    senderAccountNumber: tenant.virtual_account_number,
    occurredAt: new Date().toISOString(),
    rawPayload: null,
    source: "simulated",
  };

  const result = await processIncomingTransfer(transfer);
  res.status(201).json(result);
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
