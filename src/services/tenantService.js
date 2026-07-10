import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants, mockPayments } from "../mock/mockData";
import { get, post, put } from "../api/apiClient";
import { mapTenant, mapPayment } from "../utils/apiMappers";

let tenants = [...mockTenants];
let payments = [...mockPayments];

// Real backend: GET /api/tenants (live).
export async function getAllTenants() {
  if (USE_MOCK) return mockDelay([...tenants]);
  const rows = await get("/api/tenants");
  return rows.map(mapTenant);
}

// Real backend: GET /api/tenants/:id (live).
export async function getTenantById(id) {
  if (USE_MOCK) {
    const tenant = tenants.find((t) => t.id === id);
    if (!tenant) throw new Error("Tenant not found.");
    return mockDelay({ ...tenant });
  }
  const row = await get(`/api/tenants/${id}`);
  return mapTenant(row);
}

// Real backend: POST /api/tenants (live) — also provisions a real Nomba
// virtual account server-side.
export async function addTenant(data) {
  if (USE_MOCK) {
    const account = await provisionVirtualAccount(data);
    const newTenant = {
      id: `t-${Date.now()}`,
      propertyId: data.propertyId || "prop-001",
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
      creditBalance: 0,
      currentCycle: { due: data.rentAmount || 85000, paid: 0, balance: data.rentAmount || 85000, credit: 0, creditApplied: 0 },
    };
    tenants = [...tenants, newTenant];
    return mockDelay(newTenant);
  }
  const row = await post("/api/tenants", data);
  return mapTenant({
    ...row,
    currentCycle: { due: row.rent_amount, paid: 0, balance: row.rent_amount, credit: 0, creditApplied: 0 },
  });
}

// Real backend: POST /api/tenants/bulk (live) — pastes a CSV block
// (header: name,unit,email,phone,moveInDate,rentAmount) and creates one
// tenant + Nomba virtual account per row. Returns { created, failed }.
export async function bulkAddTenants(propertyId, csvText) {
  if (USE_MOCK) {
    const rows = parseCsvMock(csvText);
    const created = [];
    const failed = [];
    for (const [index, row] of rows.entries()) {
      try {
        if (!row.name || !row.unit || !row.moveInDate) throw new Error("name, unit and moveInDate are required.");
        const tenant = await addTenant({
          name: row.name,
          unit: row.unit,
          email: row.email || undefined,
          phone: row.phone || undefined,
          moveInDate: row.moveInDate,
          rentAmount: row.rentAmount ? Number(row.rentAmount) : undefined,
          propertyId,
        });
        created.push(tenant);
      } catch (err) {
        failed.push({ row: index + 2, name: row.name || "(no name)", error: err.message || "Failed to create tenant." });
      }
    }
    return mockDelay({ created, failed }, 600);
  }
  return post("/api/tenants/bulk", { propertyId, csv: csvText });
}

// MOCK ONLY — the real backend parses CSV server-side (utils/csv.js).
function parseCsvMock(text) {
  const lines = String(text ?? "")
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

// Real backend: PUT /api/tenants/:id (live).
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

// Real backend: POST /api/tenants/:id/offboard (live).
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

// Real backend: GET /api/tenants/:id/transactions (live).
export async function getTenantPaymentHistory(id) {
  if (USE_MOCK) {
    const history = payments
      .filter((p) => p.tenantId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return mockDelay(history);
  }
  const rows = await get(`/api/tenants/${id}/transactions`);
  return rows.map(mapPayment);
}

// Real backend: POST /api/tenants/:id/process-payment (live) — the
// "Tenant's View" test-payment button. Runs the same full/partial/overpayment
// classification the real webhook path uses, without a real bank transfer.
export async function processPayment(id, amount) {
  if (USE_MOCK) {
    const tenant = tenants.find((t) => t.id === id);
    if (!tenant) throw new Error("Tenant not found.");

    const cyclePaidSoFar = payments
      .filter((p) => p.tenantId === id && p.date.slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((sum, p) => sum + p.amount, 0);
    const newTotal = cyclePaidSoFar + Number(amount);
    const creditBalance = tenant.creditBalance || 0;
    const available = newTotal + creditBalance;
    const due = tenant.rentAmount;
    const type = available === due ? "full" : available < due ? "partial" : "overpayment";

    const payment = {
      id: `p-proc-${Date.now()}`,
      tenantId: id,
      amount: Number(amount),
      type,
      date: new Date().toISOString(),
      reference: `PROC-${Date.now()}`,
      senderBank: "RentStack (test payment)",
      senderAccountName: tenant.accountName,
    };
    payments = [...payments, payment];

    const paid = newTotal;
    const balance = Math.max(due - available, 0);
    const credit = Math.max(available - due, 0);
    const creditApplied = Math.min(creditBalance, due);
    const newCreditBalance = type === "full" ? 0 : type === "overpayment" ? credit : creditBalance;
    tenants = tenants.map((t) =>
      t.id === id
        ? {
            ...t,
            creditBalance: newCreditBalance,
            status: type === "full" ? "PAID" : type === "partial" ? "PARTIAL" : "OVERPAID",
            currentCycle: { due, paid, balance, credit, creditApplied },
          }
        : t
    );

    return mockDelay({ status: "processed", type }, 500);
  }
  return post(`/api/tenants/${id}/process-payment`, { amount: Number(amount) });
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
