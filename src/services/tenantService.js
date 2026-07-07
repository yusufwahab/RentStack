import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants, mockPayments } from "../mock/mockData";
import { get, post, put } from "../api/apiClient";
import { mapTenant, mapPayment } from "../utils/apiMappers";

let tenants = [...mockTenants];

// MOCK: Replace with GET /api/tenants when backend is ready
export async function getAllTenants() {
  if (USE_MOCK) return mockDelay([...tenants]);
  const rows = await get("/api/tenants");
  return rows.map(mapTenant);
}

// MOCK: Replace with GET /api/tenants/:id when backend is ready
export async function getTenantById(id) {
  if (USE_MOCK) {
    const tenant = tenants.find((t) => t.id === id);
    if (!tenant) throw new Error("Tenant not found.");
    return mockDelay({ ...tenant });
  }
  const row = await get(`/api/tenants/${id}`);
  return mapTenant(row);
}

// MOCK: Replace with POST /api/tenants when backend is ready
// This will also call the Nomba Virtual Account API on the backend
export async function addTenant(data) {
  if (USE_MOCK) {
    const account = await provisionVirtualAccount(data);
    const newTenant = {
      id: `t-${Date.now()}`,
      name: data.name,
      unit: data.unit,
      email: data.email,
      phone: data.phone,
      virtualAccountNumber: account.accountNumber,
      bankName: account.bankName,
      accountName: account.accountName,
      moveInDate: data.moveInDate || new Date().toISOString().slice(0, 10),
      rentAmount: data.rentAmount || 85000,
      status: "UNPAID",
      currentCycle: { due: data.rentAmount || 85000, paid: 0, balance: data.rentAmount || 85000, credit: 0 },
    };
    tenants = [...tenants, newTenant];
    return mockDelay(newTenant);
  }
  const row = await post("/api/tenants", data);
  return mapTenant({ ...row, currentCycle: { due: row.rent_amount, paid: 0, balance: row.rent_amount, credit: 0 } });
}

// MOCK: Replace with PUT /api/tenants/:id when backend is ready
export async function updateTenant(id, data) {
  if (USE_MOCK) {
    tenants = tenants.map((t) => (t.id === id ? { ...t, ...data } : t));
    const updated = tenants.find((t) => t.id === id);
    if (!updated) throw new Error("Tenant not found.");
    return mockDelay({ ...updated });
  }
  const row = await put(`/api/tenants/${id}`, data);
  return mapTenant(row);
}

// MOCK: Replace with POST /api/tenants/:id/offboard when backend is ready
export async function offboardTenant(id) {
  if (USE_MOCK) {
    tenants = tenants.map((t) =>
      t.id === id
        ? {
            ...t,
            status: "CLOSED",
            moveOutDate: new Date().toISOString().slice(0, 10),
            currentCycle: { due: 0, paid: 0, balance: 0, credit: 0 },
          }
        : t
    );
    return mockDelay({ success: true });
  }
  return post(`/api/tenants/${id}/offboard`);
}

// MOCK: Replace with GET /api/tenants/:id/transactions when backend is ready
export async function getTenantPaymentHistory(id) {
  if (USE_MOCK) {
    const history = mockPayments
      .filter((p) => p.tenantId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return mockDelay(history);
  }
  const rows = await get(`/api/tenants/${id}/transactions`);
  return rows.map(mapPayment);
}

// MOCK: Simulates Nomba virtual account provisioning.
// Returns a fake account number after a delay to mimic the real API call.
// Only used in mock mode — the real backend provisions the account itself
// as part of POST /api/tenants, so this is never called when USE_MOCK is false.
export async function provisionVirtualAccount(tenantData) {
  if (USE_MOCK) {
    const banks = ["Wema Bank", "Sterling Bank"];
    const accountNumber = String(Math.floor(1000000000 + Math.random() * 8999999999));
    return mockDelay({
      accountNumber,
      bankName: banks[Math.floor(Math.random() * banks.length)],
      accountName: tenantData.name,
    });
  }
}

// MOCK: Simulates generating a shareable, read-only link to a tenant's
// verified statement — the real version would resolve to a signed page.
export async function getShareableStatementLink(id) {
  if (USE_MOCK) {
    const token = btoa(`stmt:${id}:${Date.now()}`).replace(/=+$/, "");
    return mockDelay({ url: `https://rentstack.com/statements/${token}` }, 400);
  }
  return get(`/api/tenants/${id}/statement/share`);
}
