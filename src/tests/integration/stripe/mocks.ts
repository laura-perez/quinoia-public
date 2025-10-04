/**
 * Stripe API mocks for integration testing
 */

import Stripe from 'stripe';

/**
 * Mock subscription type for integration tests
 * Includes current_period_start/end which exist in actual API responses but not in TypeScript definition
 */
export interface MockSubscription extends Partial<Stripe.Subscription> {
  id: string;
  object: 'subscription';
  current_period_start?: number;
  current_period_end?: number;
}

/**
 * Create mock subscription for integration tests
 * Returns partial subscription with only fields needed for webhook handler
 */
export function createMockSubscription(subscriptionId: string): MockSubscription {
  const priceId = subscriptionId.includes('yearly')
    ? process.env.STRIPE_PRICE_YEARLY!
    : process.env.STRIPE_PRICE_MONTHLY_PROMO!;

  const now = Math.floor(Date.now() / 1000);
  const isYearly = priceId === process.env.STRIPE_PRICE_YEARLY;

  return {
    id: subscriptionId,
    object: 'subscription',
    customer: subscriptionId.replace('sub_', 'cus_'),
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
            },
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
  };
}

/**
 * Create mocked Stripe instance for integration tests
 * Wraps real Stripe SDK but mocks subscription.retrieve() to avoid API calls
 */
export function createMockedStripeInstance(realStripe: Stripe): Stripe {
  return {
    ...realStripe,
    subscriptions: {
      ...realStripe.subscriptions,
      retrieve: async (subscriptionId: string) => {
        console.log('[MOCK] Stripe subscription retrieve', { subscriptionId });
        return createMockSubscription(subscriptionId) as any;
      },
    },
  } as unknown as Stripe;
}
