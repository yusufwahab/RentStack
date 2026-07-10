import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { toCsv } from "../utils/csv.js";
import { computeMonthlyCollection } from "../utils/collectionTrends.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function fetchLandlordPayments(landlordId, { from, to } = {}) {
  let query = supabaseAdmin
    .from("payments")
    .select("*, tenants(name, unit)")
    .eq("landlord_id", landlordId)
    .not("tenant_id", "is", null)
    .order("occurred_at", { ascending: false });

  if (from) query = query.gte("occurred_at", new Date(from).toISOString());
  if (to) query = query.lte("occurred_at", new Date(to).toISOString());

  const { data } = await query;
  return (data || []).map((p) => {
    const { tenants, ...rest } = p;
    return { ...rest, tenantName: tenants?.name || "Unassigned", unit: tenants?.unit || "—" };
  });
}

// GET /api/reports?from=&to=
export const getReports = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const payments = await fetchLandlordPayments(req.landlordId, { from, to });

  const { data: tenants } = await supabaseAdmin.from("tenants").select("*").eq("landlord_id", req.landlordId);
  const activeCount = (tenants || []).filter((t) => t.status !== "CLOSED").length;
  const rentPerUnit = Number(req.landlord.rent_per_unit) || 85000;
  const totalDuePerMonth = activeCount * rentPerUnit;

  const monthly = computeMonthlyCollection(payments, totalDuePerMonth, 4);

  const byTenant = (tenants || []).map((t) => {
    const tenantPayments = payments.filter((p) => p.tenant_id === t.id);
    return {
      id: t.id,
      name: t.name,
      unit: t.unit,
      status: t.status,
      totalPaid: tenantPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      paymentCount: tenantPayments.length,
    };
  });

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  res.json({ monthly, byTenant, totalCollected, payments });
});

// GET /api/reports/export/csv
export const exportReportsCsv = asyncHandler(async (req, res) => {
  const payments = await fetchLandlordPayments(req.landlordId);
  const csv = toCsv(
    ["Reference", "Tenant", "Unit", "Amount", "Type", "Date"],
    payments.map((p) => [p.reference, p.tenantName, p.unit, p.amount, p.type, p.occurred_at])
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=rentstack-report.csv");
  res.send(csv);
});

// GET /api/reports/annual-statement/csv?year=YYYY — basic tax-filing aid:
// one row per month's total collected, plus a per-tenant total for the
// year. Not a formal tax document, just a starting point for one.
export const exportAnnualStatementCsv = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const payments = await fetchLandlordPayments(req.landlordId, { from, to });

  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;
    const total = payments
      .filter((p) => p.occurred_at.startsWith(monthKey))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return [monthKey, total];
  });

  const byTenant = new Map();
  for (const p of payments) {
    const key = p.tenantName;
    byTenant.set(key, (byTenant.get(key) || 0) + Number(p.amount));
  }

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const csv = [
    toCsv(["Month", "Total Collected"], monthlyTotals),
    "",
    toCsv(["Tenant", "Total Collected (Year)"], [...byTenant.entries()]),
    "",
    toCsv(["Year", "Total Collected"], [[year, totalCollected]]),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=rentstack-annual-statement-${year}.csv`);
  res.send(csv);
});
