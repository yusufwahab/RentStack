import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { sendEmail, otpEmailHtml } from "./brevoService.js";
import { ApiError } from "../utils/ApiError.js";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
// How long after verifying we still trust it during POST /api/auth/register —
// covers the time a user spends typing the rest of the signup form.
const VERIFIED_GRACE_MS = 30 * 60 * 1000; // 30 minutes

function generateCode() {
  return String(crypto.randomInt(100000, 1000000)); // 6 digits
}

// MOCK-equivalent on the backend side would be: none — this is real from
// day one, since Brevo is free-tier and there's no reason to fake it.
export async function requestSignupOtp(email) {
  if (!email) throw ApiError.badRequest("email is required.");

  const { data: existingLandlord } = await supabaseAdmin
    .from("landlords")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingLandlord) throw ApiError.conflict("An account with this email already exists.");

  const code = generateCode();
  const { error } = await supabaseAdmin.from("otp_codes").insert({
    email,
    code,
    purpose: "signup",
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) throw ApiError.internal(error.message);

  const result = await sendEmail({ to: email, subject: "Your RentStack verification code", html: otpEmailHtml(code) });
  if (!result.success) throw ApiError.internal(`Could not send verification email: ${result.error}`);

  return { success: true };
}

export async function verifySignupOtp(email, code) {
  if (!email || !code) throw ApiError.badRequest("email and code are required.");

  const { data: row } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("email", email)
    .eq("code", code)
    .eq("purpose", "signup")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) throw ApiError.badRequest("Invalid code.");
  if (new Date(row.expires_at) < new Date()) throw ApiError.badRequest("This code has expired. Request a new one.");

  await supabaseAdmin.from("otp_codes").update({ verified_at: new Date().toISOString() }).eq("id", row.id);
  return { success: true };
}

// Called from POST /api/auth/register — throws unless this email has a
// recently-verified, not-yet-consumed OTP record. On success, consumes it
// so it can't be reused for a second registration.
export async function assertEmailVerifiedForSignup(email) {
  const { data: row } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("email", email)
    .eq("purpose", "signup")
    .not("verified_at", "is", null)
    .is("consumed_at", null)
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) throw ApiError.badRequest("Please verify your email with the code we sent before continuing.");
  if (Date.now() - new Date(row.verified_at).getTime() > VERIFIED_GRACE_MS) {
    throw ApiError.badRequest("Your email verification has expired. Please verify again.");
  }

  await supabaseAdmin.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
}
