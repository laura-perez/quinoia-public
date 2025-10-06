/**
 * API Route: Refetch Swap Pool
 * POST /api/dashboard/menu/[id]/refetch-pool
 *
 * Refetches swap pool when exhausted (Premium only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { setZodErrorMapFR, formatZodErrors } from '@/schemas/zodErrorMap.fr';
import { refetchPoolSchema } from '@/schemas/dashboard.schema';
import { createLogger } from '@/lib/logger';
import { withAuth } from '@/middleware/withAuth';
import { menuResultsRepository } from '@/lib/supabase/repositories/menuResults';
import { selectRecipes } from '@/lib/recipes/recipeSelector';
import { checkUserQuota, isPremiumUser } from '@/lib/quotas/checker';
import type { SelectionContext } from '@/types/recipes';
import { usersRepository } from '@/lib/supabase/repositories/users';

setZodErrorMapFR();

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const logger = createLogger();

  logger.info('Refetch pool request started', {
    method: req.method,
    userId,
    menuId: req.query.id
  });

  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== 'POST') {
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
  const parsed = refetchPoolSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('Refetch pool validation failed', {
      errors: formatZodErrors(parsed.error)
    });
    return res.status(400).json({ errors: formatZodErrors(parsed.error) });
  }

  const { excludeRecipeIds } = parsed.data;

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

    // Check if user is premium
    const quotaResult = await checkUserQuota(userId, 'menu');
    const premium = isPremiumUser(quotaResult.quotaStatus);

    if (!premium) {
      logger.warn('Non-premium user attempted to refetch pool', {
        userId,
        status: quotaResult.quotaStatus.status
      });

      return res.status(403).json({
        error: 'Fonctionnalité premium',
        message: 'Le rechargement du pool est réservé aux utilisateurs premium',
        upgradeUrl: '/tarifs'
      });
    }

    logger.debug('Premium user verified', { userId });

    // Get user and menu details
    const user = await usersRepository.findById(userId);
    const menuResult = await menuResultsRepository.findById(menuId);

    if (!user || !menuResult) {
      logger.error('User or menu not found', { userId, menuId });
      return res.status(404).json({ error: 'Données non trouvées' });
    }

    // Build selection context for new recipes
    // Note: Using default preferences - in production, fetch from user profile/last submission
    const selectionContext: SelectionContext = {
      userId,
      diet: 'omnivore', // Default - should come from user profile
      proteinPreferences: ['Poultry', 'Fish', 'Eggs'], // Default
      equipmentAvailable: ['Oven'], // Default
      cookingLevel: 'beginner', // Default
      numRecipes: 10, // Premium pool size
      numServings: menuResult.numServings,
      proteinFloorG: 20, // Default
      primaryGoal: 'balanced'// Default
    };

    logger.info('Starting recipe selection for pool refetch', {
      userId,
      excludeCount: excludeRecipeIds.length,
      poolSize: 10
    });

    // Select 10 new recipes (excluding current active + existing pool + user-provided excludes)
    // Note: In production, you'd fetch the actual excludeRecipeIds from the menu
    const selectionResult = await selectRecipes(selectionContext, {
      userEmail: user.email,
      submissionId: 'pool-refetch'
    });

    const newSwapPool = selectionResult.selectedRecipes;

    if (newSwapPool.length < 10) {
      logger.warn('Insufficient recipes for pool refetch', {
        requested: 10,
        received: newSwapPool.length
      });

      return res.status(500).json({
        error: 'Recettes insuffisantes',
        message: 'Impossible de recharger le pool avec assez de nouvelles recettes'
      });
    }

    logger.debug('New swap pool selected', {
      count: newSwapPool.length
    });

    // Update swap pool in database
    await menuResultsRepository.updateSwapPool(
      menuId,
      newSwapPool.map(r => r.id)
    );

    logger.info('Swap pool refetched successfully', {
      menuId,
      userId,
      newPoolSize: newSwapPool.length
    });

    // Return full recipe objects for frontend
    return res.status(200).json({
      success: true,
      newSwapPool,
      message: 'Pool rechargé avec succès'
    });

  } catch (error) {
    logger.error('Error refetching pool', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      menuId,
      userId
    });

    return res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de recharger le pool'
    });
  }
}

export default withAuth(handler);
