/**
 * Stripe webhook test helpers
 */

import Stripe from 'stripe';
import * as crypto from 'crypto';
import { generateTestId, getCurrentTimestamp, getTimestampMinutesAgo } from '../shared/test-utils';

/**
 * Extended Invoice type for webhook testing
 * Actual Stripe webhook payloads include subscription field even though TypeScript definition doesn't
 */
interface InvoiceWebhookPayload extends Partial<Stripe.Invoice> {
  subscription?: string | Stripe.Subscription;
}

/**
 * Create a mock Stripe event for testing
 */
export function createMockStripeEvent<T = any>(
  type: string,
  data: T,
  eventId?: string
): Stripe.Event {
  return {
    id: eventId || generateTestId('evt_test_'),
    object: 'event',
    api_version: '2025-08-27.basil',
    created: getCurrentTimestamp(),
    type,
    data: {
      object: data,
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
  } as Stripe.Event;
}

/**
 * Sign a Stripe webhook payload
 * Mimics Stripe's signature generation
 */
export function signStripeWebhook(
  payload: string | Buffer,
  secret: string,
  timestamp?: number
): string {
  const ts = timestamp || getCurrentTimestamp();
  const payloadString = typeof payload === 'string' ? payload : payload.toString();

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${payloadString}`)
    .digest('hex');

  return `t=${ts},v1=${signature}`;
}

/**
 * Create an invalid signature for testing rejection
 */
export function createInvalidSignature(): string {
  const ts = getCurrentTimestamp();
  const randomSignature = crypto.randomBytes(32).toString('hex');
  return `t=${ts},v1=${randomSignature}`;
}

/**
 * Create a signature with old timestamp (for replay attack testing)
 */
export function createOldTimestampSignature(
  payload: string,
  secret: string,
  minutesOld: number = 10
): string {
  const oldTimestamp = getTimestampMinutesAgo(minutesOld);
  return signStripeWebhook(payload, secret, oldTimestamp);
}

/**
 * Create mock checkout session completed event
 */
export function createCheckoutCompletedEvent(
  customerEmail: string,
  subscriptionId: string,
  customerId: string,
  priceId: string
): Stripe.Event {
  const session: Partial<Stripe.Checkout.Session> = {
    id: generateTestId('cs_test_'),
    object: 'checkout.session',
    customer: customerId,
    customer_email: customerEmail,
    subscription: subscriptionId,
    mode: 'subscription',
    payment_status: 'paid',
    status: 'complete',
  };

  return createMockStripeEvent('checkout.session.completed', session);
}

/**
 * Create mock invoice payment succeeded event
 */
export function createInvoicePaymentSucceededEvent(
  customerEmail: string,
  subscriptionId: string,
  customerId: string,
  priceId: string,
  periodEnd: number
): Stripe.Event {
  const invoice: InvoiceWebhookPayload = {
    id: generateTestId('in_test_'),
    object: 'invoice',
    customer: customerId,
    customer_email: customerEmail,
    subscription: subscriptionId,
    status: 'paid',
    lines: {
      object: 'list',
      data: [
        {
          id: generateTestId('il_test_'),
          object: 'line_item',
          period: {
            start: getCurrentTimestamp(),
            end: periodEnd,
          },
          price: {
            id: priceId,
          } as any,
        } as any,
      ],
      has_more: false,
      url: '',
    },
  };

  return createMockStripeEvent('invoice.payment_succeeded', invoice);
}

/**
 * Create mock invoice payment failed event
 */
export function createInvoicePaymentFailedEvent(
  customerEmail: string,
  customerId: string
): Stripe.Event {
  const invoice: Partial<Stripe.Invoice> = {
    id: generateTestId('in_test_'),
    object: 'invoice',
    customer: customerId,
    customer_email: customerEmail,
    status: 'open',
    attempt_count: 3,
  };

  return createMockStripeEvent('invoice.payment_failed', invoice);
}

/**
 * Create mock subscription deleted event
 */
export function createSubscriptionDeletedEvent(
  subscriptionId: string,
  customerId: string
): Stripe.Event {
  const subscription: Partial<Stripe.Subscription> = {
    id: subscriptionId,
    object: 'subscription',
    customer: customerId,
    status: 'canceled',
    canceled_at: getCurrentTimestamp(),
  };

  return createMockStripeEvent('customer.subscription.deleted', subscription);
}
