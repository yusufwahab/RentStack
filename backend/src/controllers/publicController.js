import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { getReliabilityScore, verifyShareToken } from "../services/reliabilityService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// These two routes are intentionally unauthenticated (no requireAuth) —
// that's the point of a "shareable" link. Authorization comes entirely
// from possessing a valid, unexpired token minted by createShareToken().
// The frontend does not render a page for these yet; for now they just
// return JSON. Building an actual public HTML statement/score page is a
// frontend task for later.

// GET /public/score/:token
export const publicScore = asyncHandler(async (req, res) => {
  const tenantId = verifyShareToken(req.params.token);
  if (!tenantId) throw ApiError.unauthorized("This link is invalid or has expired.");

  const { data: tenant } = await supabaseAdmin.from("tenants").select("name, unit").eq("id", tenantId).single();
  if (!tenant) throw ApiError.notFound("Tenant not found.");

  const score = await getReliabilityScore(tenantId);
  res.json({ tenant, ...score });
});

// GET /public/statement/:token
export const publicStatement = asyncHandler(async (req, res) => {
  const tenantId = verifyShareToken(req.params.token);
  if (!tenantId) throw ApiError.unauthorized("This link is invalid or has expired.");

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, unit, move_in_date")
    .eq("id", tenantId)
    .single();
  if (!tenant) throw ApiError.notFound("Tenant not found.");

  const { data: history } = await supabaseAdmin
    .from("payments")
    .select("amount, type, reference, occurred_at")
    .eq("tenant_id", tenantId)
    .order("occurred_at", { ascending: false });

  res.json({ tenant, history: history || [] });
});
