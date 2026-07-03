// This file will be used when the real backend is ready.
// Set VITE_API_URL in your .env file to point to your backend, and set
// VITE_USE_MOCK=false. Every service file already checks USE_MOCK and, when
// it is false, calls the functions below instead of returning mock data —
// so no page or component needs to change.

import { API_URL } from "../config";

// TODO: implement these when the backend is ready.
// - get(path)              -> GET request, attaches Authorization: Bearer <token>
// - post(path, body)       -> POST request, JSON body
// - put(path, body)        -> PUT request, JSON body
// - del(path)               -> DELETE request
// - On any 401 response, clear the stored token and redirect to /login.

async function request() {
  throw new Error(
    `apiClient is not implemented yet. Set VITE_USE_MOCK=true, or implement apiClient.js against ${API_URL}.`
  );
}

export async function get() {
  return request();
}

export async function post() {
  return request();
}

export async function put() {
  return request();
}

export async function del() {
  return request();
}
