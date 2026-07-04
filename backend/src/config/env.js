import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing ${name} — set it in backend/.env before using features that need it.`);
  }
  return value || "";
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim()),

  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  nomba: {
    baseUrl: process.env.NOMBA_BASE_URL || "https://sandbox.nomba.com",
    accountId: required("NOMBA_ACCOUNT_ID"),
    clientId: required("NOMBA_CLIENT_ID"),
    clientSecret: required("NOMBA_CLIENT_SECRET"),
    webhookSecret: required("NOMBA_WEBHOOK_SECRET"),
  },

  termii: {
    apiKey: process.env.TERMII_API_KEY || "",
    senderId: process.env.TERMII_SENDER_ID || "RentStack",
  },

  // Dev-only escape hatch so you can hit /api/webhooks/nomba locally with
  // curl/Postman before you have real Nomba signatures to test with.
  // Must be "false" (the default) in any deployed environment.
  allowUnsignedWebhooks: process.env.INTERNAL_WEBHOOK_ALLOW_UNSIGNED === "true",
};
