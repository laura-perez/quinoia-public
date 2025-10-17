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
import type { SessionUser } from '@/lib/auth/session';
import { menuResultsRepository } from '@/lib/supabase/repositories/menuResults';
import { usersRepository } from '@/lib/supabase/repositories/users';
import { selectRecipes } from '@/lib/recipes/recipeSelector';
import { checkUserQuota, isPremiumUser } from '@/lib/quotas/checker';
import type { SelectionContext } from '@/types/recipes';
import { USER_STATUS } from '@/lib/supabase/types/user.types';

setZodErrorMapFR();

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string, sessionUser: SessionUser) {
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
  const quotaResult = await checkUserQuota(userId, sessionUser, 'menu');
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

    // Get user, menu details, and user's submission
    const user = await usersRepository.findById(userId);
    const menuResult = await menuResultsRepository.findById(menuId);

    if (!user || !menuResult) {
      logger.error('User or menu not found', { userId, menuId });
      return res.status(404).json({ error: 'Données non trouvées' });
    }

    // Get user's submission to use their preferences
    const { getServiceClient } = await import('@/lib/supabase/client');
    const supabase = getServiceClient();

    const { data: submission } = await supabase
      .from('submission')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .single();

    if (!submission) {
      logger.error('No submission found for user', { userId });
      return res.status(400).json({
        error: 'Aucune préférence trouvée',
        message: 'Impossible de recharger le pool sans préférences utilisateur'
      });
    }

    logger.debug('Using user submission for context', {
      submissionId: submission.id,
      diet: submission.diet,
      proteinPreferences: submission.proteinPreferences
    });

    // Combine user-provided excludes with current active recipes to avoid duplicates
    const allExcludeIds = [
      ...excludeRecipeIds,
      ...menuResult.activeRecipeIds
    ];

    // Build selection context using user's submission preferences
    const selectionContext: SelectionContext = {
      userId,
      diet: submission.diet,
      proteinPreferences: submission.proteinPreferences || [],
      equipmentAvailable: submission.equipmentAvailable || [],
      cookingLevel: submission.cookingLevel,
      numRecipes: 10, // Premium pool size
      numServings: menuResult.numServings,
      proteinFloorG: submission.proteinFloorG || 0,
      primaryGoal: submission.primaryGoal || 'balanced',
      excludeRecipeIds: allExcludeIds // Exclude active recipes + user-provided excludes
    };

    logger.info('Starting recipe selection for pool refetch', {
      userId,
      excludeCount: allExcludeIds.length,
      activeRecipesCount: menuResult.activeRecipeIds.length,
      userExcludesCount: excludeRecipeIds.length,
      poolSize: 10,
      diet: submission.diet
    });

    // Try to select 10 new recipes with full user preferences
    let selectionResult = await selectRecipes(selectionContext, {
      userEmail: user.email,
      submissionId: submission.id
    });

    let newSwapPool = selectionResult.selectedRecipes;

    // Fallback: If insufficient recipes, try with diet-only (remove protein/equipment constraints)
    if (newSwapPool.length < 10) {
      logger.warn('Insufficient recipes with full preferences, trying diet-only fallback', {
        requested: 10,
        received: newSwapPool.length
      });

      const fallbackContext: SelectionContext = {
        userId,
        diet: submission.diet,
        proteinPreferences: [], // Remove protein constraints
        equipmentAvailable: [], // Remove equipment constraints
        cookingLevel: submission.cookingLevel,
        numRecipes: 10,
        numServings: menuResult.numServings,
        proteinFloorG: 0, // Remove protein floor
        primaryGoal: submission.primaryGoal || 'balanced',
        excludeRecipeIds: allExcludeIds // Keep exclusions in fallback
      };

      selectionResult = await selectRecipes(fallbackContext, {
        userEmail: user.email,
        submissionId: submission.id
      });

      newSwapPool = selectionResult.selectedRecipes;

      if (newSwapPool.length < 10) {
        logger.error('Insufficient recipes even with diet-only fallback', {
          requested: 10,
          received: newSwapPool.length
        });

        return res.status(500).json({
          error: 'Recettes insuffisantes',
          message: 'Impossible de trouver assez de nouvelles recettes compatibles avec ton régime alimentaire'
        });
      }

      logger.info('Diet-only fallback successful', {
        recipesFound: newSwapPool.length
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
