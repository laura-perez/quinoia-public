import { describe, it, expect } from 'vitest';
import { STRIPE_PRICE_IDS, STRIPE_CONFIG, PLAN_METADATA } from '@/lib/stripe/config';

describe('Stripe Configuration', () => {
  describe('STRIPE_PRICE_IDS', () => {
    it('should have monthly_promo and yearly price IDs', () => {
      expect(STRIPE_PRICE_IDS).toHaveProperty('monthly_promo');
      expect(STRIPE_PRICE_IDS).toHaveProperty('yearly');
    });

    it('should use environment variables for price IDs', () => {
      expect(typeof STRIPE_PRICE_IDS.monthly_promo).toBe('string');
      expect(typeof STRIPE_PRICE_IDS.yearly).toBe('string');
    });
  });

  describe('PLAN_METADATA', () => {
    it('should have monthly and yearly plans', () => {
      expect(PLAN_METADATA).toHaveProperty('monthly');
      expect(PLAN_METADATA).toHaveProperty('yearly');
    });

    it('monthly plan should have correct structure', () => {
      const monthly = PLAN_METADATA.monthly;
      expect(monthly.name).toBe('Premium Mensuel');
      expect(monthly.price).toBe(9.90);
      expect(monthly.originalPrice).toBe(12.90);
      expect(monthly.currency).toBe('EUR');
      expect(monthly.interval).toBe('mois');
      expect(monthly.isPromo).toBe(true);
      expect(monthly.priceId).toBe(STRIPE_PRICE_IDS.monthly_promo);
    });

    it('yearly plan should have correct structure', () => {
      const yearly = PLAN_METADATA.yearly;
      expect(yearly.name).toBe('Premium Annuel');
      expect(yearly.price).toBe(99);
      expect(yearly.currency).toBe('EUR');
      expect(yearly.interval).toBe('an');
      expect(yearly.monthlyEquivalent).toBe(8.25);
      expect(yearly.savings).toBe('3 mois offerts');
      expect(yearly.priceId).toBe(STRIPE_PRICE_IDS.yearly);
    });

    it('yearly should be cheaper than monthly on annual basis', () => {
      const monthlyAnnual = PLAN_METADATA.monthly.price * 12;
      const yearlyPrice = PLAN_METADATA.yearly.price;
      expect(yearlyPrice).toBeLessThan(monthlyAnnual);
    });

    it('yearly monthly equivalent should be correct', () => {
      const yearly = PLAN_METADATA.yearly;
      const expectedMonthlyEquivalent = Number((yearly.price / 12).toFixed(2));
      expect(yearly.monthlyEquivalent).toBe(expectedMonthlyEquivalent);
    });
  });

  describe('STRIPE_CONFIG', () => {
    it('should have all required config keys', () => {
      expect(STRIPE_CONFIG).toHaveProperty('publicKey');
      expect(STRIPE_CONFIG).toHaveProperty('secretKey');
      expect(STRIPE_CONFIG).toHaveProperty('webhookSecret');
    });

    it('should have non-empty values for secret and webhook', () => {
      // publicKey may be undefined in test env (optional)
      expect(typeof STRIPE_CONFIG.secretKey).toBe('string');
      expect(STRIPE_CONFIG.secretKey.length).toBeGreaterThan(0);
      expect(typeof STRIPE_CONFIG.webhookSecret).toBe('string');
      expect(STRIPE_CONFIG.webhookSecret.length).toBeGreaterThan(0);
    });
  });
});
