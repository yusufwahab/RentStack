// Real backend client. Every service file calls these instead of using
// mock data when USE_MOCK is false (see config.js). Attaches the stored
// bearer token to every request and redirects to /login on a 401.

import { API_URL } from "../config";

const TOKEN_KEY = "rentstack_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body, { raw = false } = {}) {
  const token = getToken();
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please sign in again.");
  }

  if (raw) {
    if (!res.ok) throw new Error(await res.text().catch(() => "Request failed."));
    return res.text();
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
  return data;
}

export async function get(path, opts) {
  return request("GET", path, undefined, opts);
}

export async function post(path, body, opts) {
  return request("POST", path, body ?? {}, opts);
}

export async function put(path, body, opts) {
  return request("PUT", path, body ?? {}, opts);
}

export async function del(path, opts) {
  return request("DELETE", path, undefined, opts);
}
