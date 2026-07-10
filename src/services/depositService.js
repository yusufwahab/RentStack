import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { get, post } from "../api/apiClient";
import { mapDeposit } from "../utils/apiMappers";

// MOCK: in-memory, keyed by tenantId. Basic — one deposit per tenant, no
// persistence across a page refresh (matches the rest of this app's mock
// services, which are all in-memory for the session).
const mockDeposits = {};

// Real backend: GET /api/tenants/:id/deposit (live).
export async function getDeposit(tenantId) {
  if (USE_MOCK) return mockDelay(mockDeposits[tenantId] || null);
  const row = await get(`/api/tenants/${tenantId}/deposit`);
  return mapDeposit(row);
}

// Real backend: POST /api/tenants/:id/deposit (live).
export async function recordDeposit(tenantId, amount) {
  if (USE_MOCK) {
    if (mockDeposits[tenantId] && mockDeposits[tenantId].status === "HELD") {
      throw new Error("A deposit is already on record for this tenant.");
    }
    const deposit = {
      id: `dep-${Date.now()}`,
      tenantId,
      amount: Number(amount),
      status: "HELD",
      deductions: 0,
      receivedAt: new Date().toISOString(),
    };
    mockDeposits[tenantId] = deposit;
    return mockDelay(deposit);
  }
  const row = await post(`/api/tenants/${tenantId}/deposit`, { amount: Number(amount) });
  return mapDeposit(row);
}

// Real backend: POST /api/tenants/:id/deposit/refund (live).
export async function refundDeposit(tenantId, deductions, reason) {
  if (USE_MOCK) {
    const deposit = mockDeposits[tenantId];
    if (!deposit || deposit.status !== "HELD") throw new Error("No held deposit found for this tenant.");
    const d = Number(deductions) || 0;
    deposit.deductions = d;
    deposit.deductionReason = reason || undefined;
    deposit.status = d >= deposit.amount ? "FORFEITED" : d > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED";
    deposit.refundedAt = new Date().toISOString();
    return mockDelay({ ...deposit });
  }
  const row = await post(`/api/tenants/${tenantId}/deposit/refund`, { deductions: Number(deductions) || 0, reason });
  return mapDeposit(row);
}
