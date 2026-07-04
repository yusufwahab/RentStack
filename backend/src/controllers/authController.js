import { supabaseAdmin, supabaseAuth } from "../config/supabaseAdmin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, propertyName, propertyAddress } = req.body;
  if (!name || !email || !password) throw ApiError.badRequest("name, email and password are required.");
  if (password.length < 8) throw ApiError.badRequest("Password must be at least 8 characters.");

  // Using the admin API to create the user directly (email_confirm: true)
  // so registration works without wiring up Supabase's email templates
  // first. For a production launch, prefer `supabaseAuth.auth.signUp()`
  // plus a real confirmation email flow instead of auto-confirming.
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw ApiError.conflict(createError.message);

  const { error: profileError } = await supabaseAdmin.from("landlords").insert({
    id: created.user.id,
    name,
    email,
    phone,
    property_name: propertyName,
    property_address: propertyAddress,
  });
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id); // roll back the auth user
    throw ApiError.internal(profileError.message);
  }

  const { data: session, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (signInError) throw ApiError.internal(signInError.message);

  const { data: landlord } = await supabaseAdmin.from("landlords").select("*").eq("id", created.user.id).single();

  res.status(201).json({
    user: landlord,
    session: {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresAt: session.session.expires_at,
    },
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest("email and password are required.");

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) throw ApiError.unauthorized("Invalid email or password.");

  const { data: landlord, error: profileError } = await supabaseAdmin
    .from("landlords")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profileError || !landlord) throw ApiError.unauthorized("No landlord profile for this account.");

  res.json({
    user: landlord,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
  });
});

// GET /api/auth/me — requires requireAuth middleware
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.landlord });
});

// POST /api/auth/logout
// Supabase JWTs are stateless; there is nothing to invalidate server-side
// without also revoking the refresh token. This endpoint exists so the
// frontend has a consistent call to make — it should still discard its
// locally stored token regardless of this response.
export const logout = asyncHandler(async (req, res) => {
  res.json({ success: true });
});
