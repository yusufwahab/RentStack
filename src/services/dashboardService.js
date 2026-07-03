import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants, mockPayments, CURRENT_CYCLE_LABEL } from "../mock/mockData";

// MOCK: Replace with GET /api/dashboard when backend is ready
export async function getDashboardStats() {
  if (USE_MOCK) {
    const active = mockTenants.filter((t) => t.status !== "CLOSED");

    const counts = {
      paid: active.filter((t) => t.status === "PAID").length,
      partial: active.filter((t) => t.status === "PARTIAL").length,
      unpaid: active.filter((t) => t.status === "UNPAID").length,
      overpaid: active.filter((t) => t.status === "OVERPAID").length,
      disputed: active.filter((t) => t.status === "DISPUTED").length,
    };

    const totalExpected = active.reduce((sum, t) => sum + t.rentAmount, 0);
    const totalCollected = active.reduce((sum, t) => sum + t.currentCycle.paid, 0);
    const outstanding = active.reduce((sum, t) => sum + t.currentCycle.balance, 0);
    const misdirectedCount = mockPayments.filter((p) => p.tenantId === null && !p.resolved).length;

    const recentPayments = [...mockPayments]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map((p) => {
        const tenant = mockTenants.find((t) => t.id === p.tenantId);
        return { ...p, tenantName: tenant ? tenant.name : "Unassigned", unit: tenant ? tenant.unit : "—" };
      });

    return mockDelay({
      cycleLabel: CURRENT_CYCLE_LABEL,
      totalTenants: active.length,
      counts,
      totalExpected,
      totalCollected,
      outstanding,
      collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      misdirectedCount,
      recentPayments,
    });
  }
}
