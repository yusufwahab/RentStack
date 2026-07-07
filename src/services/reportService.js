import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockPayments, mockTenants } from "../mock/mockData";
import { get } from "../api/apiClient";
import { mapPayment, cycleKeyToLabel } from "../utils/apiMappers";

const MONTHS = [
  { key: "2026-04", label: "April 2026" },
  { key: "2026-05", label: "May 2026" },
  { key: "2026-06", label: "June 2026" },
  { key: "2026-07", label: "July 2026" },
];

// MOCK: Replace with GET /api/reports when backend is ready
export async function getReports(dateRange) {
  if (USE_MOCK) {
    let payments = [...mockPayments].filter((p) => p.tenantId !== null);
    if (dateRange?.from) payments = payments.filter((p) => new Date(p.date) >= new Date(dateRange.from));
    if (dateRange?.to) payments = payments.filter((p) => new Date(p.date) <= new Date(dateRange.to));

    const activeTenantCount = mockTenants.filter((t) => t.status !== "CLOSED").length;
    const totalDuePerMonth = activeTenantCount * 85000;

    const monthly = MONTHS.map((month) => {
      const monthPayments = payments.filter((p) => p.date.startsWith(month.key));
      const totalCollected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        month: month.label,
        totalDue: totalDuePerMonth,
        totalCollected,
        collectionRate: totalDuePerMonth > 0 ? Math.round((totalCollected / totalDuePerMonth) * 100) : 0,
      };
    });

    const byTenant = mockTenants.map((t) => {
      const tenantPayments = payments.filter((p) => p.tenantId === t.id);
      return {
        id: t.id,
        name: t.name,
        unit: t.unit,
        status: t.status,
        totalPaid: tenantPayments.reduce((sum, p) => sum + p.amount, 0),
        paymentCount: tenantPayments.length,
      };
    });

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    const enrichedPayments = [...payments]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((p) => {
        const tenant = mockTenants.find((t) => t.id === p.tenantId);
        return { ...p, tenantName: tenant ? tenant.name : "Unassigned", unit: tenant ? tenant.unit : "—" };
      });

    return mockDelay({ monthly, byTenant, totalCollected, payments: enrichedPayments });
  }

  const params = new URLSearchParams();
  if (dateRange?.from) params.set("from", dateRange.from);
  if (dateRange?.to) params.set("to", dateRange.to);
  const query = params.toString() ? `?${params.toString()}` : "";

  const data = await get(`/api/reports${query}`);
  return {
    ...data,
    monthly: data.monthly.map((m) => ({ ...m, month: cycleKeyToLabel(m.month) })),
    payments: data.payments.map(mapPayment),
  };
}

// MOCK: Replace with GET /api/reports/export/csv when backend is ready
export async function exportCSV() {
  if (USE_MOCK) {
    const headers = ["Reference", "Tenant", "Unit", "Amount", "Type", "Date"];
    const rows = mockPayments
      .filter((p) => p.tenantId !== null)
      .map((p) => {
        const tenant = mockTenants.find((t) => t.id === p.tenantId);
        return [
          p.reference,
          tenant ? tenant.name : "Unassigned",
          tenant ? tenant.unit : "—",
          p.amount,
          p.type,
          new Date(p.date).toLocaleDateString("en-NG"),
        ];
      });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    return mockDelay(csv);
  }
  return get("/api/reports/export/csv", { raw: true });
}
