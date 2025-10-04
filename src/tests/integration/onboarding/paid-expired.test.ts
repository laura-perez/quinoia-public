/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createTestUser, createMockStripeCustomerId, createMockStripeSubscriptionId } from '../database/helpers';
import {
  PRODUCTION_DATASETS,
  createSubmitRequestForExistingUser,
  cleanupTestUsers,
} from './helpers';
import { generateTestEmail } from '../shared/test-utils';
import { TEST_CONSTANTS } from '../shared/constants';

const SUBMIT_URL = TEST_CONSTANTS.SUBMIT_URL;

describe('Onboarding - Paid Expired (paid_expired)', () => {
  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  beforeAll(() => {
    supabase = createSupabaseServiceClient();
  });

  afterAll(async () => {
    await cleanupTestUsers(supabase);
  });

  it('should reject user with paid_expired status and redirect to pricing', async () => {
    // ============================================
    // ARRANGE - Create user with paid_expired
    // ============================================
    const email = generateTestEmail();
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() - 1); // Expired 1 month ago

    await createTestUser({
      email,
      status: 'paid_expired',
      hasUsedTrial: true,
      stripeCustomerId: createMockStripeCustomerId(),
      stripeSubscriptionId: createMockStripeSubscriptionId(),
      stripePriceId: process.env.STRIPE_PRICE_MONTHLY_PROMO,
      subscriptionType: 'monthly',
      paidUntil: expiredDate.toISOString(),
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
    // ASSERT - User status should remain paid_expired
    // ============================================
    const { data: user } = await supabase
      .from('user')
      .select('status')
      .eq('email', email)
      .single();

    expect(user?.status).toBe('paid_expired');
  });

  it('should reject paid_expired user with expired monthly subscription', async () => {
    const email = generateTestEmail();
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 5); // Expired 5 days ago

    await createTestUser({
      email,
      status: 'paid_expired',
      hasUsedTrial: true,
      stripeCustomerId: createMockStripeCustomerId(),
      stripePriceId: process.env.STRIPE_PRICE_MONTHLY_PROMO,
      subscriptionType: 'monthly',
      paidUntil: expiredDate.toISOString(),
    });

    const profile = { ...PRODUCTION_DATASETS.vegan, email };
    const payload = createSubmitRequestForExistingUser(profile);

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(403);

    const responseData = await response.json();
    expect(responseData.error).toBe('Essai déjà utilisé');
  });

  it('should reject paid_expired user with expired yearly subscription', async () => {
    const email = generateTestEmail();
    const expiredDate = new Date();
    expiredDate.setFullYear(expiredDate.getFullYear() - 1); // Expired 1 year ago

    await createTestUser({
      email,
      status: 'paid_expired',
      hasUsedTrial: true,
      stripeCustomerId: createMockStripeCustomerId(),
      stripePriceId: process.env.STRIPE_PRICE_YEARLY,
      subscriptionType: 'yearly',
      paidUntil: expiredDate.toISOString(),
    });

    const profile = { ...PRODUCTION_DATASETS.vegetarian, email };
    const payload = createSubmitRequestForExistingUser(profile);

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(403);
  });

  it('should reject multiple attempts from paid_expired user', async () => {
    const email = generateTestEmail();
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() - 2);

    await createTestUser({
      email,
      status: 'paid_expired',
      hasUsedTrial: true,
      paidUntil: expiredDate.toISOString(),
    });

    const profile = { ...PRODUCTION_DATASETS.flexitarian, email };
    const payload = createSubmitRequestForExistingUser(profile);

    // First attempt
    const firstResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(firstResponse.status).toBe(403);

    // Second attempt
    const secondResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(secondResponse.status).toBe(403);

    // Third attempt
    const thirdResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(thirdResponse.status).toBe(403);
  });

  it('should reject paid_expired but still preserve user data', async () => {
    const email = generateTestEmail();
    const firstName = 'Former Subscriber';
    const stripeCustomerId = createMockStripeCustomerId();
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() - 3);

    await createTestUser({
      email,
      status: 'paid_expired',
      hasUsedTrial: true,
      stripeCustomerId,
      stripePriceId: process.env.STRIPE_PRICE_MONTHLY_PROMO,
      subscriptionType: 'monthly',
      paidUntil: expiredDate.toISOString(),
    });

    const profile = { ...PRODUCTION_DATASETS.omnivore, email, name: firstName };
    const payload = createSubmitRequestForExistingUser(profile);

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(403);

    // Verify user data is preserved (not deleted or corrupted)
    const { data: user } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .single();

    expect(user).toBeDefined();
    expect(user.status).toBe('paid_expired');
    expect(user.stripeCustomerId).toBe(stripeCustomerId);
    expect(user.hasUsedTrial).toBe(true);
  });
});
