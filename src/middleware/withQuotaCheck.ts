/**
 * Quota checking middleware for API routes
 * Verifies user has quota available before allowing action
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { checkUserQuota, getQuotaMessage } from '@/lib/quotas/checker';
import { USER_STATUS } from '@/lib/supabase/types/user.types';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

export type QuotaType = 'menu' | 'swap';

export type QuotaAuthenticatedHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => Promise<void> | void;

/**
 * Higher-order function that wraps API handlers with quota checking
 * Must be used AFTER withAuth middleware (requires userId)
 */
export function withQuotaCheck(quotaType: QuotaType) {
  return function (handler: QuotaAuthenticatedHandler) {
    return async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
      logger.debug('Checking quota', {
        userId,
        quotaType,
        path: req.url
      });

      try {
        const quotaResult = await checkUserQuota(userId, quotaType);

        if (!quotaResult.canGenerate) {
          const message = getQuotaMessage(quotaResult, quotaType);

          logger.warn('Quota exceeded', {
            userId,
            quotaType,
            remaining: quotaResult.remaining,
            nextReset: quotaResult.nextReset,
            daysUntilReset: quotaResult.daysUntilReset
          });

          return res.status(403).json({
            error: 'Quota dépassé',
            message,
            upgradeUrl: '/tarifs',
            quotaStatus: {
              canGenerate: false,
              remaining: quotaResult.remaining,
              nextReset: quotaResult.nextReset,
              daysUntilReset: quotaResult.daysUntilReset,
              isPremium: quotaResult.quotaStatus.status === USER_STATUS.PAID_ACTIVE
            }
          });
        }

        logger.debug('Quota check passed', {
          userId,
          quotaType,
          remaining: quotaResult.remaining
        });

        // Quota OK, proceed to handler
        return handler(req, res, userId);
      } catch (error) {
        logger.error('Quota check error', {
          error: error instanceof Error ? error.message : String(error),
          userId,
          quotaType
        });

        return res.status(500).json({
          error: 'Erreur serveur',
          message: 'Impossible de vérifier le quota'
        });
      }
    };
  };
}

/**
 * Compose withAuth and withQuotaCheck for convenience
 * Usage: export default withAuthAndQuota('menu')(handler)
 */
import { withAuth } from './withAuth';

export function withAuthAndQuota(quotaType: QuotaType) {
  return function (handler: QuotaAuthenticatedHandler) {
    return withAuth(withQuotaCheck(quotaType)(handler));
  };
}
