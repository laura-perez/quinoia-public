/**
 * API Route: Generate Menu
 * POST /api/dashboard/generate-menu
 *
 * Generates a new personalized menu with swap pool
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createLogger } from '@/lib/logger';
import { withAuthAndQuota } from '@/middleware/withQuotaCheck';
import type { SessionUser } from '@/lib/auth/session';
import { usersRepository } from '@/lib/supabase/repositories/users';
import { menuResultsRepository } from '@/lib/supabase/repositories/menuResults';
import { selectRecipes } from '@/lib/recipes/recipeSelector';
import { getCanonicalIngredientsByIds } from '@/lib/supabase/repositories/ingredients';
import { checkUserQuota } from '@/lib/quotas/checker';
import { USER_STATUS } from '@/lib/supabase/types/user.types';
import { getServiceClient } from '@/lib/supabase/client';
import { randomBytes } from 'crypto';
import type { SelectionContext } from '@/types/recipes';
import { FREE_POOL_SIZE, PREMIUM_POOL_SIZE } from '@/lib/constants/recipeSelection';

// Generate a secure, URL-safe shareId
function generateShareId(): string {
  return randomBytes(12)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string, sessionUser: SessionUser) {
  const logger = createLogger();
  const supabase = getServiceClient();

  logger.info('Generate menu request started', {
    method: req.method,
    userId
  });

  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== 'POST') {
    logger.warn('Invalid method', { method: req.method });
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // User already provided by withAuth middleware
    const user = sessionUser;

    // Check if user has completed onboarding (has a submission)
    const { data: existingSubmission } = await supabase
      .from('submission')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .single();

    if (!existingSubmission) {
      logger.warn('User has no submission - onboarding required', { userId });
      return res.status(403).json({
        error: 'Onboarding requis',
        message: 'Configure tes préférences alimentaires pour générer ton premier menu',
        redirectUrl: '/onboarding',
        requiresOnboarding: true
      });
    }

    logger.info('Using existing submission', {
      submissionId: existingSubmission.id,
      diet: existingSubmission.diet
    });

    // Check quota status (already checked by withAuthAndQuota, but re-check for logging)
    const quotaResult = await checkUserQuota(userId, user, 'menu');
    const premium = user.status === USER_STATUS.PAID_ACTIVE;

    logger.info('User quota checked', {
      userId,
      isPremium: premium,
      canGenerate: quotaResult.canGenerate
    });

    // Determine pool size based on user tier
    const poolSize = premium ? PREMIUM_POOL_SIZE : FREE_POOL_SIZE;

    // Build selection context from user's submission (onboarding preferences)
    const selectionContext: SelectionContext = {
      userId,
      diet: existingSubmission.diet,
      proteinPreferences: existingSubmission.proteinPreferences || [],
      equipmentAvailable: existingSubmission.equipmentAvailable || [],
      cookingLevel: existingSubmission.cookingLevel,
      numRecipes: existingSubmission.numRecipes + poolSize, // From submission + pool
      numServings: existingSubmission.numServings, // From submission
      proteinFloorG: existingSubmission.proteinFloorG || 0,
      primaryGoal: existingSubmission.primaryGoal || 'balanced',
    };

    logger.info('Starting recipe selection', {
      userId,
      totalRecipesToSelect: existingSubmission.numRecipes + poolSize,
      poolSize,
      isPremium: premium
    });

    // Select recipes (active + swap pool)
    const selectionResult = await selectRecipes(selectionContext);

    const selectedRecipes = selectionResult.selectedRecipes;

    if (selectedRecipes.length < existingSubmission.numRecipes + poolSize) {
      logger.error('Insufficient recipes selected', {
        requested: existingSubmission.numRecipes + poolSize,
        received: selectedRecipes.length
      });

      return res.status(500).json({
        error: 'Recettes insuffisantes',
        message: 'Impossible de générer un menu complet avec tes préférences'
      });
    }

    // Split into active recipes and swap pool
    const activeRecipes = selectedRecipes.slice(0, existingSubmission.numRecipes);
    const swapPool = selectedRecipes.slice(existingSubmission.numRecipes, existingSubmission.numRecipes + poolSize);

    logger.info('Recipes split successfully', {
      activeCount: activeRecipes.length,
      poolCount: swapPool.length
    });

    // Extract all unique ingredient canonical IDs
    const ingredientIds = new Set<string>();
    selectedRecipes.forEach(recipe => {
      recipe.ingredients?.forEach((ing: any) => {
        if (ing.canonicalId) {
          ingredientIds.add(ing.canonicalId);
        }
      });
    });

    // Fetch ingredients catalog
    const ingredientsMap = await getCanonicalIngredientsByIds(Array.from(ingredientIds));
    const ingredientsCatalog = Object.fromEntries(ingredientsMap);

    logger.info('Ingredients catalog fetched', {
      count: ingredientIds.size
    });

    // Generate share ID
    const shareId = generateShareId();

    // Create menu result in database via repository (unique index on userId+weekStart enforces one-per-week)
    let menuResult;
    try {
      menuResult = await menuResultsRepository.create({
        submissionId: existingSubmission.id,
        userId,
        resultBundle: {
          recipes: selectedRecipes,
          nutritionSummary: selectionResult.nutritionSummary,
        },
        numRecipes: existingSubmission.numRecipes,
        numServings: existingSubmission.numServings,
        shareId,
        activeRecipeIds: activeRecipes.map(r => r.id),
        swapPoolRecipeIds: swapPool.map(r => r.id),
      });

      logger.info('Menu result created', {
        menuResultId: menuResult.id,
        shareId,
      });
    } catch (createErr: any) {
      // Detect unique constraint violation (attempt to create second menu in the same week)
      const msg = createErr?.message || String(createErr);
      logger.warn('Menu result creation failed', { error: msg, userId });

      if (msg.includes('duplicate key value') || msg.includes('idx_menu_result_user_week')) {
        return res.status(403).json({ error: 'Quota dépassé', message: 'Tu as déjà généré un menu cette semaine' });
      }

      return res.status(500).json({ error: 'Erreur création menu', message: msg });
    }

    // Update user's lastMenuResultId and lastSubmissionAt
    await usersRepository.updateLastSubmission(userId, menuResult.id);

    logger.info('User last submission updated', {
      userId,
      menuResultId: menuResult.id
    });

    // Get updated quotas
    const updatedQuota = await checkUserQuota(userId, user, 'menu');

    // Build response
    const response = {
      success: true,
      menu: {
        id: menuResult.id,
        activeRecipes,
        swapPool,
        swapsCount: 0,
        numServings: existingSubmission.numServings,
      },
      ingredientsCatalog,
      quotas: {
        menusGeneratedThisWindow: updatedQuota.quotaStatus.menusGeneratedThisWindow,
        menuQuotaLimit: updatedQuota.quotaStatus.menuQuotaLimit,
        swapQuotaLimit: updatedQuota.quotaStatus.swapQuotaLimit,
        nextQuotaReset: updatedQuota.nextReset?.toISOString() || null,
      },
    };

    logger.info('Menu generated successfully', {
      userId,
      menuResultId: menuResult.id,
      numRecipes: existingSubmission.numRecipes,
      poolSize
    });

    return res.status(200).json(response);

  } catch (error) {
    logger.error('Error generating menu', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId
    });

    return res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de générer le menu. Réessaie dans quelques instants.'
    });
  }
}

// Apply both auth and quota check middleware
export default withAuthAndQuota('menu')(handler);
