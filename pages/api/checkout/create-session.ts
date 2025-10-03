/**
 * API endpoint to create Stripe checkout sessions
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createCheckoutSession, PLAN_METADATA, PlanType } from '@/lib/stripe';
import { getClientIPForRateLimit } from '@/lib/auth';
import { limit } from '@/lib/auth/rateLimits';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting: 5 checkout sessions per minute per IP
    const ipData = getClientIPForRateLimit(req);
    const rateLimitResult = await limit(ipData.key, 5, 60);

    if (!rateLimitResult.success) {
      logger.warn('Checkout rate limit exceeded', {
        ip: ipData.key,
        remaining: rateLimitResult.remaining,
        reset: new Date(rateLimitResult.reset)
      });
      return res.status(429).json({
        error: 'Trop de tentatives. Veuillez réessayer dans quelques instants.',
        retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      });
    }

    const { planType, customerEmail } = req.body;

    // Validate input
    if (!planType || !customerEmail) {
      return res.status(400).json({
        error: 'Missing required fields: planType and customerEmail'
      });
    }

    if (!Object.keys(PLAN_METADATA).includes(planType)) {
      return res.status(400).json({
        error: 'Invalid plan type. Must be "monthly" or "yearly"'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    const plan = PLAN_METADATA[planType as PlanType];

    // Create checkout session
    const session = await createCheckoutSession({
      priceId: plan.priceId,
      customerEmail,
      successUrl: `${process.env.APP_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.APP_BASE_URL}/checkout/error`,
      mode: 'subscription',
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    logger.error('Error creating checkout session', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      planType: req.body.planType,
      customerEmail: req.body.customerEmail?.substring(0, 3) + '***' // Partial email for privacy
    });
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}