import { lastNCycles, cycleBounds } from "./cycles.js";

// Builds a per-cycle collection-trend series: totalDue (active tenants ×
// rent-per-unit, held constant across the window), totalCollected (sum of
// that cycle's payments), and the resulting collectionRate. Shared by
// reportController (4-cycle view) and analyticsController (12-cycle view)
// so the two never drift apart.
export function computeMonthlyCollection(payments, totalDuePerMonth, cycleCount) {
  return lastNCycles(cycleCount)
    .reverse()
    .map((cycleKey) => {
      const { start, end } = cycleBounds(cycleKey);
      const monthPayments = payments.filter((p) => {
        const d = new Date(p.occurred_at);
        return d >= start && d <= end;
      });
      const totalCollected = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        month: cycleKey,
        totalDue: totalDuePerMonth,
        totalCollected,
        collectionRate: totalDuePerMonth > 0 ? Math.round((totalCollected / totalDuePerMonth) * 100) : 0,
      };
    });
}
