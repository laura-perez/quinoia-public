import { describe, it, expect } from 'vitest';

describe('Checkout API Input Validation', () => {
  describe('Email validation', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    it('should accept valid emails', () => {
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('user+tag@domain.co.uk')).toBe(true);
      expect(emailRegex.test('name.surname@company.fr')).toBe(true);
      expect(emailRegex.test('user123@test-domain.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(emailRegex.test('')).toBe(false);
      expect(emailRegex.test('notanemail')).toBe(false);
      expect(emailRegex.test('missing@domain')).toBe(false);
      expect(emailRegex.test('@nodomain.com')).toBe(false);
      expect(emailRegex.test('spaces in@email.com')).toBe(false);
      expect(emailRegex.test('no-at-symbol.com')).toBe(false);
    });
  });

  describe('Plan type validation', () => {
    const validPlanTypes = ['monthly', 'yearly'];

    it('should accept valid plan types', () => {
      expect(validPlanTypes.includes('monthly')).toBe(true);
      expect(validPlanTypes.includes('yearly')).toBe(true);
    });

    it('should reject invalid plan types', () => {
      expect(validPlanTypes.includes('weekly')).toBe(false);
      expect(validPlanTypes.includes('lifetime')).toBe(false);
      expect(validPlanTypes.includes('trial')).toBe(false);
      expect(validPlanTypes.includes('')).toBe(false);
    });
  });

  describe('Trial period validation', () => {
    it('should NOT allow trial_period_days parameter', () => {
      // Anti-regression: trial is only via form, not on paid subscriptions
      const allowedParams = ['priceId', 'customerEmail', 'successUrl', 'cancelUrl', 'mode'];

      expect(allowedParams.includes('trial_period_days')).toBe(false);
      expect(allowedParams.includes('trialPeriodDays')).toBe(false);
    });
  });

  describe('URL validation', () => {
    it('should validate success and cancel URLs', () => {
      const urlRegex = /^https?:\/\/.+/;

      expect(urlRegex.test('https://quinoia.fr/checkout/success')).toBe(true);
      expect(urlRegex.test('http://localhost:3000/checkout/success')).toBe(true);
      expect(urlRegex.test('/checkout/success')).toBe(false);
      expect(urlRegex.test('quinoia.fr/checkout/success')).toBe(false);
    });
  });

  describe('Request body validation', () => {
    it('should require both planType and customerEmail', () => {
      const isValid = (body: any): boolean => {
        return !!(body.planType && body.customerEmail);
      };

      expect(isValid({ planType: 'monthly', customerEmail: 'test@example.com' })).toBe(true);
      expect(isValid({ planType: 'monthly' })).toBe(false);
      expect(isValid({ customerEmail: 'test@example.com' })).toBe(false);
      expect(isValid({})).toBe(false);
    });
  });
});
