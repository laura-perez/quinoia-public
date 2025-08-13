// Upsert user and submission (centralized DB logic)
export async function upsertUserAndSubmission({ email, normalizedInput, recaptchaMeta }) {
  const supabase = getServiceClient();
  // Upsert user (by email)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .upsert([{ email }], { onConflict: "email" })
    .select("id")
    .single();
  if (userError || !userData?.id) {
    throw new Error(userError?.message || "User upsert failed");
  }
  // Insert submission
  const { data: submissionData, error: submissionError } = await supabase
    .from("submissions")
    .insert([
      {
        user_id: userData.id,
        normalized_input: normalizedInput,
        recaptcha_meta: recaptchaMeta,
        created_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();
  if (submissionError || !submissionData?.id) {
    throw new Error(submissionError?.message || "Submission insert failed");
  }
  return submissionData.id;
}
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env, assertServerEnv } from "./env";

// Prevent import on the client side
if (typeof window !== "undefined") {
  throw new Error("lib/supabaseServer.ts must never be imported on the client side");
}

/**
 * Returns a Supabase client initialized with server credentials.
 */
export function getServiceClient(): SupabaseClient {
  assertServerEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}
