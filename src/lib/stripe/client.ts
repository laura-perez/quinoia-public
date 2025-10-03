/**
 * Stripe client-side utilities
 */

import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG } from './config';

// Initialize Stripe promise
let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_CONFIG.publicKey);
  }
  return stripePromise;
};

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(sessionId: string) {
  const stripe = await getStripe();

  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  const { error } = await stripe.redirectToCheckout({ sessionId });

  if (error) {
    throw error;
  }
}

/**
 * Create embedded checkout session
 */
export async function createEmbeddedCheckout(sessionId: string, container: HTMLElement) {
  const stripe = await getStripe();

  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  const checkout = await stripe.initEmbeddedCheckout({
    checkoutSessionId: sessionId,
  });

  checkout.mount(container);

  return checkout;
}