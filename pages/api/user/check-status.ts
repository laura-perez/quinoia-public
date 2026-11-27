import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { usersRepository } from '@/lib/supabase/repositories/users';
import { getClientIPForRateLimit } from '@/lib/auth/ipDetection';
import { limit } from '@/lib/auth/rateLimits';
import { createLogger, redact } from '@/lib/logger';
import { USER_STATUS } from '@/lib/supabase/types/user.types';

// 10 checks per IP per minute
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SEC = 60;

const checkStatusSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

/**
 * API endpoint used by the questionnaire page (pages/formulaire.jsx) to decide
 * whether a returning visitor must log in instead of filling the form again.
 *
 * Returns only `{ requiresLogin }`: true when an account exists for the email and
 * its free trial is no longer available. It does not reveal the exact status.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createLogger();
  res.setHeader('X-Run-ID', logger.getRunId());

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ipData = getClientIPForRateLimit(req);
  const rateLimitResult = await limit(`check-status:${ipData.key}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC);

  if (!rateLimitResult.success) {
    logger.warn('Check status rate limit exceeded', {
      ip: redact(ipData.key),
      reset: new Date(rateLimitResult.reset).toISOString()
    });
    return res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      details: { retryAfter: Math.max(0, Math.ceil((rateLimitResult.reset - Date.now()) / 1000)) }
    });
  }

  const parsed = checkStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid email is required', code: 'INVALID_INPUT' });
  }

  try {
    const user = await usersRepository.findByEmail(parsed.data.email);

    return res.status(200).json({
      requiresLogin: !!user && user.status !== USER_STATUS.TRIAL_AVAILABLE,
    });
  } catch (error) {
    logger.error('Error checking user status', { error });
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
