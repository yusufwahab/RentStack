import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants } from "../mock/mockData";
import { get } from "../api/apiClient";

// CBN's tiered KYC framework caps balance and transfer limits by tier.
// A downgrade can silently reduce how much a tenant is able to move in a
// single transfer, which is often the real reason a previously reliable
// tenant suddenly starts paying in instalments.
export const TIER_LIMITS = {
  "Tier 1": "Max balance ₦50,000 · ₦50,000 daily transfer limit",
  "Tier 2": "Max balance ₦200,000 · ₦200,000 daily transfer limit",
  "Tier 3": "No balance limit · No daily transfer limit",
};

// MOCK: Replace with GET /api/tenants/:id/kyc when backend is ready
export async function getTenantKyc(tenantId) {
  if (USE_MOCK) {
    const tenant = mockTenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error("Tenant not found.");
    return mockDelay({
      tier: tenant.kycTier,
      limit: TIER_LIMITS[tenant.kycTier] || null,
      tierChange: tenant.kycTierChange || null,
    });
  }
  return get(`/api/tenants/${tenantId}/kyc`);
}

// MOCK: Replace with GET /api/kyc/alerts when backend is ready
// Surfaces every tenant whose KYC tier recently changed, so the landlord
// can flag it before it shows up as a missed or partial payment.
export async function getKycAlerts() {
  if (USE_MOCK) {
    const alerts = mockTenants
      .filter((t) => t.kycTierChange)
      .map((t) => ({
        tenantId: t.id,
        tenantName: t.name,
        unit: t.unit,
        ...t.kycTierChange,
      }));
    return mockDelay(alerts);
  }
  return get("/api/kyc/alerts");
}
