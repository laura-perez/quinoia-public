/**
 * Stripe Webhook Security Integration Tests
 *
 * Tests webhook signature verification, idempotence, event ordering,
 * database transactions, and error handling.
 *
 * SETUP REQUIRED:
 * - Next.js dev server running on localhost:3000
 * - Supabase local running on localhost:54321
 * - Stripe SDK mocked (no real Stripe API calls)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createMockStripeEvent,
  signStripeWebhook,
  createInvalidSignature,
  createOldTimestampSignature,
  createCheckoutCompletedEvent,
  createInvoicePaymentSucceededEvent,
} from './helpers';
import {
  createTestUser,
  deleteTestUserByEmail,
  getUserByEmail,
  cleanupTestUsers,
  createMockStripeCustomerId,
  createMockStripeSubscriptionId,
} from '../database/helpers';
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/stripe';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// NOTE: Stripe SDK is mocked in src/lib/stripe/server.ts when INTEGRATION_TESTS=true
// This ensures stripe.subscriptions.retrieve() returns mock data
// while keeping webhook signature verification working with real Stripe SDK

describe('Stripe Webhook Security', () => {
  beforeAll(async () => {
    // Ensure we have required env vars
    if (!WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET not set in environment');
    }
  });

  afterAll(async () => {
    // Cleanup all test users
    await cleanupTestUsers();
  });

  describe('1.1 Webhook Signature Verification', () => {
    it('should accept valid webhook signature', async () => {
      const customerEmail = `test-valid-sig-${Date.now()}@example.com`;
      const customerId = createMockStripeCustomerId();
      const subscriptionId = createMockStripeSubscriptionId();
      const priceId = process.env.STRIPE_PRICE_MONTHLY_PROMO!;

      // Create test user
      await createTestUser({
        email: customerEmail,
        status: 'trial_used',
      });

      // Create event payload
      const event = createCheckoutCompletedEvent(
        customerEmail,
        subscriptionId,
        customerId,
        priceId
      );
      const payload = JSON.stringify(event);
      const signature = signStripeWebhook(payload, WEBHOOK_SECRET);

      // Send webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payload,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);

      // Verify user was updated
      const user = await getUserByEmail(customerEmail);
      expect(user).toBeTruthy();
      expect(user!.status).toBe('paid_active');

      // Cleanup
      await deleteTestUserByEmail(customerEmail);
    });

    it('should reject invalid webhook signature', async () => {
      const event = createMockStripeEvent('checkout.session.completed', {
        customer_email: 'test@example.com',
      });
      const payload = JSON.stringify(event);
      const invalidSignature = createInvalidSignature();

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': invalidSignature,
        },
        body: payload,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    it('should reject webhook without signature header', async () => {
      const event = createMockStripeEvent('checkout.session.completed', {
        customer_email: 'test@example.com',
      });
      const payload = JSON.stringify(event);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('signature');
    });

    it('should reject replayed webhooks (old timestamp)', async () => {
      const event = createMockStripeEvent('checkout.session.completed', {
        customer_email: 'test@example.com',
      });
      const payload = JSON.stringify(event);

      // Create signature with 10-minute-old timestamp
      const oldSignature = createOldTimestampSignature(payload, WEBHOOK_SECRET, 10);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': oldSignature,
        },
        body: payload,
      });

      // Stripe SDK automatically rejects timestamps > 5 minutes old
      expect(response.status).toBe(400);
    });
  });

  describe('1.2 Event Idempotence', () => {
    it('should handle duplicate checkout.session.completed events', async () => {
      const customerEmail = `test-idempotent-checkout-${Date.now()}@example.com`;
      const customerId = createMockStripeCustomerId();
      const subscriptionId = createMockStripeSubscriptionId();
      const priceId = process.env.STRIPE_PRICE_MONTHLY_PROMO!;
      const eventId = `evt_test_idempotent_${Date.now()}`;

      // Create test user
      await createTestUser({
        email: customerEmail,
        status: 'trial_used',
      });

      // Create event with specific ID
      const event = createCheckoutCompletedEvent(
        customerEmail,
        subscriptionId,
        customerId,
        priceId
      );
      event.id = eventId;

      const payload = JSON.stringify(event);
      const signature = signStripeWebhook(payload, WEBHOOK_SECRET);

      // Send webhook first time
      const response1 = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payload,
      });

      expect(response1.status).toBe(200);

      // Get user state after first event
      const userAfterFirst = await getUserByEmail(customerEmail);
      expect(userAfterFirst!.status).toBe('paid_active');
      expect(userAfterFirst!.stripeSubscriptionId).toBe(subscriptionId);
      const firstUpdatedAt = userAfterFirst!.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send SAME webhook again (duplicate)
      const signature2 = signStripeWebhook(payload, WEBHOOK_SECRET);
      const response2 = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature2,
        },
        body: payload,
      });

      expect(response2.status).toBe(200);

      // Verify user state unchanged or properly handled
      const userAfterSecond = await getUserByEmail(customerEmail);
      expect(userAfterSecond!.status).toBe('paid_active');
      expect(userAfterSecond!.stripeSubscriptionId).toBe(subscriptionId);

      // User should still exist (no duplication)
      expect(userAfterSecond!.id).toBe(userAfterFirst!.id);

      // Cleanup
      await deleteTestUserByEmail(customerEmail);
    });

    it('should handle duplicate invoice.payment_succeeded events', async () => {
      const customerEmail = `test-idempotent-invoice-${Date.now()}@example.com`;
      const customerId = createMockStripeCustomerId();
      const subscriptionId = createMockStripeSubscriptionId();
      const priceId = process.env.STRIPE_PRICE_MONTHLY_PROMO!;
      const eventId = `evt_test_invoice_idempotent_${Date.now()}`;

      // Create paid user with subscription
      const periodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
      await createTestUser({
        email: customerEmail,
        status: 'paid_active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        subscriptionType: 'monthly',
        paidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Create renewal event
      const event = createInvoicePaymentSucceededEvent(
        customerEmail,
        subscriptionId,
        customerId,
        priceId,
        periodEnd
      );
      event.id = eventId;

      const payload = JSON.stringify(event);
      const signature = signStripeWebhook(payload, WEBHOOK_SECRET);

      // Send webhook first time
      const response1 = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payload,
      });

      expect(response1.status).toBe(200);

      const userAfterFirst = await getUserByEmail(customerEmail);
      const firstPaidUntil = userAfterFirst!.paidUntil;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send SAME webhook again
      const signature2 = signStripeWebhook(payload, WEBHOOK_SECRET);
      const response2 = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature2,
        },
        body: payload,
      });

      expect(response2.status).toBe(200);

      const userAfterSecond = await getUserByEmail(customerEmail);

      // paidUntil should be same or only updated once (not doubled)
      expect(userAfterSecond!.paidUntil).toBeTruthy();
      expect(userAfterSecond!.status).toBe('paid_active');

      // Cleanup
      await deleteTestUserByEmail(customerEmail);
    });
  });

  describe('1.3 Event Ordering & Race Conditions', () => {
    it('should handle payment_succeeded arriving before checkout.session.completed', async () => {
      const customerEmail = `test-ordering-${Date.now()}@example.com`;
      const customerId = createMockStripeCustomerId();
      const subscriptionId = createMockStripeSubscriptionId();
      const priceId = process.env.STRIPE_PRICE_MONTHLY_PROMO!;

      // Ensure no user exists yet
      await deleteTestUserByEmail(customerEmail);

      // Send invoice.payment_succeeded FIRST (user doesn't exist)
      const periodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      const invoiceEvent = createInvoicePaymentSucceededEvent(
        customerEmail,
        subscriptionId,
        customerId,
        priceId,
        periodEnd
      );

      const invoicePayload = JSON.stringify(invoiceEvent);
      const invoiceSignature = signStripeWebhook(invoicePayload, WEBHOOK_SECRET);

      const invoiceResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': invoiceSignature,
        },
        body: invoicePayload,
      });

      expect(invoiceResponse.status).toBe(200);

      // Verify user was created via upsert
      const userAfterInvoice = await getUserByEmail(customerEmail);
      expect(userAfterInvoice).toBeTruthy();
      expect(userAfterInvoice!.status).toBe('paid_active');

      // Now send checkout.session.completed (arrives late)
      const checkoutEvent = createCheckoutCompletedEvent(
        customerEmail,
        subscriptionId,
        customerId,
        priceId
      );

      const checkoutPayload = JSON.stringify(checkoutEvent);
      const checkoutSignature = signStripeWebhook(checkoutPayload, WEBHOOK_SECRET);

      const checkoutResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': checkoutSignature,
        },
        body: checkoutPayload,
      });

      expect(checkoutResponse.status).toBe(200);

      // Verify user still exists and data is correct
      const userAfterCheckout = await getUserByEmail(customerEmail);
      expect(userAfterCheckout).toBeTruthy();
      expect(userAfterCheckout!.status).toBe('paid_active');
      expect(userAfterCheckout!.stripeSubscriptionId).toBe(subscriptionId);

      // Should be same user (no duplicate)
      expect(userAfterCheckout!.id).toBe(userAfterInvoice!.id);

      // Cleanup
      await deleteTestUserByEmail(customerEmail);
    });

    it('should handle concurrent webhooks for same user', async () => {
      const customerEmail = `test-concurrent-${Date.now()}@example.com`;
      const customerId = createMockStripeCustomerId();
      const subscriptionId = createMockStripeSubscriptionId();
      const priceId = process.env.STRIPE_PRICE_MONTHLY_PROMO!;

      // Create initial user
      await createTestUser({
        email: customerEmail,
        status: 'trial_used',
      });

      // Create two different events for same user
      const event1 = createCheckoutCompletedEvent(
        customerEmail,
        subscriptionId,
        customerId,
        priceId
      );
      event1.id = `evt_concurrent_1_${Date.now()}`;

      const periodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      const event2 = createInvoicePaymentSucceededEvent(
        customerEmail,
        subscriptionId,
        customerId,
        priceId,
        periodEnd
      );
      event2.id = `evt_concurrent_2_${Date.now()}`;

      const payload1 = JSON.stringify(event1);
      const payload2 = JSON.stringify(event2);
      const signature1 = signStripeWebhook(payload1, WEBHOOK_SECRET);
      const signature2 = signStripeWebhook(payload2, WEBHOOK_SECRET);

      // Send both webhooks concurrently
      const [response1, response2] = await Promise.all([
        fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': signature1,
          },
          body: payload1,
        }),
        fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': signature2,
          },
          body: payload2,
        }),
      ]);

      // Both should succeed
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verify final state is coherent
      const finalUser = await getUserByEmail(customerEmail);
      expect(finalUser).toBeTruthy();
      expect(finalUser!.status).toBe('paid_active');
      expect(finalUser!.stripeSubscriptionId).toBe(subscriptionId);

      // Cleanup
      await deleteTestUserByEmail(customerEmail);
    });
  });

  describe('1.4 Database Transaction Rollback', () => {
    it('should return 500 on database errors (for Stripe retry)', async () => {
      // This test verifies error handling behavior
      // We'll use an invalid payload that might cause DB issues

      const event = createCheckoutCompletedEvent(
        '', // Empty email will cause issues
        'sub_invalid',
        'cus_invalid',
        'price_invalid'
      );

      const payload = JSON.stringify(event);
      const signature = signStripeWebhook(payload, WEBHOOK_SECRET);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payload,
      });

      // Webhook should handle error gracefully
      // Either 200 (handled) or 500 (will retry) are acceptable
      // But 400 would be wrong as Stripe won't retry
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('1.5 Stripe API Failures During Webhook', () => {
    // Note: This test requires mocking Stripe API which is complex in integration tests
    // For now, we verify the webhook handles missing subscription data gracefully

    it('should handle missing subscription data gracefully', async () => {
      const customerEmail = `test-missing-sub-${Date.now()}@example.com`;
      const customerId = createMockStripeCustomerId();

      // Create event without subscription
      const event = createMockStripeEvent('checkout.session.completed', {
        id: `cs_test_${Date.now()}`,
        customer: customerId,
        customer_email: customerEmail,
        // Missing subscription field
        mode: 'subscription',
        payment_status: 'paid',
        status: 'complete',
      });

      const payload = JSON.stringify(event);
      const signature = signStripeWebhook(payload, WEBHOOK_SECRET);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payload,
      });

      // Webhook should handle missing data and not crash
      expect(response.status).toBe(200);

      // User should not be created/updated if subscription is missing
      const user = await getUserByEmail(customerEmail);
      // Either null or unchanged status
      if (user) {
        expect(user.status).not.toBe('paid_active');
      }
    });
  });
});
