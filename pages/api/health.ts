/**
 * API Route: Health check
 * GET /api/health
 *
 * Runs one cheap read against the database and reports whether it succeeded.
 * Called daily by Vercel Cron (see vercel.json), which also helps keep the free-tier
 * Supabase project from being paused for inactivity.
 *
 * When CRON_SECRET is set, requests must send `Authorization: Bearer <CRON_SECRET>`
 * (the header Vercel Cron sends automatically).
 */

import { timingSafeEqual } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/lib/config';
import { createLogger } from '@/lib/logger';
import { getServiceClient } from '@/lib/supabase/client';
import { TABLE_NAMES } from '@/lib/supabase/constants';

function isAuthorized(authorization: string | undefined, secret: string): boolean {
  if (!authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createLogger();
  res.setHeader('X-Run-ID', logger.getRunId());
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (env.CRON_SECRET && !isAuthorized(req.headers.authorization, env.CRON_SECRET)) {
    logger.warn('Health check rejected: missing or invalid authorization');
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  try {
    const { error } = await getServiceClient()
      .from(TABLE_NAMES.RECIPES)
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    logger.info('Health check succeeded');
    return res.status(200).json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed: database unreachable', { error });
    return res.status(503).json({ error: 'Database unavailable', code: 'DB_UNAVAILABLE' });
  }
}
