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
import { getRecipeImageUrls } from '@/lib/supabase/storage';
import { PREMIUM_POOL_SIZE } from '@/lib/constants/recipeSelection';

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

    // Combine user-provided excludes with current active recipes AND removed recipes to avoid duplicates
    // Note: excludeRecipeIds already contains activeRecipes + swapPool + removedRecipeIds from frontend
    // We add database values to handle race conditions where frontend hasn't saved yet
    const allExcludeIdsSet = new Set([
      ...excludeRecipeIds,
      ...menuResult.activeRecipeIds,
      ...(menuResult.removedRecipeIds || [])
    ]);
    const allExcludeIds = Array.from(allExcludeIdsSet);

    // Build selection context using user's submission preferences
    const selectionContext: SelectionContext = {
      userId,
      diet: submission.diet,
      proteinPreferences: submission.proteinPreferences || [],
      equipmentAvailable: submission.equipmentAvailable || [],
      cookingLevel: submission.cookingLevel,
      numRecipes: PREMIUM_POOL_SIZE,
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
    let selectionResult = await selectRecipes(selectionContext);

    let newSwapPool = selectionResult.selectedRecipes;

    // Fallback: If insufficient recipes, try with diet-only (remove protein/equipment constraints)
    if (newSwapPool.length < PREMIUM_POOL_SIZE) {
      logger.warn('Insufficient recipes with full preferences, trying diet-only fallback', {
        requested: PREMIUM_POOL_SIZE,
        received: newSwapPool.length
      });

      const fallbackContext: SelectionContext = {
        userId,
        diet: submission.diet,
        proteinPreferences: [], // Remove protein constraints
        equipmentAvailable: [], // Remove equipment constraints
        cookingLevel: submission.cookingLevel,
        numRecipes: PREMIUM_POOL_SIZE,
        numServings: menuResult.numServings,
        proteinFloorG: 0, // Remove protein floor
        primaryGoal: submission.primaryGoal || 'balanced',
        excludeRecipeIds: allExcludeIds // Keep exclusions in fallback
      };

      selectionResult = await selectRecipes(fallbackContext);

      newSwapPool = selectionResult.selectedRecipes;

      logger.info('Diet-only fallback completed', {
        recipesFound: newSwapPool.length
      });
    }

    // Track if we did a cycle reset
    let didCycleReset = false;

    // If no recipes found even with fallback, reset the cycle by clearing removedRecipeIds
    if (newSwapPool.length === 0) {
      logger.warn('Catalogue exhausted - resetting cycle by clearing removedRecipeIds', {
        userId,
        diet: submission.diet,
        removedCount: menuResult.removedRecipeIds?.length || 0
      });

      // Clear removed recipes to allow a fresh cycle
      // IMPORTANT: Only exclude active recipes and current swap pool, NOT removed recipes
      const resetExcludeIds = new Set([
        ...menuResult.activeRecipeIds,
        ...menuResult.swapPoolRecipeIds
      ]);

      const resetContext: SelectionContext = {
        userId,
        diet: submission.diet,
        proteinPreferences: [], // Diet-only for maximum pool
        equipmentAvailable: [],
        cookingLevel: submission.cookingLevel,
        numRecipes: PREMIUM_POOL_SIZE,
        numServings: menuResult.numServings,
        proteinFloorG: 0,
        primaryGoal: submission.primaryGoal || 'balanced',
        excludeRecipeIds: Array.from(resetExcludeIds) // Only exclude active + pool (NOT removed)
      };

      selectionResult = await selectRecipes(resetContext);

      newSwapPool = selectionResult.selectedRecipes;

      logger.info('Cycle reset completed', {
        recipesFound: newSwapPool.length
      });

      // If STILL no recipes (should never happen), return error
      if (newSwapPool.length === 0) {
        logger.error('No recipes available even after cycle reset', {
          userId,
          diet: submission.diet
        });

        return res.status(500).json({
          error: 'Catalogue épuisé',
          message: 'Aucune nouvelle recette disponible pour le moment. Toutes les recettes compatibles ont déjà été utilisées.',
          catalogueExhausted: true
        });
      }

      didCycleReset = true;
    }

    logger.debug('New swap pool selected', {
      count: newSwapPool.length,
      isPartial: newSwapPool.length < PREMIUM_POOL_SIZE
    });

    // Transform recipe images to include full URLs (match dashboard/status.ts behavior)
    const recipeImageUrls = new Map<string, string | null>();
    const pictureFiles = newSwapPool
      .map((recipe: any) => recipe.picture_file as string | undefined)
      .filter((file): file is string => Boolean(file));

    if (pictureFiles.length > 0) {
      try {
        const urlMap = await getRecipeImageUrls(pictureFiles);
        urlMap.forEach((url, filename) => {
          recipeImageUrls.set(filename, url);
        });

        logger.debug('Recipe images loaded for refetched pool', {
          imageCount: recipeImageUrls.size
        });
      } catch (imageError) {
        logger.warn('Failed to load recipe images for refetched pool', {
          error: imageError
        });
      }
    }

    // Add imageUrl to each recipe
    const recipesWithImages = newSwapPool.map((recipe: any) => ({
      ...recipe,
      imageUrl: recipe.picture_file ? recipeImageUrls.get(recipe.picture_file) : null
    }));

    // Update swap pool in database
    if (didCycleReset) {
      // Cycle was reset - clear removedRecipeIds
      await menuResultsRepository.updateSwap(menuId, {
        activeRecipeIds: menuResult.activeRecipeIds,
        swapPoolRecipeIds: recipesWithImages.map(r => r.id),
        swapsCount: menuResult.swapsCount || 0,
        removedRecipeIds: [] // Reset removed recipes after cycle completion
      });

      logger.info('Cycle reset: removedRecipeIds cleared', {
        menuId,
        previousRemovedCount: menuResult.removedRecipeIds?.length || 0
      });
    } else {
      // Normal update - just update swap pool, keep removedRecipeIds unchanged
      await menuResultsRepository.updateSwapPool(
        menuId,
        recipesWithImages.map(r => r.id)
      );
    }

    logger.info('Swap pool refetched successfully', {
      menuId,
      userId,
      newPoolSize: recipesWithImages.length,
      isPartial: recipesWithImages.length < PREMIUM_POOL_SIZE
    });

    // Return full recipe objects for frontend
    return res.status(200).json({
      success: true,
      newSwapPool: recipesWithImages,
      message: didCycleReset
        ? `Nouveau cycle démarré ! ${recipesWithImages.length} recettes disponibles`
        : recipesWithImages.length < PREMIUM_POOL_SIZE
        ? `Pool rechargé avec ${recipesWithImages.length} recettes (catalogue limité)`
        : 'Pool rechargé avec succès',
      partial: recipesWithImages.length < PREMIUM_POOL_SIZE,
      catalogueNearExhaustion: recipesWithImages.length < 5,
      cycleReset: didCycleReset // Flag to inform frontend that cycle was reset
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
