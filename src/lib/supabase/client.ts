import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env, assertServerEnv } from "../config";

// Prevent import on the client side
if (typeof window !== "undefined") {
  throw new Error("lib/supabase/client.ts must never be imported on the client side");
}

/**
 * Returns a Supabase client initialized with server credentials.
 */
export function getServiceClient(): SupabaseClient {
  assertServerEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}
