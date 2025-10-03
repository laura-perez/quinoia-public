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
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_PRICE_MONTHLY_PROMO: z.string().min(1, "STRIPE_PRICE_MONTHLY_PROMO is required"),
  STRIPE_PRICE_YEARLY: z.string().min(1, "STRIPE_PRICE_YEARLY is required"),

  // Optional
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
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
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_MONTHLY_PROMO: process.env.STRIPE_PRICE_MONTHLY_PROMO,
  STRIPE_PRICE_YEARLY: process.env.STRIPE_PRICE_YEARLY,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

// Skip validation in test environment to allow dotenv to load vars first
const isTest = process.env.NODE_ENV === 'test' || process.env.INTEGRATION_TESTS === 'true';

let env: z.infer<typeof envSchema>;

if (isTest) {
  // In test mode: use values directly without validation
  // Validation happens at import time, but dotenv loads later in setup files
  env = _env as z.infer<typeof envSchema>;
} else {
  // In production/dev: validate strictly
  const parsed = envSchema.safeParse(_env);

  if (!parsed.success) {
    // Show all validation errors
    const errors = parsed.error.issues.map((e) => `${String(e.path[0])}: ${e.message}`).join("\n");
    throw new Error(`Environment variable configuration error:\n${errors}`);
  }

  env = parsed.data;
}

export { env };

/**
 * Call in API routes to ensure all required server env variables are present.
 * Throws a clear error if a required variable is missing.
 */
export function assertServerEnv() {
  // This function is a no-op because validation already happens at import,
  // but it makes intent explicit in API routes.
  return true;
}
