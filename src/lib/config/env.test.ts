/**
 * Test environment configuration - Skips validation for better test compatibility
 * Used when INTEGRATION_TESTS=true
 */

// Direct access to process.env without Zod validation
// This allows dotenv to load vars before they're accessed
export const env = {
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY!,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  APP_BASE_URL: process.env.APP_BASE_URL!,
  RESEND_API_KEY: process.env.RESEND_API_KEY!,
  FROM_EMAIL: process.env.FROM_EMAIL!,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  STRIPE_PRICE_MONTHLY_PROMO: process.env.STRIPE_PRICE_MONTHLY_PROMO!,
  STRIPE_PRICE_YEARLY: process.env.STRIPE_PRICE_YEARLY!,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

export function assertServerEnv() {
  return true;
}
