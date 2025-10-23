/**
 * API Route: Dashboard Status
 * GET /api/dashboard/status
 *
 * Returns user info, quotas, current menu, and ingredients catalog
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createLogger } from '@/lib/logger';
import { withAuth } from '@/middleware/withAuth';
import type { SessionUser } from '@/lib/auth/session';
import { menuResultsRepository } from '@/lib/supabase/repositories/menuResults';
import { checkUserQuota } from '@/lib/quotas/checker';
import { getRecipesByIds } from '@/lib/supabase/repositories/recipes';
import { getCanonicalIngredientsByIds } from '@/lib/supabase/repositories/ingredients';
import { USER_STATUS } from '@/lib/supabase/types/user.types';
import { getServiceClient } from '@/lib/supabase/client';

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string, sessionUser: SessionUser) {
  const logger = createLogger();

  logger.info('Dashboard status request started', {
    method: req.method,
    userId
  });

  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== 'GET') {
    logger.warn('Invalid method', { method: req.method });
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // User already provided by withAuth middleware (sessionUser)
    const user = sessionUser;

    logger.debug('User from session', {
      userId: user.id,
      status: user.status
    });

    // Fetch user submission (for preferences editing)
    const { data: submission } = await getServiceClient()
      .from('submission')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    // Fetch quotas (skip for premium users)
    const isPremium = user.status === USER_STATUS.PAID_ACTIVE;
    let menuQuota, swapQuota;

    if (isPremium) {
      // Premium users have unlimited quotas - skip DB queries
      logger.debug('Premium user - unlimited quotas', { userId });
      menuQuota = {
        canGenerate: true,
        remaining: null,
        nextReset: null,
        daysUntilReset: null,
        quotaStatus: {
          userId: user.id,
          email: user.email,
          status: user.status,
          lastMenuGeneratedAt: null,
          menusGeneratedThisWindow: 0,
          swapsUsedThisMenu: 0,
          menuQuotaLimit: null,
          swapQuotaLimit: null,
          nextQuotaReset: null,
          canGenerateMenu: true,
        }
      };
      swapQuota = { ...menuQuota };
    } else {
      // Free users - check quotas
      menuQuota = await checkUserQuota(userId, user, 'menu');
      swapQuota = await checkUserQuota(userId, user, 'swap');

      logger.debug('Quotas fetched', {
        userId,
        canGenerateMenu: menuQuota.canGenerate,
        swapsRemaining: swapQuota.remaining
      });
    }

    // Fetch current menu if exists
    let currentMenu = null;
    let ingredientsCatalog: Record<string, any> = {};

    if (user.lastMenuResultId) {
      const menuResult = await menuResultsRepository.findById(user.lastMenuResultId);

      if (menuResult) {
        logger.debug('Menu result fetched', {
          menuResultId: menuResult.id,
          numRecipes: menuResult.numRecipes
        });

        // Hydrate full recipe objects from IDs
        const allRecipeIds = [
          ...menuResult.activeRecipeIds,
          ...menuResult.swapPoolRecipeIds
        ];

        const recipes = await getRecipesByIds(allRecipeIds);

        logger.debug('Recipes hydrated', {
          requestedCount: allRecipeIds.length,
          fetchedCount: recipes.length
        });

        // Map recipes by ID for easy lookup
        const recipeMap = new Map(recipes.map(r => [r.id, r]));

        // Build active recipes and swap pool arrays
        const activeRecipes = menuResult.activeRecipeIds
          .map(id => recipeMap.get(id))
          .filter(Boolean);

        // Filter swap pool to remove any recipes already in active recipes (defensive)
        const activeIds = new Set(menuResult.activeRecipeIds);
        const swapPool = menuResult.swapPoolRecipeIds
          .filter(id => !activeIds.has(id)) // Remove duplicates
          .map(id => recipeMap.get(id))
          .filter(Boolean);

        if (swapPool.length < menuResult.swapPoolRecipeIds.length) {
          logger.warn('Removed duplicate recipes from swap pool', {
            originalPoolSize: menuResult.swapPoolRecipeIds.length,
            cleanedPoolSize: swapPool.length,
            duplicatesRemoved: menuResult.swapPoolRecipeIds.length - swapPool.length
          });
        }

        // Extract all unique ingredient canonical IDs
        const ingredientIds = new Set<string>();
        recipes.forEach(recipe => {
          recipe.ingredients?.forEach((ing: any) => {
            if (ing.canonicalId) {
              ingredientIds.add(ing.canonicalId);
            }
          });
        });

        // Fetch ingredients catalog
        const ingredientsMap = await getCanonicalIngredientsByIds(Array.from(ingredientIds));

        // Convert Map to plain object for JSON serialization
        ingredientsCatalog = Object.fromEntries(ingredientsMap);

        logger.debug('Ingredients catalog fetched', {
          count: ingredientIds.size
        });

        currentMenu = {
          id: menuResult.id,
          activeRecipes,
          swapPool,
          swapsCount: menuResult.swapsCount,
          numRecipes: menuResult.numRecipes,
          numServings: menuResult.numServings,
          createdAt: menuResult.createdAt.toISOString()
        };
      } else {
        logger.warn('Menu result not found for lastMenuResultId', {
          lastMenuResultId: user.lastMenuResultId
        });
      }
    }

    // Build response
    const response = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        status: user.status,
        isFirstLogin: user.isFirstLogin,
      },
      quotas: {
        menusGeneratedThisWindow: menuQuota.quotaStatus.menusGeneratedThisWindow,
        menuQuotaLimit: menuQuota.quotaStatus.menuQuotaLimit,
        swapsUsedThisMenu: swapQuota.quotaStatus.swapsUsedThisMenu,
        swapQuotaLimit: swapQuota.quotaStatus.swapQuotaLimit,
        nextQuotaReset: menuQuota.nextReset?.toISOString() || null,
        canGenerateMenu: menuQuota.canGenerate,
      },
      currentMenu,
      ingredientsCatalog,
      submission: submission || null,
    };

    logger.info('Dashboard status fetched successfully', {
      userId,
      hasMenu: !!currentMenu,
      ingredientsCount: Object.keys(ingredientsCatalog).length
    });

    return res.status(200).json(response);

  } catch (error) {
    logger.error('Error fetching dashboard status', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId
    });

    return res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de charger le dashboard'
    });
  }
}

export default withAuth(handler);
