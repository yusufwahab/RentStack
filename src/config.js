// This project runs on Vite, so env vars use the VITE_ prefix and are read
// from import.meta.env (the Vite equivalent of the REACT_APP_/process.env
// pattern). Flip VITE_USE_MOCK to "false" once the real backend is ready.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
export const API_URL = import.meta.env.VITE_API_URL || "";
