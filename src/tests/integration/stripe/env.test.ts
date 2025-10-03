import { describe, it, expect } from 'vitest';
import { env } from '@/lib/config/env';

describe('Stripe Environment Variables', () => {
  it('should have all required Stripe variables defined', () => {
    expect(env.STRIPE_SECRET_KEY).toBeDefined();
    expect(env.STRIPE_WEBHOOK_SECRET).toBeDefined();
    expect(env.STRIPE_PRICE_MONTHLY_PROMO).toBeDefined();
    expect(env.STRIPE_PRICE_YEARLY).toBeDefined();
  });

  it('should have secret key starting with sk_', () => {
    expect(env.STRIPE_SECRET_KEY).toMatch(/^sk_(test|live)_/);
  });

  it('should have webhook secret starting with whsec_', () => {
    expect(env.STRIPE_WEBHOOK_SECRET).toMatch(/^whsec_/);
  });

  it('should have price IDs starting with price_', () => {
    expect(env.STRIPE_PRICE_MONTHLY_PROMO).toMatch(/^price_/);
    expect(env.STRIPE_PRICE_YEARLY).toMatch(/^price_/);
  });

  it('should not have placeholder values in production', () => {
    // These should be real Stripe IDs, not placeholders
    expect(env.STRIPE_PRICE_MONTHLY_PROMO).not.toContain('placeholder');
    expect(env.STRIPE_PRICE_YEARLY).not.toContain('placeholder');
  });

  describe('Optional Stripe variables', () => {
    it('should have public key for client-side usage', () => {
      // This is optional in env.ts but should exist
      const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (publicKey) {
        expect(publicKey).toMatch(/^pk_(test|live)_/);
      }
    });
  });

  describe('Environment consistency', () => {
    it('should use test keys in development', () => {
      if (process.env.NODE_ENV !== 'production') {
        expect(env.STRIPE_SECRET_KEY).toMatch(/^sk_test_/);
      }
    });

    it('should have matching key types (test/live)', () => {
      const isSecretTest = env.STRIPE_SECRET_KEY.startsWith('sk_test_');
      const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (publicKey) {
        const isPublicTest = publicKey.startsWith('pk_test_');
        expect(isSecretTest).toBe(isPublicTest); // Both should be test or both live
      }
    });
  });
});
