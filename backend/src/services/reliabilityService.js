import { supabaseAdmin } from "../config/supabaseAdmin.js";
import crypto from "node:crypto";
import { lastNCycles, cycleBounds } from "../utils/cycles.js";
import { ApiError } from "../utils/ApiError.js";

function outcomeFor(payments, rentAmount) {
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const disputed = payments.some((p) => p.type === "disputed");
  if (disputed) return { status: "DISPUTED", points: 90 };
  if (total === 0) return { status: "UNPAID", points: 0 };
  if (total < rentAmount) return { status: "PARTIAL", points: 50 };
  return { status: total > rentAmount ? "OVERPAID" : "PAID", points: 100 };
}

function tierFor(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Improvement";
}

// Same scoring model as the frontend mock (reliabilityService.js there),
// now computed from real payment rows instead of an in-memory array.
// `landlordId` is omitted for the public/share-token path, where the
// token itself (not a landlord session) is the authorization check.
export async function getReliabilityScore(tenantId, landlordId = null) {
  let query = supabaseAdmin.from("tenants").select("*").eq("id", tenantId);
  if (landlordId) query = query.eq("landlord_id", landlordId);
  const { data: tenant } = await query.single();
  if (!tenant) throw ApiError.notFound("Tenant not found.");

  const moveIn = new Date(tenant.move_in_date);
  const candidateCycles = lastNCycles(12); // look back up to a year
  const cycles = candidateCycles.filter((key) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1) >= new Date(moveIn.getFullYear(), moveIn.getMonth(), 1);
  });

  const breakdown = [];
  for (const cycle of cycles) {
    const { start, end } = cycleBounds(cycle);
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("amount, type")
      .eq("tenant_id", tenantId)
      .gte("occurred_at", start.toISOString())
      .lte("occurred_at", end.toISOString());
    breakdown.push({ cycle, ...outcomeFor(payments || [], Number(tenant.rent_amount)) });
  }

  const score = breakdown.length ? Math.round(breakdown.reduce((s, b) => s + b.points, 0) / breakdown.length) : 0;

  return {
    tenantId,
    score,
    tier: tierFor(score),
    cyclesTracked: breakdown.length,
    onTimeCount: breakdown.filter((b) => b.status === "PAID" || b.status === "OVERPAID").length,
    partialCount: breakdown.filter((b) => b.status === "PARTIAL").length,
    missedCount: breakdown.filter((b) => b.status === "UNPAID").length,
    breakdown,
    generatedAt: new Date().toISOString(),
  };
}

// Mints a signed, time-limited token for a read-only public score page.
// A real deployment should back this with a dedicated `share_tokens` table
// (so links can be revoked) — this HMAC approach is a reasonable starting
// point: it can't be forged without SUPABASE_SERVICE_ROLE_KEY, but it also
// can't be revoked early. See README "Known simplifications".
const SHARE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signPayload(payload) {
  return crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret")
    .update(payload)
    .digest("hex");
}

export function createShareToken(tenantId) {
  const payload = `${tenantId}.${Date.now()}`;
  return Buffer.from(`${payload}.${signPayload(payload)}`).toString("base64url");
}

// Returns the tenantId if the token is valid and unexpired, otherwise null.
export function verifyShareToken(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [tenantId, timestamp, signature] = decoded.split(".");
    if (!tenantId || !timestamp || !signature) return null;

    const payload = `${tenantId}.${timestamp}`;
    const expected = signPayload(payload);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    if (Date.now() - Number(timestamp) > SHARE_TOKEN_TTL_MS) return null;
    return tenantId;
  } catch {
    return null;
  }
}
