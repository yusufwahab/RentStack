// Billing-cycle helpers. A "cycle" is a calendar month, keyed as "YYYY-MM" —
// mirrors the convention used in the frontend's mock dashboardService so
// behaviour stays identical once the frontend is pointed at this API.

export function currentCycleKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function cycleBounds(cycleKey) {
  const [y, m] = cycleKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  return { start, end };
}

export function lastNCycles(n, from = new Date()) {
  const cycles = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(from.getFullYear(), from.getMonth() - i, 1));
    cycles.push(currentCycleKey(d));
  }
  return cycles;
}

export function wasActiveDuring(tenant, cycleKey) {
  const { start, end } = cycleBounds(cycleKey);
  const moveIn = new Date(tenant.move_in_date);
  const moveOut = tenant.move_out_date ? new Date(tenant.move_out_date) : null;
  if (moveIn > end) return false;
  if (moveOut && moveOut < start) return false;
  return true;
}

// Classifies a tenant's outcome for one cycle from their raw payment rows
// (already filtered to that tenant + cycle) — same rules as the frontend
// mock: any disputed transfer wins regardless of amount; otherwise compare
// the sum against rent due.
export function classifyCycle(payments, rentAmount) {
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const disputed = payments.some((p) => p.type === "disputed");
  if (disputed) return { status: "DISPUTED", paid, due: rentAmount, balance: 0, credit: 0 };
  if (paid === 0) return { status: "UNPAID", paid, due: rentAmount, balance: rentAmount, credit: 0 };
  if (paid < rentAmount) return { status: "PARTIAL", paid, due: rentAmount, balance: rentAmount - paid, credit: 0 };
  if (paid === rentAmount) return { status: "PAID", paid, due: rentAmount, balance: 0, credit: 0 };
  return { status: "OVERPAID", paid, due: rentAmount, balance: 0, credit: paid - rentAmount };
}
