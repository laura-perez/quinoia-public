/**
 * API Route: Update Menu (Swap Save)
 * PATCH /api/dashboard/menu/[id]
 *
 * Saves menu state after frontend swap (debounced)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { setZodErrorMapFR, formatZodErrors } from '@/schemas/zodErrorMap.fr';
import { updateMenuSwapSchema } from '@/schemas/dashboard.schema';
import { createLogger } from '@/lib/logger';
import { withAuth } from '@/middleware/withAuth';
import { menuResultsRepository } from '@/lib/supabase/repositories/menuResults';
import { checkUserQuota, isPremiumUser } from '@/lib/quotas/checker';

setZodErrorMapFR();

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const logger = createLogger();

  logger.info('Update menu request started', {
    method: req.method,
    userId,
    menuId: req.query.id
  });

  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== 'PATCH') {
    logger.warn('Invalid method', { method: req.method });
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const menuId = req.query.id as string;

  if (!menuId) {
    logger.error('Missing menu ID');
    return res.status(400).json({ error: 'ID du menu requis' });
  }

  // Parse body
  let raw: any;
  try {
    raw = req.body;
    if (typeof raw === 'string') raw = JSON.parse(raw);
  } catch (e) {
    logger.error('Invalid request body', { error: e });
    return res.status(400).json({ error: 'Corps de requête invalide' });
  }

  // Validate with Zod
  const parsed = updateMenuSwapSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('Update menu validation failed', {
      errors: formatZodErrors(parsed.error)
    });
    return res.status(400).json({ errors: formatZodErrors(parsed.error) });
  }

  const { activeRecipeIds, swapPoolRecipeIds, swapsCount } = parsed.data;

  try {
    // Verify menu exists and ownership
    const ownershipOk = await menuResultsRepository.verifyOwnership(menuId, userId);

    if (!ownershipOk) {
      logger.warn('Menu ownership verification failed', {
        menuId,
        userId
      });
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Ce menu ne t\'appartient pas'
      });
    }

    logger.debug('Menu ownership verified', { menuId, userId });

    // Check swap quota for free users
    const quotaResult = await checkUserQuota(userId, 'swap');
    const premium = isPremiumUser(quotaResult.quotaStatus);

    if (!premium) {
      // Free user: check swap limit (max 1)
      const swapQuotaLimit = quotaResult.quotaStatus.swapQuotaLimit || 1;

      if (swapsCount > swapQuotaLimit) {
        logger.warn('Swap quota exceeded for free user', {
          userId,
          swapsCount,
          limit: swapQuotaLimit
        });

        return res.status(403).json({
          error: 'Quota dépassé',
          message: `Maximum ${swapQuotaLimit} swap pour la version gratuite`,
          upgradeUrl: '/tarifs',
          quotaStatus: {
            swapsUsed: swapsCount,
            swapQuotaLimit,
            isPremium: false
          }
        });
      }
    }

    logger.debug('Swap quota check passed', {
      userId,
      swapsCount,
      isPremium: premium
    });

    // Update menu (simple persistence, no server-side recalculation)
    await menuResultsRepository.updateSwap(menuId, {
      activeRecipeIds,
      swapPoolRecipeIds,
      swapsCount
    });

    logger.info('Menu updated successfully', {
      menuId,
      userId,
      swapsCount
    });

    return res.status(200).json({
      success: true,
      message: 'Menu mis à jour'
    });

  } catch (error) {
    logger.error('Error updating menu', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      menuId,
      userId
    });

    return res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de sauvegarder les modifications'
    });
  }
}

export default withAuth(handler);
