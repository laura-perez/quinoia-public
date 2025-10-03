/**
 * Stripe server-side utilities
 */

import Stripe from 'stripe';
import { STRIPE_CONFIG } from './config';
import { createLogger } from '../logger';

const logger = createLogger();

// Create mock subscription for integration tests
function createMockSubscription(subscriptionId: string): Stripe.Subscription {
  const priceId = subscriptionId.includes('yearly')
    ? process.env.STRIPE_PRICE_YEARLY!
    : process.env.STRIPE_PRICE_MONTHLY_PROMO!;

  const now = Math.floor(Date.now() / 1000);
  const isYearly = priceId === process.env.STRIPE_PRICE_YEARLY;

  return {
    id: subscriptionId,
    object: 'subscription',
    customer: subscriptionId.replace('sub_', 'cus_') as any,
    status: 'active',
    current_period_start: now,
    current_period_end: now + (isYearly ? 365 : 30) * 24 * 60 * 60,
    items: {
      object: 'list',
      data: [
        {
          id: `si_${subscriptionId}`,
          object: 'subscription_item',
          price: {
            id: priceId,
            object: 'price',
            active: true,
            currency: 'eur',
            recurring: {
              interval: isYearly ? 'year' : 'month',
              interval_count: 1,
            } as any,
            type: 'recurring',
            unit_amount: 1000,
          } as Stripe.Price,
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: '',
    },
    created: now,
    cancel_at_period_end: false,
    canceled_at: null,
    ended_at: null,
    metadata: {},
  } as Stripe.Subscription;
}

// Initialize real Stripe instance
const realStripe = new Stripe(STRIPE_CONFIG.secretKey, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

// Export mocked or real Stripe based on environment
export const stripe = process.env.INTEGRATION_TESTS === 'true'
  ? {
      ...realStripe,
      subscriptions: {
        ...realStripe.subscriptions,
        retrieve: async (subscriptionId: string) => {
          logger.info('[MOCK] Stripe subscription retrieve', { subscriptionId });
          return createMockSubscription(subscriptionId);
        },
      },
    } as unknown as Stripe
  : realStripe;

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession({
  priceId,
  customerEmail,
  successUrl,
  cancelUrl,
  mode = 'subscription',
}: {
  priceId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  mode?: 'subscription' | 'payment';
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: false },
      billing_address_collection: 'auto',
      subscription_data: mode === 'subscription' ? {
        metadata: {
          source: 'quinoia_website',
        },
      } : undefined,
      metadata: {
        source: 'quinoia_website',
        customer_email: customerEmail,
      },
    });

    return session;
  } catch (error) {
    logger.error('Stripe: Error creating checkout session', {
      error: error instanceof Error ? error.message : String(error),
      priceId,
      customerEmail: customerEmail.substring(0, 3) + '***'
    });
    throw error;
  }
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });
    return session;
  } catch (error) {
    logger.error('Stripe: Error retrieving checkout session', {
      error: error instanceof Error ? error.message : String(error),
      sessionId
    });
    throw error;
  }
}

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer(email: string, name?: string) {
  try {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'quinoia_website',
      },
    });

    return customer;
  } catch (error) {
    logger.error('Stripe: Error with customer', {
      error: error instanceof Error ? error.message : String(error),
      email: email.substring(0, 3) + '***'
    });
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, STRIPE_CONFIG.webhookSecret);
  } catch (error) {
    logger.error('Stripe: Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
      signatureLength: signature.length
    });
    throw error;
  }
}