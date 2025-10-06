/**
 * API Route: Dashboard Status
 * GET /api/dashboard/status
 *
 * Returns user info, quotas, current menu, and ingredients catalog
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createLogger } from '@/lib/logger';
import { withAuth } from '@/middleware/withAuth';
import { usersRepository } from '@/lib/supabase/repositories/users';
import { menuResultsRepository } from '@/lib/supabase/repositories/menuResults';
import { checkUserQuota } from '@/lib/quotas/checker';
import { getRecipesByIds } from '@/lib/supabase/repositories/recipes';
import { getCanonicalIngredientsByIds } from '@/lib/supabase/repositories/ingredients';

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
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
    // Fetch user
    const user = await usersRepository.findById(userId);

    if (!user) {
      logger.error('User not found in dashboard status', { userId });
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    logger.debug('User fetched', {
      userId: user.id,
      status: user.status
    });

    // Fetch quotas
    const menuQuota = await checkUserQuota(userId, 'menu');
    const swapQuota = await checkUserQuota(userId, 'swap');

    logger.debug('Quotas fetched', {
      userId,
      canGenerateMenu: menuQuota.canGenerate,
      swapsRemaining: swapQuota.remaining
    });

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

        const swapPool = menuResult.swapPoolRecipeIds
          .map(id => recipeMap.get(id))
          .filter(Boolean);

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
