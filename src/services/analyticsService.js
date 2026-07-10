import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants, mockPayments } from "../mock/mockData";
import { get } from "../api/apiClient";

function cycleBounds(cycleKey) {
  const [y, m] = cycleKey.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
}

function lastNCycles(n, from = new Date("2026-07-04")) {
  const cycles = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    cycles.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return cycles;
}

// MOCK: Replace with GET /api/analytics/collection-trends when backend is
// ready. Mirrors backend/src/utils/collectionTrends.js's shape.
export async function getCollectionTrends() {
  if (USE_MOCK) {
    const activeCount = mockTenants.filter((t) => t.status !== "CLOSED").length;
    const totalDuePerMonth = activeCount * 85000;
    const monthly = lastNCycles(12)
      .reverse()
      .map((cycleKey) => {
        const { start, end } = cycleBounds(cycleKey);
        const totalCollected = mockPayments
          .filter((p) => p.tenantId && new Date(p.date) >= start && new Date(p.date) <= end)
          .reduce((sum, p) => sum + p.amount, 0);
        return {
          month: cycleKey,
          totalDue: totalDuePerMonth,
          totalCollected,
          collectionRate: totalDuePerMonth > 0 ? Math.round((totalCollected / totalDuePerMonth) * 100) : 0,
        };
      });
    return mockDelay({ monthly });
  }
  return get("/api/analytics/collection-trends");
}

// MOCK: Replace with GET /api/analytics/tenant-risk when backend is ready.
// A simplified stand-in for the backend's reliability-score-driven
// calculation — good enough to demo the table without duplicating
// reliabilityService's full cycle-by-cycle logic on the frontend.
export async function getTenantRiskTable() {
  if (USE_MOCK) {
    const rows = mockTenants
      .filter((t) => t.status !== "CLOSED")
      .map((t) => {
        const missedStreak = t.status === "UNPAID" ? 2 : t.status === "PARTIAL" ? 1 : 0;
        const score = t.status === "PAID" || t.status === "OVERPAID" ? 95 : t.status === "PARTIAL" ? 65 : t.status === "UNPAID" ? 30 : 80;
        const lastPayment = mockPayments
          .filter((p) => p.tenantId === t.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const daysSinceLastPayment = lastPayment
          ? Math.floor((new Date("2026-07-04") - new Date(lastPayment.date)) / (1000 * 60 * 60 * 24))
          : null;
        const riskLevel = missedStreak >= 2 || score < 50 ? "High" : missedStreak >= 1 || score < 75 ? "Medium" : "Low";
        return { tenantId: t.id, name: t.name, unit: t.unit, score, tier: t.status, missedStreak, daysSinceLastPayment, riskLevel };
      });
    const order = { High: 0, Medium: 1, Low: 2 };
    rows.sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);
    return mockDelay(rows);
  }
  return get("/api/analytics/tenant-risk");
}

// MOCK: Replace with GET /api/analytics/vacancy when backend is ready. The
// mock dataset has no unit with a completed turnover (a CLOSED tenant
// followed by a new one in the same unit), so this always reports "not
// enough data yet" in mock mode — same as a real brand-new account.
export async function getVacancyStats() {
  if (USE_MOCK) return mockDelay({ avgVacancyDays: null, turnoverCount: 0 });
  return get("/api/analytics/vacancy");
}
