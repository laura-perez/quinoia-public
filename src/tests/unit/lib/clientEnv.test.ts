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
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = '6LexampleSiteKey1234567890abcdefghijk12345';

      const result = getClientEnv();

      expect(result).toEqual({
        NEXT_PUBLIC_RECAPTCHA_SITE_KEY: '6LexampleSiteKey1234567890abcdefghijk12345'
      });
    });

    it('should throw error when site key is missing', () => {
      delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

      expect(() => getClientEnv()).toThrow('Client environment configuration error');
      expect(() => getClientEnv()).toThrow('reCAPTCHA site key is required');
    });

    it('should throw error when site key format is invalid', () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'invalid-format';

      expect(() => getClientEnv()).toThrow('Invalid reCAPTCHA site key format');
    });

    it('should throw error when site key is empty', () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = '';

      expect(() => getClientEnv()).toThrow('reCAPTCHA site key is required');
    });

    it('should validate against correct reCAPTCHA site key pattern', () => {
      // Valid formats
      const validKeys = [
        '6LexampleSiteKey1234567890abcdefghijk12345',
        '6L1234567890abcdefghijklmnopqrstuvwxyzABCD',
        '6L-_abcdefghijk1234567890ABCDEFGHIJK123456'
      ];

      validKeys.forEach(key => {
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = key;
        expect(() => getClientEnv()).not.toThrow();
      });

      // Invalid formats
      const invalidKeys = [
        '7Linvalid',           // Wrong prefix
        '6L',                 // Too short
        '6Ltoolong' + 'x'.repeat(50), // Too long
        '6Linvalid@#$%',      // Invalid characters
      ];

      invalidKeys.forEach(key => {
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = key;
        expect(() => getClientEnv()).toThrow('Invalid reCAPTCHA site key format');
      });
    });
  });

  describe('getRecaptchaSiteKey', () => {
    it('should return the site key when valid', () => {
      const testKey = '6LexampleSiteKey1234567890abcdefghijk12345';
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
