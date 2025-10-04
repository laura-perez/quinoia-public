/**
 * Stripe server-side utilities
 * Production Stripe SDK
 */

import Stripe from 'stripe';
import { STRIPE_CONFIG } from './config';
import { createLogger } from '../logger';

const logger = createLogger();

/**
 * Initialize Stripe SDK
 * In integration tests (INTEGRATION_TESTS=true), subscription.retrieve() is mocked
 * to avoid real API calls. See src/tests/integration/stripe/mocks.ts
 */
function createStripeInstance(): Stripe {
  const realStripe = new Stripe(STRIPE_CONFIG.secretKey, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
  });

  // In integration test environment, apply mocks
  if (process.env.INTEGRATION_TESTS === 'true') {
    // Dynamic import to keep test code out of production bundle
    const { createMockedStripeInstance } = require('../../tests/integration/stripe/mocks');
    return createMockedStripeInstance(realStripe);
  }

  return realStripe;
}

export const stripe = createStripeInstance();

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