import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// GET /api/properties — includes per-property unit counts so the
// Properties page and Add-Tenant dropdown don't need a second round trip.
export const listProperties = asyncHandler(async (req, res) => {
  const { data: properties, error } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("landlord_id", req.landlordId)
    .order("created_at", { ascending: true });
  if (error) throw ApiError.internal(error.message);

  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, property_id, status")
    .eq("landlord_id", req.landlordId);

  const withCounts = properties.map((p) => {
    const own = (tenants || []).filter((t) => t.property_id === p.id);
    return {
      ...p,
      totalUnits: own.length,
      occupiedUnits: own.filter((t) => t.status !== "CLOSED").length,
    };
  });

  res.json(withCounts);
});

// POST /api/properties
export const createProperty = asyncHandler(async (req, res) => {
  const { name, address } = req.body;
  if (!name) throw ApiError.badRequest("name is required.");

  const { data, error } = await supabaseAdmin
    .from("properties")
    .insert({ landlord_id: req.landlordId, name, address })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  res.status(201).json(data);
});

// PUT /api/properties/:id
export const updateProperty = asyncHandler(async (req, res) => {
  await fetchOwnedProperty(req.landlordId, req.params.id);
  const { name, address } = req.body;
  const { data, error } = await supabaseAdmin
    .from("properties")
    .update({ name, address })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  res.json(data);
});

// DELETE /api/properties/:id — refused while any tenant (including
// offboarded/CLOSED ones) is still attached, so history never dangles.
export const deleteProperty = asyncHandler(async (req, res) => {
  await fetchOwnedProperty(req.landlordId, req.params.id);

  const { count } = await supabaseAdmin
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("property_id", req.params.id);
  if (count > 0) throw ApiError.conflict("This property still has tenants attached — move or offboard them first.");

  const { error } = await supabaseAdmin.from("properties").delete().eq("id", req.params.id);
  if (error) throw ApiError.internal(error.message);
  res.json({ success: true });
});

async function fetchOwnedProperty(landlordId, propertyId) {
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .eq("landlord_id", landlordId)
    .single();
  if (error || !data) throw ApiError.notFound("Property not found.");
  return data;
}

// Lazily gets-or-creates a landlord's default property, seeded from their
// legacy `property_name`/`property_address` columns — keeps the
// single-property flow (POST /api/tenants with no propertyId) working
// unmodified for landlords who never explicitly created a property.
export async function getOrCreateDefaultProperty(landlord) {
  const { data: existing } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("landlord_id", landlord.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabaseAdmin
    .from("properties")
    .insert({
      landlord_id: landlord.id,
      name: landlord.property_name || "My Property",
      address: landlord.property_address || null,
    })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return created;
}
