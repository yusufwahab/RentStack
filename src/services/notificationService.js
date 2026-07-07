import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockPayments, mockTenants } from "../mock/mockData";
import { get } from "../api/apiClient";

function messageFor(tenant, payment) {
  const firstName = tenant.name.split(" ")[0];
  return `Hi ${firstName}, we've received your payment of ₦${payment.amount.toLocaleString("en-NG")} for ${tenant.unit}. Thank you.`;
}

// Payment types that represent money actually landing on a tenant's own
// account — misdirected/returned payments never belonged to a tenant, so
// no receipt email is sent for them.
const NOTIFIABLE_TYPES = ["full", "partial", "overpayment", "disputed"];

// MOCK ONLY — the real backend sends this automatically, server-side, via
// Brevo, the moment a webhook is reconciled (see reconciliationService.js
// on the backend). There's no frontend-callable endpoint for it because
// nothing in the UI should ever trigger a notification directly.
export async function sendPaymentReceiptEmail(paymentId) {
  if (USE_MOCK) {
    const payment = mockPayments.find((p) => p.id === paymentId);
    if (!payment) throw new Error("Payment not found.");
    const tenant = mockTenants.find((t) => t.id === payment.tenantId);
    if (!tenant) throw new Error("No tenant is attached to this payment yet.");
    return mockDelay({
      success: true,
      provider: "Brevo",
      to: tenant.email,
      subject: "Payment received — RentStack",
      message: messageFor(tenant, payment),
      sentAt: payment.date,
    });
  }
}

// MOCK: Replace with GET /api/tenants/:id/notifications when backend is ready.
// One email per confirmed payment — lets the landlord confirm the tenant
// was actually kept informed.
export async function getNotificationsForTenant(tenantId) {
  if (USE_MOCK) {
    const tenant = mockTenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error("Tenant not found.");
    const log = mockPayments
      .filter((p) => p.tenantId === tenantId && NOTIFIABLE_TYPES.includes(p.type))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((p) => ({
        id: `notif-${p.id}`,
        provider: "Brevo",
        to: tenant.email,
        subject: "Payment received — RentStack",
        message: messageFor(tenant, p),
        sentAt: p.date,
      }));
    return mockDelay(log);
  }
  const rows = await get(`/api/tenants/${tenantId}/notifications`);
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    to: r.to_address,
    subject: r.subject,
    message: r.message,
    sentAt: r.sent_at,
  }));
}
