import { describe, it, expect } from 'vitest';
import { envSchema } from '@/lib/config/env';

const requiredEnv = {
  RECAPTCHA_SECRET_KEY: 'recaptcha-secret',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_KEY: 'service-key',
  SUPABASE_ANON_KEY: 'anon-key',
  APP_BASE_URL: 'http://localhost:3000',
  RESEND_API_KEY: 're_test',
  FROM_EMAIL: 'hello@example.com',
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_WEBHOOK_SECRET: 'whsec_x',
  STRIPE_PRICE_MONTHLY_PROMO: 'price_monthly',
  STRIPE_PRICE_YEARLY: 'price_yearly',
};

const optionalNames = [
  'ADMIN_EMAIL',
  'CRON_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
] as const;

describe('server env schema', () => {
  it('treats blank optional variables as unset', () => {
    const blankOptionals = Object.fromEntries(optionalNames.map((name) => [name, '']));
    const parsed = envSchema.safeParse({ ...requiredEnv, ...blankOptionals });

    expect(parsed.success).toBe(true);
    for (const name of optionalNames) {
      expect(parsed.data?.[name]).toBeUndefined();
    }
  });

  it('accepts valid non-empty optional values', () => {
    const parsed = envSchema.safeParse({
      ...requiredEnv,
      ADMIN_EMAIL: 'admin@example.com',
      CRON_SECRET: 'a'.repeat(16),
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.ADMIN_EMAIL).toBe('admin@example.com');
    expect(parsed.data?.CRON_SECRET).toBe('a'.repeat(16));
  });

  it('still rejects an invalid non-empty CRON_SECRET', () => {
    const parsed = envSchema.safeParse({ ...requiredEnv, CRON_SECRET: 'too-short' });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path[0])).toContain('CRON_SECRET');
  });

  it('still rejects an invalid non-empty ADMIN_EMAIL', () => {
    const parsed = envSchema.safeParse({ ...requiredEnv, ADMIN_EMAIL: 'not-an-email' });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path[0])).toContain('ADMIN_EMAIL');
  });

  it('still requires required variables', () => {
    const parsed = envSchema.safeParse({ ...requiredEnv, SUPABASE_URL: '' });

    expect(parsed.success).toBe(false);
  });
});
