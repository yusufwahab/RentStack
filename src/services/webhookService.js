import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";

// This file documents the shape RentStack expects from Nomba's webhook once
// a real backend exists. Nomba will POST here on every inbound transfer to a
// tenant's virtual account; the backend then reconciles it against tenants
// and updates payment state. Nothing in the UI calls this directly today.

// MOCK: Replace with POST /api/webhooks/nomba (backend-only route) when ready
export async function receivePaymentWebhook(payload) {
  if (USE_MOCK) {
    // Expected payload shape from Nomba:
    // { accountNumber, amount, senderName, senderBank, reference, timestamp }
    return mockDelay({ received: true, payload });
  }
}
