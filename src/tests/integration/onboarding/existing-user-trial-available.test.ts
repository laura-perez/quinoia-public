/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createTestUser } from '../database/helpers';
import {
  PRODUCTION_DATASETS,
  createSubmitRequestForExistingUser,
  verifySuccessResponse,
  verifyUserInDatabase,
  cleanupTestUsers,
} from './helpers';
import { generateTestEmail } from '../shared/test-utils';
import { TEST_CONSTANTS } from '../shared/constants';

const SUBMIT_URL = TEST_CONSTANTS.SUBMIT_URL;

describe('Onboarding - Existing User (trial_available)', () => {
  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  beforeAll(() => {
    supabase = createSupabaseServiceClient();
  });

  afterAll(async () => {
    await cleanupTestUsers(supabase);
  });

  it('should allow existing user with trial_available to generate menu', async () => {
    // ============================================
    // ARRANGE - Create existing user with trial_available
    // ============================================
    const email = generateTestEmail();
    const existingUser = await createTestUser({
      email,
      status: 'trial_available',
      hasUsedTrial: false,
    });

    const profile = {
      ...PRODUCTION_DATASETS.omnivore,
      email, // Use existing user's email
      name: 'Updated Name', // Different name
    };
    const payload = createSubmitRequestForExistingUser(profile);

    // ============================================
    // ACT - Submit form
    // ============================================
    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // ============================================
    // ASSERT - Verify success
    // ============================================
    expect(response.status).toBe(200);
    verifySuccessResponse(responseData);

    // ============================================
    // ASSERT - Verify user status updated to trial_used
    // ============================================
    const updatedUser = await verifyUserInDatabase(
      supabase,
      email, // Use the original email (not modified)
      'trial_used' // Should be marked as used
      // Note: firstName should NOT be updated for existing users
    );

    // User ID should remain the same
    expect(updatedUser.id).toBe(existingUser.id);

    // ============================================
    // NOTE: Email sending is mocked server-side
    // We don't verify email calls in HTTP integration tests
    // ============================================
  });

  it('should generate different menus for multiple diets with trial_available users', async () => {
    // Create 2 existing users with trial_available
    const omniEmail = generateTestEmail();
    const veganEmail = generateTestEmail();

    await createTestUser({
      email: omniEmail,
      status: 'trial_available',
    });

    await createTestUser({
      email: veganEmail,
      status: 'trial_available',
    });

    // Submit for omnivore user
    const omniProfile = { ...PRODUCTION_DATASETS.omnivore, email: omniEmail };
    const omniPayload = createSubmitRequestForExistingUser(omniProfile);

    const omniResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(omniPayload),
    });

    const omniData = await omniResponse.json();

    // Submit for vegan user
    const veganProfile = { ...PRODUCTION_DATASETS.vegan, email: veganEmail };
    const veganPayload = createSubmitRequestForExistingUser(veganProfile);

    const veganResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(veganPayload),
    });

    const veganData = await veganResponse.json();

    // ============================================
    // ASSERT - Both should succeed
    // ============================================
    expect(omniResponse.status).toBe(200);
    expect(veganResponse.status).toBe(200);

    // Both users should be trial_used now
    await verifyUserInDatabase(supabase, omniEmail, 'trial_used');
    await verifyUserInDatabase(supabase, veganEmail, 'trial_used');

    // ShareIds should be different
    expect(omniData.shareId).not.toBe(veganData.shareId);
  });
});
