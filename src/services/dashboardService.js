import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants, mockPayments, CURRENT_CYCLE } from "../mock/mockData";
import { get } from "../api/apiClient";
import { mapPayment, cycleKeyToLabel } from "../utils/apiMappers";

const TODAY = new Date("2026-07-04");

function realCycleOptions() {
  const now = new Date();
  const options = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = cycleKeyToLabel(key) + (i === 0 ? " (Current)" : "");
    options.push({ key, label });
  }
  return options;
}

export const CYCLE_OPTIONS = USE_MOCK
  ? [
      { key: "2026-07", label: "July 2026 (Current)" },
      { key: "2026-06", label: "June 2026" },
      { key: "2026-05", label: "May 2026" },
    ]
  : realCycleOptions();

function cycleLabelFor(key) {
  return CYCLE_OPTIONS.find((c) => c.key === key)?.label || key;
}

function cycleBounds(cycleKey) {
  const [y, m] = cycleKey.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
}

function wasActiveDuring(tenant, cycleKey) {
  const { start, end } = cycleBounds(cycleKey);
  const moveIn = new Date(tenant.moveInDate);
  const moveOut = tenant.moveOutDate ? new Date(tenant.moveOutDate) : null;
  if (moveIn > end) return false;
  if (moveOut && moveOut < start) return false;
  return true;
}

function tenantCyclePayments(tenantId, cycleKey) {
  return mockPayments.filter((p) => p.tenantId === tenantId && p.date.startsWith(cycleKey));
}

function cycleSummary(tenant, cycleKey) {
  const payments = tenantCyclePayments(tenant.id, cycleKey);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const disputed = payments.some((p) => p.type === "disputed");
  const due = tenant.rentAmount;
  let status;
  if (disputed) status = "DISPUTED";
  else if (paid === 0) status = "UNPAID";
  else if (paid < due) status = "PARTIAL";
  else if (paid === due) status = "PAID";
  else status = "OVERPAID";
  return { due, paid, balance: Math.max(due - paid, 0), credit: Math.max(paid - due, 0), status };
}

function dueDayOf(tenant) {
  return Math.min(new Date(tenant.moveInDate).getDate(), 28);
}

function daysSince(dateString) {
  const diffMs = TODAY - new Date(dateString);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function lastPaymentDate(tenantId) {
  const payments = mockPayments.filter((p) => p.tenantId === tenantId).sort((a, b) => new Date(b.date) - new Date(a.date));
  return payments[0]?.date || null;
}

// MOCK: Replace with GET /api/dashboard?cycle=YYYY-MM when backend is ready
export async function getDashboardStats(cycleKey = CURRENT_CYCLE) {
  if (USE_MOCK) {
    const active = mockTenants.filter((t) => t.status !== "CLOSED" && wasActiveDuring(t, cycleKey));

    const { start: cycleStart } = cycleBounds(cycleKey);
    const rows = active.map((t) => {
      const summary = cycleSummary(t, cycleKey);
      const dueDay = dueDayOf(t);
      const cycleDueDate = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), dueDay);
      const last = lastPaymentDate(t.id);
      const overdue = (summary.status === "UNPAID" || summary.status === "PARTIAL") && cycleDueDate < TODAY;
      return {
        ...t,
        cycleStatus: summary.status,
        cycleDue: summary.due,
        cyclePaid: summary.paid,
        cycleBalance: summary.balance,
        cycleCredit: summary.credit,
        dueDay,
        daysSinceLastPayment: last ? daysSince(last) : null,
        overdue,
      };
    });

    const counts = {
      paid: rows.filter((t) => t.cycleStatus === "PAID").length,
      partial: rows.filter((t) => t.cycleStatus === "PARTIAL").length,
      unpaid: rows.filter((t) => t.cycleStatus === "UNPAID").length,
      overpaid: rows.filter((t) => t.cycleStatus === "OVERPAID").length,
      disputed: rows.filter((t) => t.cycleStatus === "DISPUTED").length,
    };

    const totalExpected = rows.reduce((sum, t) => sum + t.cycleDue, 0);
    const totalCollected = rows.reduce((sum, t) => sum + t.cyclePaid, 0);
    const outstanding = rows.reduce((sum, t) => sum + t.cycleBalance, 0);

    // Live signals — independent of which cycle is being reviewed.
    const misdirected = mockPayments.filter((p) => p.tenantId === null && !p.resolved);

    const recentPayments = [...mockPayments]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .map((p) => {
        const tenant = mockTenants.find((t) => t.id === p.tenantId);
        return { ...p, tenantName: tenant ? tenant.name : "Unassigned", unit: tenant ? tenant.unit : "—" };
      });

    const liveActive = mockTenants.filter((t) => t.status !== "CLOSED");
    const upcomingDue = liveActive
      .map((t) => ({ ...t, dueDay: dueDayOf(t), dueDate: new Date(2026, 6, dueDayOf(t)) }))
      .filter((t) => {
        const daysAway = Math.floor((t.dueDate - TODAY) / (1000 * 60 * 60 * 24));
        return daysAway >= 0 && daysAway <= 7 && t.status !== "PAID" && t.status !== "OVERPAID";
      })
      .sort((a, b) => a.dueDate - b.dueDate);

    return mockDelay({
      cycleKey,
      cycleLabel: cycleLabelFor(cycleKey),
      totalTenants: rows.length,
      counts,
      totalExpected,
      totalCollected,
      outstanding,
      collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      misdirectedCount: misdirected.length,
      recentPayments,
      tenantRows: rows,
      upcomingDue,
      property: {
        name: "Sunshine Court",
        address: "14 Admiralty Way, Lekki Phase 1, Lagos",
        totalUnits: mockTenants.length,
        occupiedUnits: liveActive.length,
      },
    });
  }

  const stats = await get(`/api/dashboard?cycle=${encodeURIComponent(cycleKey)}`);
  return {
    ...stats,
    cycleLabel: cycleLabelFor(stats.cycleKey),
    recentPayments: stats.recentPayments.map(mapPayment),
  };
}
