import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Service-role client — full DB access, bypasses Row Level Security.
// This is the ONLY Supabase client the backend should use for reads/writes;
// RLS policies in schema.sql exist as a backstop for any client that
// might one day talk to Supabase directly with a user JWT, not for this
// client's own operations.
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// A second client configured with the anon key is what we use purely to
// verify a landlord's access token on incoming requests (auth.getUser).
export const supabaseAuth = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
