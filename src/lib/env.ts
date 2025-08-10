
import { z } from 'zod';

const envSchema = z.object({
  RECAPTCHA_SECRET_KEY: z.string().min(1, 'RECAPTCHA_SECRET_KEY is required'),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
  N8N_WEBHOOK_URL: z.string().min(1, 'N8N_WEBHOOK_URL is required'),
  N8N_WEBHOOK_SECRET: z.string().min(1, 'N8N_WEBHOOK_SECRET is required'),
  HMAC_SECRET: z.string().min(1, 'HMAC_SECRET is required'),
  APP_BASE_URL: z.string().min(1, 'APP_BASE_URL is required'),

  // Optional
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

const _env = {
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
  HMAC_SECRET: process.env.HMAC_SECRET,
  APP_BASE_URL: process.env.APP_BASE_URL,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

const parsed = envSchema.safeParse(_env);

if (!parsed.success) {
  // Show all validation errors
  const errors = parsed.error.issues.map(e => `${String(e.path[0])}: ${e.message}`).join('\n');
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
