import { USE_MOCK } from "../config";
import { mockDelay } from "../mock/mockDelay";
import { mockLandlord } from "../mock/mockData";
import { post, get, setToken } from "../api/apiClient";
import { mapLandlord } from "../utils/apiMappers";

const STORAGE_KEY = "rentstack_user";

// Real backend: POST /api/auth/request-otp (live) — sends a 6-digit code to
// `email` via Brevo, first step of signup. Falls back to mock data when
// USE_MOCK is true.
export async function requestSignupOtp(email) {
  if (USE_MOCK) {
    return mockDelay({ success: true }, 400);
  }
  return post("/api/auth/request-otp", { email });
}

// Real backend: POST /api/auth/verify-otp (live). Mock mode accepts any
// 6-digit code instead, since no real email is sent there.
export async function verifySignupOtp(email, code) {
  if (USE_MOCK) {
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code we emailed you.");
    return mockDelay({ success: true }, 400);
  }
  return post("/api/auth/verify-otp", { email, code });
}

// Real backend: POST /api/auth/register (live).
export async function register(data) {
  if (USE_MOCK) {
    const user = { ...mockLandlord, ...data, id: "landlord-001" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return mockDelay({ user, token: "mock-jwt-token" });
  }
  const { user, session } = await post("/api/auth/register", {
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    propertyName: data.property?.name,
    propertyAddress: data.property?.address,
  });
  setToken(session.accessToken);
  return { user: mapLandlord(user) };
}

// Real backend: POST /api/auth/login (live). Mock mode accepts any
// email/password instead, since it's meant for isolated UI work.
export async function login(email, password) {
  if (USE_MOCK) {
    const user = { ...mockLandlord, email: email || mockLandlord.email };
    delete user.password;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return mockDelay({ user, token: "mock-jwt-token" });
  }
  const { user, session } = await post("/api/auth/login", { email, password });
  setToken(session.accessToken);
  return { user: mapLandlord(user) };
}

// Real backend: GET /api/auth/me (live).
export async function getCurrentUser() {
  if (USE_MOCK) {
    const stored = localStorage.getItem(STORAGE_KEY);
    return mockDelay(stored ? JSON.parse(stored) : null, 300);
  }
  try {
    const { user } = await get("/api/auth/me");
    return mapLandlord(user);
  } catch {
    return null; // no/expired token — ProtectedRoute sends them to /login
  }
}

export async function logout() {
  if (USE_MOCK) {
    localStorage.removeItem(STORAGE_KEY);
    return mockDelay({ success: true }, 300);
  }
  setToken(null);
  return { success: true };
}
