import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as hmac from '../../src/lib/hmac';

const TEST_SECRET = 'test-secret';
const TEST_BODY = '{"ok":true}';

let originalEnv: NodeJS.ProcessEnv;

describe('hmac', () => {
  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.N8N_WEBHOOK_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('signBody returns a base64url HMAC-SHA256 signature', () => {
    const signature = hmac.signBody(TEST_BODY);
    // base64url: no +, /, =
    expect(signature).not.toMatch(/[+/=]/);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
  });

  it('verifySignature returns true for a valid signature', () => {
    const signature = hmac.signBody(TEST_BODY);
    expect(hmac.verifySignature(TEST_BODY, signature)).toBe(true);
  });

  it('verifySignature returns false for an altered signature', () => {
    const signature = hmac.signBody(TEST_BODY);
    // Change last char (safe: base64url is alphanumeric + -_)
    const altered = signature.slice(0, -1) + (signature.slice(-1) === 'A' ? 'B' : 'A');
    expect(hmac.verifySignature(TEST_BODY, altered)).toBe(false);
  });
});
