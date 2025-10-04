/**
 * Stripe webhooks handler
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { verifyWebhookSignature, stripe } from '@/lib/stripe';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(buf.toString(), signature);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        // Silently ignore unhandled event types
        break;
    }

    logger.info('Stripe webhook processed successfully', {
      eventType: event.type,
      eventId: event.id
    });

    return res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Stripe webhook error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Webhook error'
    });
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const supabase = createSupabaseServiceClient();

    if (!session.customer_email || !session.subscription) {
      logger.warn('Checkout session missing required fields', {
        hasCustomerEmail: !!session.customer_email,
        hasSubscription: !!session.subscription,
        sessionId: session.id
      });
      return;
    }

    // Fetch full subscription object from Stripe
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    // @ts-ignore - Stripe SDK type mismatch with Response wrapper
    const priceId = subscription.items?.data?.[0]?.price?.id;

    let subscriptionType: 'monthly' | 'yearly' = 'monthly';
    if (priceId === process.env.STRIPE_PRICE_YEARLY) {
      subscriptionType = 'yearly';
    }

    // Use subscription period end as next payment date
    // Try to get from top-level first (older API), then from subscription item (newer API)
    // @ts-ignore - Stripe SDK type mismatch
    const periodEndTimestamp = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;

    if (!periodEndTimestamp) {
      logger.error('Missing current_period_end from subscription', {
        subscriptionId
      });
      throw new Error('Subscription missing current_period_end');
    }

    const nextPaymentDate = new Date(periodEndTimestamp * 1000);

    if (isNaN(nextPaymentDate.getTime())) {
      logger.error('Invalid date from current_period_end', {
        periodEndTimestamp,
        subscriptionId
      });
      throw new Error(`Invalid current_period_end value: ${periodEndTimestamp}`);
    }

    // Update or create user
    const { data: upsertedUser, error: upsertError } = await supabase
      .from('user')
      .upsert({
        email: session.customer_email,
        status: 'paid_active' as const,
        subscriptionType,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        paidUntil: nextPaymentDate.toISOString(),
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (upsertError) {
      logger.error('Failed to upsert user in handleCheckoutCompleted', {
        error: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
        email: session.customer_email?.substring(0, 3) + '***'
      });
      throw upsertError; // Re-throw to return 500, Stripe will retry
    }

    logger.info('Checkout completed successfully', {
      userId: upsertedUser.id,
      status: upsertedUser.status,
      email: session.customer_email?.substring(0, 3) + '***',
      subscriptionType
    });

    // TODO: Send welcome email here
    // await sendWelcomeEmail(session.customer_email);

  } catch (error) {
    logger.error('Error handling checkout completed', {
      error: error instanceof Error ? error.message : String(error),
      email: session.customer_email?.substring(0, 3) + '***'
    });
    throw error; // Re-throw to return 500 and let Stripe retry
  }
}

/**
 * Handle successful payment (first payment or renewal)
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const supabase = createSupabaseServiceClient();

    // Skip invoices without subscriptions (one-time payments)
    const invoiceSubscription = (invoice as any).subscription;
    if (!invoiceSubscription || !invoice.customer_email) {
      return;
    }

    // Get subscription details to determine type
    const subscriptionId = typeof invoiceSubscription === 'string'
      ? invoiceSubscription
      : invoiceSubscription.id;

    // Get price ID from invoice lines
    const priceId = (invoice.lines.data[0] as any)?.price?.id;

    let subscriptionType: 'monthly' | 'yearly' = 'monthly';
    if (priceId === process.env.STRIPE_PRICE_YEARLY) {
      subscriptionType = 'yearly';
    }

    // Calculate next payment date based on subscription period
    const periodEnd = invoice.lines.data[0]?.period?.end;
    const nextPaymentDate = periodEnd
      ? new Date(periodEnd * 1000)
      : new Date(Date.now() + (subscriptionType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

    // Upsert user (handles both first payment and renewals)
    const { data: upsertedUser, error: upsertError } = await supabase
      .from('user')
      .upsert({
        email: invoice.customer_email,
        status: 'paid_active' as const,
        subscriptionType,
        stripeCustomerId: invoice.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        paidUntil: nextPaymentDate.toISOString(),
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (upsertError) {
      logger.error('Failed to upsert user in handlePaymentSucceeded', {
        error: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
        email: invoice.customer_email?.substring(0, 3) + '***'
      });
      throw upsertError; // Re-throw to return 500, Stripe will retry
    }

    logger.info('Payment succeeded', {
      userId: upsertedUser.id,
      status: upsertedUser.status,
      email: invoice.customer_email?.substring(0, 3) + '***',
      subscriptionType,
      subscriptionId
    });

  } catch (error) {
    logger.error('Error handling payment succeeded', {
      error: error instanceof Error ? error.message : String(error),
      email: invoice.customer_email?.substring(0, 3) + '***'
    });
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const supabase = createSupabaseServiceClient();

    if (!invoice.customer_email) {
      return;
    }

    // Update user status to expired
    await supabase
      .from('user')
      .update({
        status: 'paid_expired',
        updatedAt: new Date().toISOString(),
      })
      .eq('stripeCustomerId', invoice.customer as string);

    logger.warn('Payment failed', {
      email: invoice.customer_email?.substring(0, 3) + '***',
      customerId: invoice.customer as string
    });

    // TODO: Send payment failure email
    // await sendPaymentFailureEmail(invoice.customer_email);

  } catch (error) {
    logger.error('Error handling payment failed', {
      error: error instanceof Error ? error.message : String(error),
      email: invoice.customer_email?.substring(0, 3) + '***'
    });
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const supabase = createSupabaseServiceClient();

    // Update user status back to trial used
    await supabase
      .from('user')
      .update({
        status: 'trial_used',
        subscriptionType: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        updatedAt: new Date().toISOString(),
      })
      .eq('stripeSubscriptionId', subscription.id);

    logger.info('Subscription cancelled', {
      subscriptionId: subscription.id
    });

  } catch (error) {
    logger.error('Error handling subscription deleted', {
      error: error instanceof Error ? error.message : String(error),
      subscriptionId: subscription.id
    });
  }
}