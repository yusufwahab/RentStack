import { supabaseAuth, supabaseAdmin } from "../config/supabaseAdmin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// Verifies the Supabase access token sent as `Authorization: Bearer <token>`
// (issued by POST /api/auth/login) and attaches the landlord's id + profile
// row to the request. Every route under /api/tenants, /api/payments,
// /api/dashboard, /api/reports and /api/kyc should sit behind this.
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized("Missing bearer token.");

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) throw ApiError.unauthorized("Invalid or expired session.");

  const { data: landlord, error: profileError } = await supabaseAdmin
    .from("landlords")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError || !landlord) throw ApiError.unauthorized("No landlord profile for this account.");

  req.landlordId = landlord.id;
  req.landlord = landlord;
  next();
});
