import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

async function fetchOwnedTenant(landlordId, tenantId) {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, unit")
    .eq("id", tenantId)
    .eq("landlord_id", landlordId)
    .single();
  if (error || !data) throw ApiError.notFound("Tenant not found.");
  return data;
}

// GET /api/tenants/:id/maintenance-requests
export const listTenantMaintenanceRequests = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const { data, error } = await supabaseAdmin
    .from("maintenance_requests")
    .select("*")
    .eq("tenant_id", req.params.id)
    .order("created_at", { ascending: false });
  if (error) throw ApiError.internal(error.message);
  res.json(data);
});

// POST /api/tenants/:id/maintenance-requests — body { title, description }.
export const createMaintenanceRequest = asyncHandler(async (req, res) => {
  await fetchOwnedTenant(req.landlordId, req.params.id);
  const { title, description } = req.body;
  if (!title) throw ApiError.badRequest("title is required.");

  const { data, error } = await supabaseAdmin
    .from("maintenance_requests")
    .insert({ tenant_id: req.params.id, landlord_id: req.landlordId, title, description })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  res.status(201).json(data);
});

// GET /api/maintenance — every request across the landlord's tenants, with
// tenant name/unit joined in so the queue page doesn't need N+1 lookups.
export const listMaintenanceRequests = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("maintenance_requests")
    .select("*, tenants(name, unit)")
    .eq("landlord_id", req.landlordId)
    .order("created_at", { ascending: false });
  if (error) throw ApiError.internal(error.message);
  res.json(
    data.map((r) => {
      const { tenants, ...rest } = r;
      return { ...rest, tenantName: tenants?.name || "Unknown", unit: tenants?.unit || "—" };
    })
  );
});

// PUT /api/maintenance/:id — body { status }.
export const updateMaintenanceRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status)) throw ApiError.badRequest("Invalid status.");

  const { data, error } = await supabaseAdmin
    .from("maintenance_requests")
    .update({ status, resolved_at: status === "RESOLVED" ? new Date().toISOString() : null })
    .eq("id", req.params.id)
    .eq("landlord_id", req.landlordId)
    .select()
    .single();
  if (error || !data) throw ApiError.notFound("Maintenance request not found.");
  res.json(data);
});
