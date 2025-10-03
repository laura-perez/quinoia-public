/**
 * API endpoint to check Stripe checkout session status
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getCheckoutSession } from '@/lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        error: 'Invalid session ID'
      });
    }

    // Retrieve session from Stripe
    const session = await getCheckoutSession(sessionId);

    return res.status(200).json({
      status: session.status,
      customer_email: session.customer_email,
      payment_status: session.payment_status,
      subscription: session.subscription,
      customer: session.customer,
    });

  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return res.status(500).json({
      error: 'Failed to retrieve session status'
    });
  }
}