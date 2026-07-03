// Wraps mock data in a fake network delay (600-900ms) so loading states
// are always visible and have to be built properly, just like a real API call.
export function mockDelay(data, ms) {
  const delay = ms ?? Math.floor(Math.random() * 300) + 600;
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}

// For simulating a failed request. Not wired into normal flows by default —
// available for the rare page that needs to demonstrate an error state.
export function mockDelayError(message, ms) {
  const delay = ms ?? Math.floor(Math.random() * 300) + 600;
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), delay)
  );
}
