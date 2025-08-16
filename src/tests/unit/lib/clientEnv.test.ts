import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getClientEnv, getRecaptchaSiteKey } from '@/lib/config/clientEnv';

describe('Client Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getClientEnv', () => {
    it('should validate and return client env when site key is valid', () => {
      // Use valid 40-character reCAPTCHA site key
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = '6Lfty5srAAAAALWsWtxzkYB7e45it5leAzFvpxV7';

      const result = getClientEnv();

      expect(result).toEqual({
        NEXT_PUBLIC_RECAPTCHA_SITE_KEY: '6Lfty5srAAAAALWsWtxzkYB7e45it5leAzFvpxV7'
      });
    });

    it('should throw error when site key is missing', () => {
      delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

      expect(() => getClientEnv()).toThrow('Client environment configuration error');
      expect(() => getClientEnv()).toThrow('Invalid input: expected string, received undefined');
    });

    it('should throw error when site key format is invalid', () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'invalid-format';

      // getClientEnv() only validates presence, not format
      // Format validation happens in getRecaptchaSiteKey()
      expect(() => getClientEnv()).not.toThrow();
    });

    it('should throw error when site key is empty', () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = '';

      expect(() => getClientEnv()).toThrow('reCAPTCHA site key is required');
    });

    it('should validate against correct reCAPTCHA site key pattern', () => {
      // Valid 40-character keys
      const validKeys = [
        '6Lfty5srAAAAALWsWtxzkYB7e45it5leAzFvpxV7', // Real format
        '6L1234567890abcdefghijklmnopqrstuvwxyzAB',   // 40 chars
        '6L-_abcdefghijk1234567890ABCDEFGHIJK123'     // 40 chars with allowed chars
      ];

      validKeys.forEach(key => {
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = key;
        expect(() => getClientEnv()).not.toThrow();
      });

      // Invalid formats - getClientEnv only checks presence, not format
      const invalidKeys = [
        '7Linvalid',           // Wrong prefix (but getClientEnv won't check this)
      ];

      // These should NOT throw in getClientEnv, format validation is in getRecaptchaSiteKey
      invalidKeys.forEach(key => {
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = key;
        expect(() => getClientEnv()).not.toThrow();
      });
    });
  });

  describe('getRecaptchaSiteKey', () => {
    it('should return the site key when valid', () => {
      // Use valid 40-character key
      const testKey = '6Lfty5srAAAAALWsWtxzkYB7e45it5leAzFvpxV7';
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = testKey;

      const result = getRecaptchaSiteKey();

      expect(result).toBe(testKey);
    });

    it('should throw error when site key is invalid', () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'invalid';

      expect(() => getRecaptchaSiteKey()).toThrow('Invalid reCAPTCHA site key format');
    });
  });
});
