import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockPayments, mockTenants } from "../mock/mockData";

function messageFor(tenant, payment) {
  const firstName = tenant.name.split(" ")[0];
  return `RentStack: Hi ${firstName}, we've received your payment of ₦${payment.amount.toLocaleString("en-NG")} for ${tenant.unit}. Thank you.`;
}

// Payment types that represent money actually landing on a tenant's own
// account — misdirected/returned payments never belonged to a tenant, so
// no receipt SMS is sent for them.
const NOTIFIABLE_TYPES = ["full", "partial", "overpayment", "disputed"];

// MOCK: Replace with a real call to Termii or Africa's Talking when the
// backend is ready. In production this fires server-side, immediately
// after the Nomba webhook confirms a transfer — see webhookService.js.
export async function sendPaymentReceiptSms(paymentId) {
  if (USE_MOCK) {
    const payment = mockPayments.find((p) => p.id === paymentId);
    if (!payment) throw new Error("Payment not found.");
    const tenant = mockTenants.find((t) => t.id === payment.tenantId);
    if (!tenant) throw new Error("No tenant is attached to this payment yet.");
    return mockDelay({
      success: true,
      provider: "Termii",
      to: tenant.phone,
      message: messageFor(tenant, payment),
      sentAt: payment.date,
    });
  }
}

// MOCK: Replace with GET /api/tenants/:id/sms-log when backend is ready.
// One notification per confirmed payment — lets the landlord confirm the
// tenant was actually kept informed.
export async function getSmsLogForTenant(tenantId) {
  if (USE_MOCK) {
    const tenant = mockTenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error("Tenant not found.");
    const log = mockPayments
      .filter((p) => p.tenantId === tenantId && NOTIFIABLE_TYPES.includes(p.type))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((p) => ({
        id: `sms-${p.id}`,
        provider: "Termii",
        to: tenant.phone,
        message: messageFor(tenant, p),
        sentAt: p.date,
      }));
    return mockDelay(log);
  }
}
