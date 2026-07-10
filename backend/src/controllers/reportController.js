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
