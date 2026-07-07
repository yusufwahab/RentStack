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
    // The `accountId` header is ALWAYS the parent account, for every call —
    // auth, virtual account creation, transfers. The sub-account id is a
    // separate value that gets appended to the URL path on the specific
    // endpoints that are sub-account-scoped. See nombaService.js.
    parentAccountId: required("NOMBA_PARENT_ACCOUNT_ID"),
    subAccountId: required("NOMBA_SUB_ACCOUNT_ID"),
    // Nomba's dashboard labels this "Private key" — it's the same value
    // as the `client_secret` field the token-issue endpoint expects.
    clientId: required("NOMBA_CLIENT_ID"),
    clientSecret: required("NOMBA_CLIENT_SECRET"),
    webhookSecret: required("NOMBA_WEBHOOK_SECRET"),
  },

  brevo: {
    apiKey: process.env.BREVO_API_KEY || "",
    senderEmail: process.env.BREVO_SENDER_EMAIL || "notifications@rentstack.app",
    senderName: process.env.BREVO_SENDER_NAME || "RentStack",
  },

  // Dev-only escape hatch so you can hit /api/webhooks/nomba locally with
  // curl/Postman before you have real Nomba signatures to test with.
  // Must be "false" (the default) in any deployed environment.
  allowUnsignedWebhooks: process.env.INTERNAL_WEBHOOK_ALLOW_UNSIGNED === "true",
};
