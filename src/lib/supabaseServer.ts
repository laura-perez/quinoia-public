// Upsert user and submission (centralized DB logic)
export async function upsertUserAndSubmission({ email, normalizedInput, recaptchaMeta, rawFormData }) {
  const supabase = getServiceClient();
  
  // Upsert user (by email) - table name is 'user' (singular)
  const { data: userData, error: userError } = await supabase
    .from("user")
    .upsert([{ email }], { onConflict: "email" })
    .select("id")
    .single();
  if (userError || !userData?.id) {
    throw new Error(userError?.message || "User upsert failed");
  }
  
  // Insert submission - table name is 'submission' (singular)
  const { data: submissionData, error: submissionError } = await supabase
    .from("submission")
    .insert([
      {
        userId: userData.id,
        rawFormJson: rawFormData,
        normalizedInput: normalizedInput,
        age: normalizedInput.age,
        gender: normalizedInput.gender,
        heightCm: normalizedInput.heightCm,
        weightKg: normalizedInput.weightKg,
        // TODO: Re-enable activity fields once schema cache refreshes
        // activityDeskJob: normalizedInput.activity.deskJob,
        // activityDailySteps: normalizedInput.activity.dailySteps,
        // activitySessionsPerWeek: normalizedInput.activity.sessionsPerWeek,
        // activityHighIntensity: normalizedInput.activity.highIntensity,
        diet: normalizedInput.diet,
        proteinPreferences: normalizedInput.proteinPreferences,
        equipmentAvailable: normalizedInput.equipmentAvailable,
        numRecipes: normalizedInput.numRecipes,
        numServings: normalizedInput.numServings,
        dislikedFoods: normalizedInput.dislikedFoods,
        favoriteFoods: normalizedInput.favoriteFoods,
        cookingLevel: normalizedInput.cookingLevel,
        locale: normalizedInput.locale,
        unitSystem: normalizedInput.unitSystem,
        consent: normalizedInput.consent,
        consentedAt: new Date().toISOString(),
        consentVersion: 'v1',
        recaptchaScore: recaptchaMeta.score,
        recaptchaSuccess: recaptchaMeta.success,
        recaptchaHostname: recaptchaMeta.hostname,
        recaptchaAction: recaptchaMeta.action,
        recaptchaChallengeTs: recaptchaMeta.challenge_ts ? new Date(recaptchaMeta.challenge_ts).toISOString() : null,
        createdAt: new Date().toISOString(),
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
