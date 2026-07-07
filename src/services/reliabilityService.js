import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants, mockPayments } from "../mock/mockData";
import { get } from "../api/apiClient";

// Every cycle RentStack has payment records for. A tenant's score only
// looks back as far as their own move-in date.
const TRACKED_CYCLES = ["2026-04", "2026-05", "2026-06", "2026-07"];

function cycleOutcome(tenantId, cycleKey, rentAmount) {
  const payments = mockPayments.filter((p) => p.tenantId === tenantId && p.date.startsWith(cycleKey));
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const disputed = payments.some((p) => p.type === "disputed");
  if (disputed) return { status: "DISPUTED", points: 90 };
  if (paid === 0) return { status: "UNPAID", points: 0 };
  if (paid < rentAmount) return { status: "PARTIAL", points: 50 };
  return { status: paid > rentAmount ? "OVERPAID" : "PAID", points: 100 };
}

function tierFor(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Improvement";
}

// MOCK: Replace with GET /api/tenants/:id/reliability-score when backend is ready
export async function getReliabilityScore(tenantId) {
  if (USE_MOCK) {
    const tenant = mockTenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error("Tenant not found.");

    const moveIn = new Date(tenant.moveInDate);
    const cycles = TRACKED_CYCLES.filter((key) => {
      const [y, m] = key.split("-").map(Number);
      return new Date(y, m - 1, 1) >= new Date(moveIn.getFullYear(), moveIn.getMonth(), 1);
    });

    const breakdown = cycles.map((cycle) => ({ cycle, ...cycleOutcome(tenant.id, cycle, tenant.rentAmount) }));
    const score = breakdown.length
      ? Math.round(breakdown.reduce((sum, b) => sum + b.points, 0) / breakdown.length)
      : 0;

    return mockDelay({
      tenantId,
      score,
      tier: tierFor(score),
      cyclesTracked: breakdown.length,
      onTimeCount: breakdown.filter((b) => b.status === "PAID" || b.status === "OVERPAID").length,
      partialCount: breakdown.filter((b) => b.status === "PARTIAL").length,
      missedCount: breakdown.filter((b) => b.status === "UNPAID").length,
      breakdown,
      generatedAt: new Date().toISOString(),
    });
  }
  return get(`/api/tenants/${tenantId}/reliability-score`);
}

// MOCK: Simulates generating a shareable, verifiable link to a tenant's
// score — the real version would resolve to a signed, read-only page.
export async function getShareableScoreLink(tenantId) {
  if (USE_MOCK) {
    const token = btoa(`score:${tenantId}:${Date.now()}`).replace(/=+$/, "");
    return mockDelay({ url: `https://rentstack.com/verify/${token}` }, 400);
  }
  return get(`/api/tenants/${tenantId}/reliability-score/share`);
}
