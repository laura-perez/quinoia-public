/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createTestUser, createMockStripeCustomerId, createMockStripeSubscriptionId } from '../database/helpers';
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

describe('Onboarding - Existing User (paid_active)', () => {
  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  beforeAll(() => {
    supabase = createSupabaseServiceClient();
  });

  afterAll(async () => {
    await cleanupTestUsers(supabase);
  });

  it('should allow paid_active user to generate menu without changing status', async () => {
    // ============================================
    // ARRANGE - Create paid_active user
    // ============================================
    const email = generateTestEmail();
    const paidUntilDate = new Date();
    paidUntilDate.setMonth(paidUntilDate.getMonth() + 1); // Paid for 1 more month

    const existingUser = await createTestUser({
      email,
      status: 'paid_active',
      hasUsedTrial: true,
      stripeCustomerId: createMockStripeCustomerId(),
      stripeSubscriptionId: createMockStripeSubscriptionId(),
      stripePriceId: process.env.STRIPE_PRICE_MONTHLY_PROMO,
      subscriptionType: 'monthly',
      paidUntil: paidUntilDate.toISOString(),
    });

    const profile = {
      ...PRODUCTION_DATASETS.vegetarian,
      email,
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
    // ASSERT - Verify user status UNCHANGED (still paid_active)
    // ============================================
    const updatedUser = await verifyUserInDatabase(
      supabase,
      email,
      'paid_active' // Should remain paid_active
    );

    // User ID and Stripe info should remain the same
    expect(updatedUser.id).toBe(existingUser.id);
    expect(updatedUser.stripeCustomerId).toBe(existingUser.stripeCustomerId);
    expect(updatedUser.stripeSubscriptionId).toBe(existingUser.stripeSubscriptionId);

    // ============================================
    // NOTE: Email sending is mocked server-side
    // We don't verify email calls in HTTP integration tests
    // ============================================
  });

  it('should allow paid_active user to generate multiple menus', async () => {
    // ============================================
    // ARRANGE - Create paid_active user
    // ============================================
    const email = generateTestEmail();
    const paidUntilDate = new Date();
    paidUntilDate.setFullYear(paidUntilDate.getFullYear() + 1); // Paid yearly

    await createTestUser({
      email,
      status: 'paid_active',
      hasUsedTrial: true,
      stripeCustomerId: createMockStripeCustomerId(),
      stripeSubscriptionId: createMockStripeSubscriptionId(),
      stripePriceId: process.env.STRIPE_PRICE_YEARLY,
      subscriptionType: 'yearly',
      paidUntil: paidUntilDate.toISOString(),
    });

    // ============================================
    // ACT - Generate first menu (omnivore)
    // ============================================
    const firstProfile = {
      ...PRODUCTION_DATASETS.omnivore,
      email,
    };
    const firstPayload = createSubmitRequestForExistingUser(firstProfile);

    const firstResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firstPayload),
    });

    const firstData = await firstResponse.json();

    // ============================================
    // ACT - Generate second menu (vegan)
    // ============================================
    const secondProfile = {
      ...PRODUCTION_DATASETS.vegan,
      email,
    };
    const secondPayload = createSubmitRequestForExistingUser(secondProfile);

    const secondResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(secondPayload),
    });

    const secondData = await secondResponse.json();

    // ============================================
    // ASSERT - Both requests should succeed
    // ============================================
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    // ShareIds should be different
    expect(firstData.shareId).not.toBe(secondData.shareId);

    // User should still be paid_active
    await verifyUserInDatabase(supabase, email, 'paid_active');
  });

  it('should handle paid_active user with different subscription types', async () => {
    // Test monthly subscriber
    const monthlyEmail = generateTestEmail();
    const monthlyPaidUntil = new Date();
    monthlyPaidUntil.setMonth(monthlyPaidUntil.getMonth() + 1);

    await createTestUser({
      email: monthlyEmail,
      status: 'paid_active',
      hasUsedTrial: true,
      subscriptionType: 'monthly',
      paidUntil: monthlyPaidUntil.toISOString(),
    });

    const monthlyProfile = { ...PRODUCTION_DATASETS.flexitarian, email: monthlyEmail };
    const monthlyPayload = createSubmitRequestForExistingUser(monthlyProfile);

    const monthlyResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monthlyPayload),
    });

    expect(monthlyResponse.status).toBe(200);
    await verifyUserInDatabase(supabase, monthlyEmail, 'paid_active');

    // Test yearly subscriber
    const yearlyEmail = generateTestEmail();
    const yearlyPaidUntil = new Date();
    yearlyPaidUntil.setFullYear(yearlyPaidUntil.getFullYear() + 1);

    await createTestUser({
      email: yearlyEmail,
      status: 'paid_active',
      hasUsedTrial: true,
      subscriptionType: 'yearly',
      paidUntil: yearlyPaidUntil.toISOString(),
    });

    const yearlyProfile = { ...PRODUCTION_DATASETS.vegan, email: yearlyEmail };
    const yearlyPayload = createSubmitRequestForExistingUser(yearlyProfile);

    const yearlyResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(yearlyPayload),
    });

    expect(yearlyResponse.status).toBe(200);
    await verifyUserInDatabase(supabase, yearlyEmail, 'paid_active');
  });
});
