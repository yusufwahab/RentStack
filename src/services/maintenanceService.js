import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockTenants } from "../mock/mockData";
import { get, post, put } from "../api/apiClient";
import { mapMaintenanceRequest } from "../utils/apiMappers";

// MOCK: in-memory for the session — basic, no persistence across refresh.
let mockRequests = [];

// Real backend: GET /api/tenants/:id/maintenance-requests (live).
export async function getTenantMaintenanceRequests(tenantId) {
  if (USE_MOCK) return mockDelay(mockRequests.filter((r) => r.tenantId === tenantId));
  const rows = await get(`/api/tenants/${tenantId}/maintenance-requests`);
  return rows.map(mapMaintenanceRequest);
}

// Real backend: POST /api/tenants/:id/maintenance-requests (live).
export async function createMaintenanceRequest(tenantId, title, description) {
  if (USE_MOCK) {
    const tenant = mockTenants.find((t) => t.id === tenantId);
    const request = {
      id: `maint-${Date.now()}`,
      tenantId,
      tenantName: tenant?.name,
      unit: tenant?.unit,
      title,
      description,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    mockRequests = [request, ...mockRequests];
    return mockDelay(request);
  }
  const row = await post(`/api/tenants/${tenantId}/maintenance-requests`, { title, description });
  return mapMaintenanceRequest(row);
}

// Real backend: GET /api/maintenance (live).
export async function getAllMaintenanceRequests() {
  if (USE_MOCK) return mockDelay([...mockRequests]);
  const rows = await get("/api/maintenance");
  return rows.map(mapMaintenanceRequest);
}

// Real backend: PUT /api/maintenance/:id (live).
export async function updateMaintenanceRequestStatus(id, status) {
  if (USE_MOCK) {
    mockRequests = mockRequests.map((r) =>
      r.id === id ? { ...r, status, resolvedAt: status === "RESOLVED" ? new Date().toISOString() : undefined } : r
    );
    return mockDelay(mockRequests.find((r) => r.id === id));
  }
  const row = await put(`/api/maintenance/${id}`, { status });
  return mapMaintenanceRequest(row);
}
