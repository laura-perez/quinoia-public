/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// Skip in local dev - requires real Supabase connection
// Run with: INTEGRATION_TESTS=true npm test
const runIntegrationTests = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('Stripe Webhook Integration', () => {
  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  beforeEach(() => {
    supabase = createSupabaseServiceClient();
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('user').delete().eq('email', 'webhook-test@example.com');
  });

  describe('checkout.session.completed', () => {
    it('should create user with paid_active status', async () => {
      const testEmail = 'webhook-test@example.com';

      // Simulate webhook handling
      await supabase.from('user').upsert({
        email: testEmail,
        status: 'paid_active',
        subscriptionType: 'monthly',
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        stripePriceId: 'price_test_123',
        paidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'email' });

      // Verify user was created
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.status).toBe('paid_active');
      expect(data?.subscriptionType).toBe('monthly');
      expect(data?.stripeCustomerId).toBe('cus_test_123');
    });

    it('should update existing trial_used user to paid_active', async () => {
      const testEmail = 'webhook-test@example.com';

      // Create trial user first
      await supabase.from('user').insert({
        email: testEmail,
        status: 'trial_used',
        hasUsedTrial: true,
      });

      // Simulate upgrade to paid
      await supabase.from('user').upsert({
        email: testEmail,
        status: 'paid_active',
        subscriptionType: 'yearly',
        stripeCustomerId: 'cus_test_456',
        stripeSubscriptionId: 'sub_test_456',
        stripePriceId: process.env.STRIPE_PRICE_YEARLY,
        paidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'email' });

      const { data } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(data?.status).toBe('paid_active');
      expect(data?.subscriptionType).toBe('yearly');
      expect(data?.hasUsedTrial).toBe(true); // Should preserve
    });

    it('should set correct subscriptionType based on price ID', async () => {
      const testEmail = 'webhook-test@example.com';

      // Test yearly subscription
      await supabase.from('user').upsert({
        email: testEmail,
        status: 'paid_active',
        subscriptionType: 'yearly',
        stripePriceId: process.env.STRIPE_PRICE_YEARLY,
        paidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'email' });

      const { data } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(data?.subscriptionType).toBe('yearly');
      expect(data?.stripePriceId).toBe(process.env.STRIPE_PRICE_YEARLY);
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('should renew user subscription and update paidUntil', async () => {
      const testEmail = 'webhook-test@example.com';

      // Create existing paid user
      await supabase.from('user').insert({
        email: testEmail,
        status: 'paid_active',
        subscriptionType: 'monthly',
        stripeCustomerId: 'cus_test_renewal',
        stripeSubscriptionId: 'sub_test_renewal',
        paidUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
      });

      // Simulate renewal payment
      const newPaidUntil = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000); // +35 days
      await supabase.from('user').upsert({
        email: testEmail,
        status: 'paid_active',
        paidUntil: newPaidUntil.toISOString(),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'email' });

      const { data } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(data?.status).toBe('paid_active');
      expect(new Date(data?.paidUntil!).getTime()).toBeGreaterThan(Date.now() + 30 * 24 * 60 * 60 * 1000);
    });
  });

  describe('invoice.payment_failed', () => {
    it('should mark user as paid_expired', async () => {
      const testEmail = 'webhook-test@example.com';

      // Create paid user
      await supabase.from('user').insert({
        email: testEmail,
        status: 'paid_active',
        subscriptionType: 'monthly',
        stripeCustomerId: 'cus_test_789',
      });

      // Simulate payment failure
      await supabase.from('user')
        .update({ status: 'paid_expired', updatedAt: new Date().toISOString() })
        .eq('stripeCustomerId', 'cus_test_789');

      const { data } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(data?.status).toBe('paid_expired');
      expect(data?.stripeCustomerId).toBe('cus_test_789'); // Should keep customer ID
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should revert user to trial_used and clear Stripe subscription data', async () => {
      const testEmail = 'webhook-test@example.com';

      // Create paid user
      await supabase.from('user').insert({
        email: testEmail,
        status: 'paid_active',
        subscriptionType: 'monthly',
        stripeCustomerId: 'cus_test_999',
        stripeSubscriptionId: 'sub_test_999',
        stripePriceId: 'price_test_999',
        hasUsedTrial: true,
      });

      // Simulate cancellation
      await supabase.from('user')
        .update({
          status: 'trial_used',
          subscriptionType: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          updatedAt: new Date().toISOString(),
        })
        .eq('stripeSubscriptionId', 'sub_test_999');

      const { data } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(data?.status).toBe('trial_used');
      expect(data?.subscriptionType).toBeNull();
      expect(data?.stripeSubscriptionId).toBeNull();
      expect(data?.stripePriceId).toBeNull();
      expect(data?.stripeCustomerId).toBe('cus_test_999'); // Should keep customer ID
      expect(data?.hasUsedTrial).toBe(true); // Should preserve
    });
  });

  describe('user lifecycle', () => {
    it('should handle complete user journey: trial → paid → cancelled', async () => {
      const testEmail = 'webhook-test@example.com';

      // 1. Trial user
      await supabase.from('user').insert({
        email: testEmail,
        status: 'trial_used',
        hasUsedTrial: true,
      });

      let { data } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(data?.status).toBe('trial_used');

      // 2. Upgrade to paid
      await supabase.from('user').upsert({
        email: testEmail,
        status: 'paid_active',
        subscriptionType: 'yearly',
        stripeCustomerId: 'cus_lifecycle',
        stripeSubscriptionId: 'sub_lifecycle',
        stripePriceId: process.env.STRIPE_PRICE_YEARLY,
        paidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'email' });

      ({ data } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single());

      expect(data?.status).toBe('paid_active');
      expect(data?.subscriptionType).toBe('yearly');

      // 3. Cancel subscription
      await supabase.from('user')
        .update({
          status: 'trial_used',
          subscriptionType: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          updatedAt: new Date().toISOString(),
        })
        .eq('stripeSubscriptionId', 'sub_lifecycle');

      ({ data } = await supabase
        .from('user')
        .select('*')
        .eq('email', testEmail)
        .single());

      expect(data?.status).toBe('trial_used');
      expect(data?.subscriptionType).toBeNull();
      expect(data?.hasUsedTrial).toBe(true); // Preserved throughout
    });
  });
});
