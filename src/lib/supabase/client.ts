import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env, assertServerEnv } from "../config";

// Prevent import on the client side
if (typeof window !== "undefined") {
  throw new Error("lib/supabase/client.ts must never be imported on the client side");
}

/**
 * Returns a Supabase client initialized with service_role credentials.
 * This client bypasses RLS and should only be used for server-side operations
 * that require admin access (like reading userRecency view for n8n payload).
 */
export function getServiceClient(): SupabaseClient {
  assertServerEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * Returns a Supabase client initialized with anon credentials.
 * This client respects RLS policies and should be used for user-specific operations
 * when we want automatic filtering by auth.uid().
 */
export function getAnonClient(): SupabaseClient {
  assertServerEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
