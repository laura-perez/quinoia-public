import { z } from "zod";

const envSchema = z.object({
  RECAPTCHA_SECRET_KEY: z.string().min(1, "RECAPTCHA_SECRET_KEY is required"),
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_KEY: z.string().min(1, "SUPABASE_SERVICE_KEY is required"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  APP_BASE_URL: z.string().min(1, "APP_BASE_URL is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  FROM_EMAIL: z.string().email("FROM_EMAIL must be a valid email address"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email address").optional(),

  // Optional
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

const _env = {
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  APP_BASE_URL: process.env.APP_BASE_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  FROM_EMAIL: process.env.FROM_EMAIL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

const parsed = envSchema.safeParse(_env);

if (!parsed.success) {
  // Show all validation errors
  const errors = parsed.error.issues.map((e) => `${String(e.path[0])}: ${e.message}`).join("\n");
  throw new Error(`Environment variable configuration error:\n${errors}`);
}

export const env: z.infer<typeof envSchema> = parsed.data;

/**
 * Call in API routes to ensure all required server env variables are present.
 * Throws a clear error if a required variable is missing.
 */
export function assertServerEnv() {
  // This function is a no-op because validation already happens at import,
  // but it makes intent explicit in API routes.
  return true;
}
