import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockPayments, mockTenants } from "../mock/mockData";
import { get, post } from "../api/apiClient";
import { mapPayment } from "../utils/apiMappers";

let payments = [...mockPayments];

function enrich(payment) {
  const tenant = mockTenants.find((t) => t.id === payment.tenantId);
  return {
    ...payment,
    tenantName: tenant ? tenant.name : null,
    unit: tenant ? tenant.unit : null,
  };
}

// Real backend: GET /api/payments (live).
export async function getAllPayments() {
  if (USE_MOCK) {
    const sorted = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    return mockDelay(sorted.map(enrich));
  }
  const rows = await get("/api/payments");
  return rows.map(mapPayment);
}

// Real backend: GET /api/payments/misdirected (live).
export async function getMisdirectedPayments() {
  if (USE_MOCK) {
    const misdirected = payments
      .filter((p) => p.tenantId === null && !p.resolved)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return mockDelay(misdirected);
  }
  const rows = await get("/api/payments/misdirected");
  return rows.map(mapPayment);
}

// Real backend: POST /api/payments/:id/assign (live).
export async function assignMisdirectedPayment(paymentId, tenantId) {
  if (USE_MOCK) {
    payments = payments.map((p) =>
      p.id === paymentId ? { ...p, tenantId, type: "full", resolved: true } : p
    );
    return mockDelay({ success: true });
  }
  return post(`/api/payments/${paymentId}/assign`, { tenantId });
}

// Real backend: POST /api/payments/:id/return (live) — triggers a real
// Nomba bank transfer back to the sender.
export async function returnMisdirectedPayment(paymentId) {
  if (USE_MOCK) {
    payments = payments.map((p) =>
      p.id === paymentId ? { ...p, type: "returned", resolved: true } : p
    );
    return mockDelay({ success: true });
  }
  return post(`/api/payments/${paymentId}/return`);
}
