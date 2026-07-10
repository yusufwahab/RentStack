import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { computeMonthlyCollection } from "../utils/collectionTrends.js";
import { getReliabilityScore } from "../services/reliabilityService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const TREND_CYCLES = 12;

// GET /api/analytics/collection-trends?propertyId=
export const getCollectionTrends = asyncHandler(async (req, res) => {
  let tenantQuery = supabaseAdmin.from("tenants").select("id, status").eq("landlord_id", req.landlordId);
  if (req.query.propertyId) tenantQuery = tenantQuery.eq("property_id", req.query.propertyId);
  const { data: tenants } = await tenantQuery;

  const activeCount = (tenants || []).filter((t) => t.status !== "CLOSED").length;
  const rentPerUnit = Number(req.landlord.rent_per_unit) || 85000;
  const totalDuePerMonth = activeCount * rentPerUnit;

  const { data: allPayments } = await supabaseAdmin
    .from("payments")
    .select("amount, occurred_at, tenant_id")
    .eq("landlord_id", req.landlordId)
    .not("tenant_id", "is", null);

  const tenantIds = new Set((tenants || []).map((t) => t.id));
  const payments = req.query.propertyId
    ? (allPayments || []).filter((p) => tenantIds.has(p.tenant_id))
    : allPayments || [];

  const monthly = computeMonthlyCollection(payments, totalDuePerMonth, TREND_CYCLES);
  res.json({ monthly });
});

// Explicit, documented thresholds — deliberately simple, no black-box
// scoring. A tenant currently mid-streak on missed/partial cycles is the
// strongest churn signal; the reliability score is the secondary one.
function riskLevelFor(score, missedStreak) {
  if (missedStreak >= 2 || score < 50) return "High";
  if (missedStreak >= 1 || score < 75) return "Medium";
  return "Low";
}

// GET /api/analytics/tenant-risk
export const getTenantRiskTable = asyncHandler(async (req, res) => {
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("landlord_id", req.landlordId)
    .neq("status", "CLOSED");

  const rows = await Promise.all(
    (tenants || []).map(async (tenant) => {
      const reliability = await getReliabilityScore(tenant.id, req.landlordId);

      // breakdown is ordered most-recent-cycle-first (see reliabilityService) —
      // count the leading run of UNPAID/PARTIAL cycles as the "missed streak".
      let missedStreak = 0;
      for (const cycle of reliability.breakdown) {
        if (cycle.status === "UNPAID" || cycle.status === "PARTIAL") missedStreak++;
        else break;
      }

      const { data: lastPayment } = await supabaseAdmin
        .from("payments")
        .select("occurred_at")
        .eq("tenant_id", tenant.id)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const daysSinceLastPayment = lastPayment
        ? Math.floor((Date.now() - new Date(lastPayment.occurred_at)) / (1000 * 60 * 60 * 24))
        : null;

      return {
        tenantId: tenant.id,
        name: tenant.name,
        unit: tenant.unit,
        score: reliability.score,
        tier: reliability.tier,
        missedStreak,
        daysSinceLastPayment,
        riskLevel: riskLevelFor(reliability.score, missedStreak),
      };
    })
  );

  const order = { High: 0, Medium: 1, Low: 2 };
  rows.sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);

  res.json(rows);
});

// GET /api/analytics/vacancy — average days a unit sat empty between one
// tenant moving out and the next moving in. Basic: derived retrospectively
// from existing move_in_date/move_out_date pairs (grouped by property +
// unit name) rather than a dedicated occupancy-snapshot history, so it
// works immediately without weeks of accumulated tracking data.
export const getVacancyStats = asyncHandler(async (req, res) => {
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("property_id, unit, move_in_date, move_out_date")
    .eq("landlord_id", req.landlordId);

  const byUnit = new Map();
  for (const t of tenants || []) {
    const key = `${t.property_id || "none"}::${t.unit}`;
    if (!byUnit.has(key)) byUnit.set(key, []);
    byUnit.get(key).push(t);
  }

  const gaps = [];
  for (const group of byUnit.values()) {
    group.sort((a, b) => new Date(a.move_in_date) - new Date(b.move_in_date));
    for (let i = 1; i < group.length; i++) {
      const prevOut = group[i - 1].move_out_date;
      if (!prevOut) continue;
      const gapDays = Math.round((new Date(group[i].move_in_date) - new Date(prevOut)) / (1000 * 60 * 60 * 24));
      if (gapDays >= 0) gaps.push(gapDays);
    }
  }

  res.json({
    avgVacancyDays: gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null,
    turnoverCount: gaps.length,
  });
});
