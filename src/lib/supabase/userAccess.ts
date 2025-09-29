import type { User, UserStatus } from './types/user.types';
import { createLogger } from '../logger';

/**
 * Result of access check
 */
export interface AccessCheckResult {
  canAccess: boolean;
  reason?: string;
  nextAction?: 'redirect_to_payment' | 'allow_generation';
}

/**
 * Pricing information for user
 */
export interface UserPricingInfo {
  canUsePromo: boolean;
  packPrice: number;
  subscriptionMonthlyPrice: number;
  subscriptionAnnualPrice: number;
}

/**
 * Check if user can generate a new menu
 */
export function checkUserAccess(user: User): AccessCheckResult {
  const logger = createLogger();

  logger.debug('Checking user access', {
    userId: user.id,
    status: user.status,
    hasUsedTrial: user.hasUsedTrial,
    paidUntil: user.paidUntil
  });

  switch (user.status) {
    case 'trial_available':
      logger.info('User can use trial', { userId: user.id });
      return {
        canAccess: true,
        nextAction: 'allow_generation'
      };

    case 'trial_used':
      logger.info('User trial expired, needs payment', { userId: user.id });
      return {
        canAccess: false,
        reason: 'Essai gratuit utilisé. Abonnez-vous pour générer de nouveaux menus.',
        nextAction: 'redirect_to_payment'
      };

    case 'paid_active':
      if (!user.paidUntil) {
        logger.warn('Paid user without paidUntil date', { userId: user.id });
        return {
          canAccess: false,
          reason: 'Erreur de configuration de votre abonnement.',
          nextAction: 'redirect_to_payment'
        };
      }

      const paidUntilDate = new Date(user.paidUntil);
      const now = new Date();

      if (paidUntilDate > now) {
        logger.info('Paid user has active access', {
          userId: user.id,
          paidUntil: user.paidUntil
        });
        return {
          canAccess: true,
          nextAction: 'allow_generation'
        };
      } else {
        logger.info('Paid user access expired', {
          userId: user.id,
          paidUntil: user.paidUntil
        });
        return {
          canAccess: false,
          reason: 'Votre abonnement a expiré. Renouvelez pour continuer.',
          nextAction: 'redirect_to_payment'
        };
      }

    case 'paid_expired':
      logger.info('User subscription expired', { userId: user.id });
      return {
        canAccess: false,
        reason: 'Votre abonnement a expiré. Renouvelez pour continuer.',
        nextAction: 'redirect_to_payment'
      };

    default:
      logger.error('Unknown user status', {
        userId: user.id,
        status: user.status
      });
      return {
        canAccess: false,
        reason: 'Statut utilisateur inconnu.',
        nextAction: 'redirect_to_payment'
      };
  }
}

/**
 * Get pricing information for user based on their history
 */
export function getUserPricingInfo(user: User): UserPricingInfo {
  const canUsePromo = !user.hasUsedPromo;

  return {
    canUsePromo,
    packPrice: canUsePromo ? 9.90 : 19.90,
    subscriptionMonthlyPrice: 9.90,
    subscriptionAnnualPrice: 95.00
  };
}

/**
 * Check if user status should be updated (e.g., paid_active -> paid_expired)
 */
export function shouldUpdateUserStatus(user: User): { needsUpdate: boolean; newStatus?: UserStatus } {
  if (user.status === 'paid_active' && user.paidUntil) {
    const paidUntilDate = new Date(user.paidUntil);
    const now = new Date();

    if (paidUntilDate <= now) {
      return { needsUpdate: true, newStatus: 'paid_expired' };
    }
  }

  return { needsUpdate: false };
}