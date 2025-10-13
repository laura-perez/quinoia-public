/**
 * Quota checking utilities
 * Uses userQuotaStatus view for real-time quota calculations
 */

import { getServiceClient } from '../supabase/client';
import { USER_STATUS, type UserStatus } from '../supabase/types/user.types';
import type { SessionUser } from '../auth/session';
import { createLogger } from '../logger';

const logger = createLogger();

export interface QuotaStatus {
  userId: string;
  email?: string;
  status: UserStatus | string;
  lastMenuGeneratedAt: Date | null;
  menusGeneratedThisWindow: number;
  swapsUsedThisMenu: number;
  menuQuotaLimit: number | null;
  swapQuotaLimit: number | null;
  nextQuotaReset: Date | null;
  canGenerateMenu: boolean;
}

export interface QuotaCheckResult {
  canGenerate: boolean;
  remaining: number | null;
  nextReset: Date | null;
  daysUntilReset: number | null;
  quotaStatus: QuotaStatus;
}

/**
 * Check if user can generate a new menu or perform a swap
 * This implementation derives quota state from the menuResult table using a 7-day window.
 *
 * @param userId - User ID
 * @param user - SessionUser object (to avoid redundant DB fetch)
 * @param type - 'menu' or 'swap'
 */
export async function checkUserQuota(
  userId: string,
  user: SessionUser,
  type: 'menu' | 'swap'
): Promise<QuotaCheckResult> {
  logger.debug('Checking user quota (derived from menuResult)', { userId, type });

  const quotaStatus: QuotaStatus = {
    userId,
    email: user.email,
    status: user.status || USER_STATUS.TRIAL_AVAILABLE,
    lastMenuGeneratedAt: null,
    menusGeneratedThisWindow: 0,
    swapsUsedThisMenu: 0,
    menuQuotaLimit: null,
    swapQuotaLimit: null,
    nextQuotaReset: null,
    canGenerateMenu: false,
  };

  // Premium users -> unlimited (should not reach here, but keep as safety check)
  if (user.status === USER_STATUS.PAID_ACTIVE) {
    logger.info('User is premium - unlimited quotas', { userId });
    // Use null to indicate unlimited
    return {
      canGenerate: true,
      remaining: null,
      nextReset: null,
      daysUntilReset: null,
      quotaStatus: {
        ...quotaStatus,
        menuQuotaLimit: null,
        swapQuotaLimit: null,
        canGenerateMenu: true,
      }
    };
  }

  const client = getServiceClient();

  // Non-premium: derive quota from menuResult within 7-day window
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Helper: fetch the most recent menuResult within the window
  async function fetchLatestMenuResult(uid: string, sinceIso: string) {
    try {
      const { data, error } = await client
        .from('menuResult')
        .select('id, createdAt, hasSwappedInWindow')
        .eq('userId', uid)
        .gte('createdAt', sinceIso)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Failed to fetch menuResult for quota derivation', { error, userId: uid });
        throw new Error(error.message || 'Failed to fetch menuResult');
      }

      return data ?? null;
    } catch (err) {
      logger.error('Exception fetching menuResult for quota derivation', { error: err, userId: uid });
      throw err;
    }
  }

  const mr = await fetchLatestMenuResult(userId, sevenDaysAgoIso);

  if (!mr) {
    // No menu in window: user can generate, cannot swap
    quotaStatus.menusGeneratedThisWindow = 0;
    quotaStatus.menuQuotaLimit = 1;
    quotaStatus.swapsUsedThisMenu = 0;
    quotaStatus.swapQuotaLimit = 1;
    quotaStatus.nextQuotaReset = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    quotaStatus.canGenerateMenu = true;

    const canGenerate = type === 'menu';
    const remaining = type === 'menu' ? 1 : 0;
    const daysUntilReset = 7;

    logger.info('Quota derived: no menuResult in window', { userId, canGenerate });

    return {
      canGenerate,
      remaining,
      nextReset: quotaStatus.nextQuotaReset,
      daysUntilReset,
      quotaStatus,
    };
  }

  // There is a menuResult in the 7-day window
  const createdAt = new Date(mr.createdAt);
  const nextReset = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  quotaStatus.lastMenuGeneratedAt = createdAt;
  quotaStatus.menusGeneratedThisWindow = 1;
  quotaStatus.menuQuotaLimit = 1;
  quotaStatus.nextQuotaReset = nextReset;
  quotaStatus.canGenerateMenu = false;

  // Simplified swap quota using hasSwappedInWindow boolean
  const hasSwapped = mr.hasSwappedInWindow ?? false;
  quotaStatus.swapsUsedThisMenu = hasSwapped ? 1 : 0;
  quotaStatus.swapQuotaLimit = 1;

  let canGenerate: boolean;
  let remaining: number | null;

  if (type === 'menu') {
    canGenerate = false;
    remaining = 0;
  } else {
    // Swap quota: check hasSwappedInWindow boolean
    canGenerate = !hasSwapped;
    remaining = hasSwapped ? 0 : 1;
  }

  const msUntilReset = quotaStatus.nextQuotaReset.getTime() - Date.now();
  const daysUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60 * 24));

  logger.info('Quota derived from menuResult', {
    userId,
    type,
    canGenerate,
    remaining,
    daysUntilReset,
    status: quotaStatus.status
  });

  return {
    canGenerate,
    remaining,
    nextReset: quotaStatus.nextQuotaReset,
    daysUntilReset,
    quotaStatus,
  };
}

/**
 * Check if user is premium (has unlimited quotas)
 */
export function isPremiumUser(quotaStatus: QuotaStatus): boolean {
  return quotaStatus.status === USER_STATUS.PAID_ACTIVE;
}

/**
 * Get human-readable quota message
 */
export function getQuotaMessage(result: QuotaCheckResult, type: 'menu' | 'swap'): string {
  if (result.canGenerate) {
    if (result.remaining === null) {
      return 'Illimité';
    }
    return `${result.remaining} ${type === 'menu' ? 'menu(s)' : 'swap(s)'} restant(s)`;
  }

  if (result.daysUntilReset !== null) {
    const days = result.daysUntilReset;
    if (days === 0) {
      return "Disponible aujourd'hui";
    } else if (days === 1) {
      return 'Disponible demain';
    } else {
      return `Disponible dans ${days} jours`;
    }
  }

  return 'Quota dépassé';
}
