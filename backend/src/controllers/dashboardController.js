import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { currentCycleKey, cycleBounds, wasActiveDuring, classifyCycle } from "../utils/cycles.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function dueDayOf(tenant) {
  return Math.min(new Date(tenant.move_in_date).getDate(), 28);
}

// GET /api/dashboard?cycle=YYYY-MM
export const getDashboardStats = asyncHandler(async (req, res) => {
  const cycleKey = req.query.cycle || currentCycleKey();
  const { start, end } = cycleBounds(cycleKey);
  const today = new Date();

  const { data: allTenants } = await supabaseAdmin.from("tenants").select("*").eq("landlord_id", req.landlordId);
  const { data: allPayments } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("landlord_id", req.landlordId)
    .order("occurred_at", { ascending: false });

  const tenants = allTenants || [];
  const payments = allPayments || [];
  const activeTenants = tenants.filter((t) => t.status !== "CLOSED" && wasActiveDuring(t, cycleKey));

  const paymentsByTenant = new Map();
  for (const p of payments) {
    if (!p.tenant_id) continue;
    if (!paymentsByTenant.has(p.tenant_id)) paymentsByTenant.set(p.tenant_id, []);
    paymentsByTenant.get(p.tenant_id).push(p);
  }

  const rows = activeTenants.map((tenant) => {
    const tenantPayments = paymentsByTenant.get(tenant.id) || [];
    const cyclePayments = tenantPayments.filter((p) => {
      const d = new Date(p.occurred_at);
      return d >= start && d <= end;
    });
    const summary = classifyCycle(cyclePayments, Number(tenant.rent_amount));

    const dueDay = dueDayOf(tenant);
    const cycleDueDate = new Date(start.getFullYear(), start.getMonth(), dueDay);
    const overdue = (summary.status === "UNPAID" || summary.status === "PARTIAL") && cycleDueDate < today;

    const last = tenantPayments[0]; // already sorted desc
    const daysSinceLastPayment = last
      ? Math.floor((today - new Date(last.occurred_at)) / (1000 * 60 * 60 * 24))
      : null;

    return { ...tenant, cycleStatus: summary.status, cycleDue: summary.due, cyclePaid: summary.paid, cycleBalance: summary.balance, cycleCredit: summary.credit, dueDay, daysSinceLastPayment, overdue };
  });

  const counts = {
    paid: rows.filter((r) => r.cycleStatus === "PAID").length,
    partial: rows.filter((r) => r.cycleStatus === "PARTIAL").length,
    unpaid: rows.filter((r) => r.cycleStatus === "UNPAID").length,
    overpaid: rows.filter((r) => r.cycleStatus === "OVERPAID").length,
    disputed: rows.filter((r) => r.cycleStatus === "DISPUTED").length,
  };

  const totalExpected = rows.reduce((sum, r) => sum + r.cycleDue, 0);
  const totalCollected = rows.reduce((sum, r) => sum + r.cyclePaid, 0);
  const outstanding = rows.reduce((sum, r) => sum + r.cycleBalance, 0);

  const { count: misdirectedCount } = await supabaseAdmin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .is("tenant_id", null)
    .eq("resolved", false);

  const recentPayments = payments.slice(0, 10).map((p) => {
    const tenant = tenants.find((t) => t.id === p.tenant_id);
    return { ...p, tenantName: tenant ? tenant.name : "Unassigned", unit: tenant ? tenant.unit : "—" };
  });

  const liveActive = tenants.filter((t) => t.status !== "CLOSED");
  const upcomingDue = liveActive
    .map((t) => ({ ...t, dueDay: dueDayOf(t), dueDate: new Date(today.getFullYear(), today.getMonth(), dueDayOf(t)) }))
    .filter((t) => {
      const daysAway = Math.floor((t.dueDate - today) / (1000 * 60 * 60 * 24));
      return daysAway >= 0 && daysAway <= 7 && t.status !== "PAID" && t.status !== "OVERPAID";
    })
    .sort((a, b) => a.dueDate - b.dueDate);

  res.json({
    cycleKey,
    totalTenants: rows.length,
    counts,
    totalExpected,
    totalCollected,
    outstanding,
    collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
    misdirectedCount: misdirectedCount || 0,
    recentPayments,
    tenantRows: rows,
    upcomingDue,
    property: {
      name: req.landlord.property_name,
      address: req.landlord.property_address,
      totalUnits: tenants.length,
      occupiedUnits: liveActive.length,
    },
  });
});
