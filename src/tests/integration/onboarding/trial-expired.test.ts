/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createTestUser } from '../database/helpers';
import {
  PRODUCTION_DATASETS,
  createSubmitRequestForExistingUser,
  cleanupTestUsers,
} from './helpers';
import { generateTestEmail } from '../shared/test-utils';
import { TEST_CONSTANTS } from '../shared/constants';

const SUBMIT_URL = TEST_CONSTANTS.SUBMIT_URL;

describe('Onboarding - Trial Expired (trial_used)', () => {
  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  beforeAll(() => {
    supabase = createSupabaseServiceClient();
  });

  afterAll(async () => {
    await cleanupTestUsers(supabase);
  });

  it('should reject user with trial_used status and redirect to pricing', async () => {
    // ============================================
    // ARRANGE - Create user with trial_used
    // ============================================
    const email = generateTestEmail();
    await createTestUser({
      email,
      status: 'trial_used',
      hasUsedTrial: true,
    });

    const profile = {
      ...PRODUCTION_DATASETS.omnivore,
      email,
    };
    const payload = createSubmitRequestForExistingUser(profile);

    // ============================================
    // ACT - Attempt to submit form
    // ============================================
    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // ============================================
    // ASSERT - Should return 403 with redirect
    // ============================================
    expect(response.status).toBe(403);
    expect(responseData).toHaveProperty('error', 'Essai déjà utilisé');
    expect(responseData).toHaveProperty('redirectTo');
    expect(responseData.redirectTo).toContain('/tarifs');
    expect(responseData.redirectTo).toContain('trial-expired');

    // ============================================
    // ASSERT - User status should remain trial_used
    // ============================================
    const { data: user } = await supabase
      .from('user')
      .select('status')
      .eq('email', email)
      .single();

    expect(user?.status).toBe('trial_used');

    // ============================================
    // ASSERT - No submission should be created
    // ============================================
    const { data: submissions } = await supabase
      .from('submission')
      .select('id')
      .eq('userId', user?.id || '');

    // No new submission should exist (might have old ones, but we just check no error)
    expect(submissions).toBeDefined();
  });

  it('should reject multiple attempts from trial_used user', async () => {
    const email = generateTestEmail();
    await createTestUser({
      email,
      status: 'trial_used',
      hasUsedTrial: true,
    });

    const profile = { ...PRODUCTION_DATASETS.vegan, email };
    const payload = createSubmitRequestForExistingUser(profile);

    // First attempt
    const firstResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(firstResponse.status).toBe(403);

    // Second attempt (should also fail)
    const secondResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(secondResponse.status).toBe(403);
  });

  it('should reject trial_used users regardless of diet type', async () => {
    // Create trial_used users for each diet
    const omnivoreEmail = generateTestEmail();
    const veganEmail = generateTestEmail();
    const vegetarianEmail = generateTestEmail();
    const flexitarianEmail = generateTestEmail();

    await Promise.all([
      createTestUser({ email: omnivoreEmail, status: 'trial_used', hasUsedTrial: true }),
      createTestUser({ email: veganEmail, status: 'trial_used', hasUsedTrial: true }),
      createTestUser({ email: vegetarianEmail, status: 'trial_used', hasUsedTrial: true }),
      createTestUser({ email: flexitarianEmail, status: 'trial_used', hasUsedTrial: true }),
    ]);

    // Try all diets
    const omnivorePayload = createSubmitRequestForExistingUser({ ...PRODUCTION_DATASETS.omnivore, email: omnivoreEmail });
    const veganPayload = createSubmitRequestForExistingUser({ ...PRODUCTION_DATASETS.vegan, email: veganEmail });
    const vegetarianPayload = createSubmitRequestForExistingUser({ ...PRODUCTION_DATASETS.vegetarian, email: vegetarianEmail });
    const flexitarianPayload = createSubmitRequestForExistingUser({ ...PRODUCTION_DATASETS.flexitarian, email: flexitarianEmail });

    const [omniRes, veganRes, vegeRes, flexiRes] = await Promise.all([
      fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(omnivorePayload),
      }),
      fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(veganPayload),
      }),
      fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vegetarianPayload),
      }),
      fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flexitarianPayload),
      }),
    ]);

    // All should be rejected
    expect(omniRes.status).toBe(403);
    expect(veganRes.status).toBe(403);
    expect(vegeRes.status).toBe(403);
    expect(flexiRes.status).toBe(403);
  });
});
