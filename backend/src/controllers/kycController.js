import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// GET /api/kyc/alerts
// Every unacknowledged KYC tier change for one of this landlord's tenants —
// surfaced on the dashboard so a downgrade (which can silently cut a
// tenant's transfer limit under CBN's tiered KYC rules) explains itself
// before it shows up as a missed or partial payment.
export const getKycAlerts = asyncHandler(async (req, res) => {
  const { data: tenants } = await supabaseAdmin.from("tenants").select("id, name, unit").eq("landlord_id", req.landlordId);
  const tenantIds = (tenants || []).map((t) => t.id);
  if (tenantIds.length === 0) return res.json([]);

  const { data: events } = await supabaseAdmin
    .from("tenant_kyc_events")
    .select("*")
    .in("tenant_id", tenantIds)
    .eq("acknowledged", false)
    .order("changed_at", { ascending: false });

  const alerts = (events || []).map((e) => {
    const tenant = tenants.find((t) => t.id === e.tenant_id);
    return {
      id: e.id,
      tenantId: e.tenant_id,
      tenantName: tenant?.name,
      unit: tenant?.unit,
      from: e.from_tier,
      to: e.to_tier,
      date: e.changed_at,
      reason: e.reason,
    };
  });
  res.json(alerts);
});

// POST /api/kyc/alerts/:id/acknowledge
export const acknowledgeKycAlert = asyncHandler(async (req, res) => {
  const { data: event } = await supabaseAdmin
    .from("tenant_kyc_events")
    .select("id, tenant_id, tenants!inner(landlord_id)")
    .eq("id", req.params.id)
    .eq("tenants.landlord_id", req.landlordId)
    .maybeSingle();
  if (!event) throw ApiError.notFound("KYC alert not found.");

  await supabaseAdmin.from("tenant_kyc_events").update({ acknowledged: true }).eq("id", req.params.id);
  res.json({ success: true });
});
