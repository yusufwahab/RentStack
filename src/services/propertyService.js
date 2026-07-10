import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockProperties, mockTenants } from "../mock/mockData";
import { get, post, put, del } from "../api/apiClient";

let properties = [...mockProperties];

function withCounts(property) {
  const own = mockTenants.filter((t) => t.propertyId === property.id);
  return { ...property, totalUnits: own.length, occupiedUnits: own.filter((t) => t.status !== "CLOSED").length };
}

// Real backend: GET /api/properties (live).
export async function getAllProperties() {
  if (USE_MOCK) return mockDelay(properties.map(withCounts));
  return get("/api/properties");
}

// Real backend: POST /api/properties (live).
export async function addProperty(data) {
  if (USE_MOCK) {
    const property = { id: `prop-${Date.now()}`, name: data.name, address: data.address };
    properties = [...properties, property];
    return mockDelay(withCounts(property));
  }
  return post("/api/properties", data);
}

// Real backend: PUT /api/properties/:id (live).
export async function updateProperty(id, data) {
  if (USE_MOCK) {
    properties = properties.map((p) => (p.id === id ? { ...p, ...data } : p));
    const updated = properties.find((p) => p.id === id);
    if (!updated) throw new Error("Property not found.");
    return mockDelay(withCounts(updated));
  }
  return put(`/api/properties/${id}`, data);
}

// Real backend: DELETE /api/properties/:id (live).
export async function deleteProperty(id) {
  if (USE_MOCK) {
    if (mockTenants.some((t) => t.propertyId === id)) {
      throw new Error("This property still has tenants attached — move or offboard them first.");
    }
    properties = properties.filter((p) => p.id !== id);
    return mockDelay({ success: true });
  }
  return del(`/api/properties/${id}`);
}
