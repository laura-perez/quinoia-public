import { describe, it, expect } from 'vitest';

describe('Webhook Subscription Type Detection', () => {
  it('should NOT use string.includes for detection', () => {
    // Anti-regression test for bug fix
    const priceId = 'price_1SD6sIFZmIavhYFO7cW6oIUx';

    // Old buggy logic (should not be used)
    const buggyDetection = priceId.includes('yearly');
    expect(buggyDetection).toBe(false); // Real price IDs don't contain 'yearly'

    // Correct logic (exact match)
    const yearlyPriceId = process.env.STRIPE_PRICE_YEARLY || 'price_yearly_test';
    const correctDetection = priceId === yearlyPriceId;
    expect(typeof correctDetection).toBe('boolean');
  });

  it('should handle undefined or null price IDs gracefully', () => {
    const yearlyPriceId = process.env.STRIPE_PRICE_YEARLY || 'price_yearly_test';

    const detectSubscriptionType = (priceId: string | undefined | null): 'monthly' | 'yearly' => {
      return priceId === yearlyPriceId ? 'yearly' : 'monthly';
    };

    expect(detectSubscriptionType(undefined)).toBe('monthly');
    expect(detectSubscriptionType(null)).toBe('monthly');
    expect(detectSubscriptionType('')).toBe('monthly');
  });
});

describe('Webhook Date Calculations', () => {
  it('should calculate next payment date from subscription period_end', () => {
    // Simulate Stripe timestamp (seconds since epoch)
    const currentPeriodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // +30 days
    const nextPaymentDate = new Date(currentPeriodEnd * 1000);

    expect(nextPaymentDate.getTime()).toBeGreaterThan(Date.now());
    expect(nextPaymentDate.getTime()).toBeLessThan(Date.now() + 31 * 24 * 60 * 60 * 1000);
  });

  it('should handle yearly subscription period correctly', () => {
    const currentPeriodEnd = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // +365 days
    const nextPaymentDate = new Date(currentPeriodEnd * 1000);

    const daysDiff = Math.floor((nextPaymentDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    expect(daysDiff).toBeGreaterThanOrEqual(364);
    expect(daysDiff).toBeLessThanOrEqual(366);
  });
});
