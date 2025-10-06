/**
 * Integration Tests for Magic Link Authentication
 *
 * Test Coverage:
 * 1. Request magic link - success (new user auto-creation)
 * 2. Request magic link - success (existing user)
 * 3. Request magic link - validation errors
 * 4. Request magic link - rate limiting (3 requests/hour)
 * 5. Verify magic link - success (creates session)
 * 6. Verify magic link - token expired
 * 7. Verify magic link - token already used
 * 8. Verify magic link - invalid token
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createTestSupabaseClient, cleanupTestData } from '../shared';

describe('Magic Link Authentication Flow', () => {
  const testEmail = `test-magic-link-${Date.now()}@test.com`;
  let magicLinkToken: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData([testEmail]);
  });

  describe('POST /api/auth/request-magic-link', () => {
    it('should create magic link for new user', async () => {
      const response = await fetch('http://localhost:3000/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('envoyé');

      // Verify user was created in database
      const supabase = createTestSupabaseClient();
      const { data: user } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.status).toBe('trial_available');

      // Verify magic link was created
      const { data: magicLink } = await supabase
        .from('magicLink')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(magicLink).toBeDefined();
      expect(magicLink.usedAt).toBeNull();

      // Save token for later tests
      magicLinkToken = magicLink.token;
    });

    it('should return same response for existing user (anti-enumeration)', async () => {
      const response = await fetch('http://localhost:3000/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('envoyé');
    });

    it('should validate email format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.errors).toBeDefined();
    });

    it('should rate limit after 3 requests per hour', async () => {
      const email = `rate-limit-${Date.now()}@test.com`;

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await fetch('http://localhost:3000/api/auth/request-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      }

      // 4th request should be rate limited
      const response = await fetch('http://localhost:3000/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toContain('demandes');
    }, 30000); // Increase timeout for rate limit test
  });

  describe('GET /api/auth/verify-magic-link', () => {
    it('should verify valid magic link and create session', async () => {
      const response = await fetch(
        `http://localhost:3000/api/auth/verify-magic-link?token=${magicLinkToken}`,
        { redirect: 'manual' }
      );

      // Should redirect to dashboard
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard');

      // Should set session cookie
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('quinoia_session');

      // Verify magic link was marked as used
      const supabase = createTestSupabaseClient();
      const { data: magicLink } = await supabase
        .from('magicLink')
        .select('*')
        .eq('token', magicLinkToken)
        .single();

      expect(magicLink.usedAt).not.toBeNull();

      // Verify session was created
      const { data: sessions } = await supabase
        .from('userSession')
        .select('*')
        .eq('userId', magicLink.userId);

      expect(sessions).toBeDefined();
      expect(sessions!.length).toBeGreaterThan(0);
    });

    it('should reject already used token', async () => {
      const response = await fetch(
        `http://localhost:3000/api/auth/verify-magic-link?token=${magicLinkToken}`,
        { redirect: 'manual' }
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('error=token_expired');
    });

    it('should reject invalid token', async () => {
      const response = await fetch(
        `http://localhost:3000/api/auth/verify-magic-link?token=invalid-uuid-token`,
        { redirect: 'manual' }
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('error=invalid_token');
    });

    it('should reject expired token', async () => {
      // Create expired magic link
      const supabase = createTestSupabaseClient();
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - 20); // 20 minutes ago

      const { data: expiredLink } = await supabase
        .from('magicLink')
        .insert({
          token: `expired-${Date.now()}`,
          email: testEmail,
          expiresAt: expiredDate.toISOString(),
        })
        .select()
        .single();

      const response = await fetch(
        `http://localhost:3000/api/auth/verify-magic-link?token=${expiredLink.token}`,
        { redirect: 'manual' }
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('error=token_expired');
    });
  });
});
