import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockLandlord } from "../mock/mockData";

const STORAGE_KEY = "rentstack_user";

// MOCK: Replace with POST /api/auth/register when backend is ready
export async function register(data) {
  if (USE_MOCK) {
    const user = { ...mockLandlord, ...data, id: "landlord-001" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return mockDelay({ user, token: "mock-jwt-token" });
  }
}

// MOCK: Replace with POST /api/auth/login when backend is ready
// Accepts any email/password while mocked — there is no real auth backend yet.
export async function login(email) {
  if (USE_MOCK) {
    const user = { ...mockLandlord, email: email || mockLandlord.email };
    delete user.password;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return mockDelay({ user, token: "mock-jwt-token" });
  }
}

// MOCK: Replace with GET /api/auth/me when backend is ready
export async function getCurrentUser() {
  if (USE_MOCK) {
    const stored = localStorage.getItem(STORAGE_KEY);
    return mockDelay(stored ? JSON.parse(stored) : null, 300);
  }
}

export async function logout() {
  if (USE_MOCK) {
    localStorage.removeItem(STORAGE_KEY);
    return mockDelay({ success: true }, 300);
  }
}
