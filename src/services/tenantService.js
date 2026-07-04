import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants, mockPayments } from "../mock/mockData";

let tenants = [...mockTenants];

// MOCK: Replace with GET /api/tenants when backend is ready
export async function getAllTenants() {
  if (USE_MOCK) return mockDelay([...tenants]);
}

// MOCK: Replace with GET /api/tenants/:id when backend is ready
export async function getTenantById(id) {
  if (USE_MOCK) {
    const tenant = tenants.find((t) => t.id === id);
    if (!tenant) throw new Error("Tenant not found.");
    return mockDelay({ ...tenant });
  }
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
}

// MOCK: Replace with PUT /api/tenants/:id when backend is ready
export async function updateTenant(id, data) {
  if (USE_MOCK) {
    tenants = tenants.map((t) => (t.id === id ? { ...t, ...data } : t));
    const updated = tenants.find((t) => t.id === id);
    if (!updated) throw new Error("Tenant not found.");
    return mockDelay({ ...updated });
  }
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
}

// MOCK: Replace with GET /api/tenants/:id/transactions when backend is ready
export async function getTenantPaymentHistory(id) {
  if (USE_MOCK) {
    const history = mockPayments
      .filter((p) => p.tenantId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return mockDelay(history);
  }
}

// MOCK: Simulates Nomba virtual account provisioning.
// Returns a fake account number after a delay to mimic the real API call.
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
}
