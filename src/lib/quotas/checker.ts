/**
 * Quota checking utilities
 * Uses userQuotaStatus view for real-time quota calculations
 */

import { getServiceClient } from '../supabase/client';
import { createLogger } from '../logger';

const logger = createLogger();

export interface QuotaStatus {
  userId: string;
  email: string;
  status: 'trial_available' | 'trial_used' | 'paid_active' | 'paid_expired';
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
 */
export async function checkUserQuota(
  userId: string,
  type: 'menu' | 'swap'
): Promise<QuotaCheckResult> {
  logger.debug('Checking user quota', { userId, type });

  const client = getServiceClient();

  const { data, error } = await client
    .from('userQuotaStatus')
    .select('*')
    .eq('userId', userId)
    .single();

  if (error || !data) {
    logger.error('Failed to fetch quota status', {
      error,
      userId
    });
    throw new Error(error?.message || 'Failed to fetch quota status');
  }

  const quotaStatus: QuotaStatus = {
    ...data,
    lastMenuGeneratedAt: data.lastMenuGeneratedAt ? new Date(data.lastMenuGeneratedAt) : null,
    nextQuotaReset: data.nextQuotaReset ? new Date(data.nextQuotaReset) : null,
  };

  let canGenerate: boolean;
  let remaining: number | null;

  if (type === 'menu') {
    // Menu quota check
    canGenerate = quotaStatus.canGenerateMenu;

    // Calculate remaining menus (null = unlimited)
    if (quotaStatus.menuQuotaLimit === null) {
      remaining = null; // Premium = unlimited
    } else {
      remaining = Math.max(0, quotaStatus.menuQuotaLimit - quotaStatus.menusGeneratedThisWindow);
    }
  } else {
    // Swap quota check
    if (quotaStatus.swapQuotaLimit === null) {
      // Premium = unlimited swaps
      canGenerate = true;
      remaining = null;
    } else {
      // Free = 1 swap max
      canGenerate = quotaStatus.swapsUsedThisMenu < quotaStatus.swapQuotaLimit;
      remaining = Math.max(0, quotaStatus.swapQuotaLimit - quotaStatus.swapsUsedThisMenu);
    }
  }

  // Calculate days until reset
  let daysUntilReset: number | null = null;
  if (quotaStatus.nextQuotaReset) {
    const msUntilReset = quotaStatus.nextQuotaReset.getTime() - Date.now();
    daysUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60 * 24));
  }

  logger.info('Quota check result', {
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
  return quotaStatus.status === 'paid_active';
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
