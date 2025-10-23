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
import { dashboardDataRepository } from '@/lib/supabase/repositories/dashboardData';
import { getRecipesByIds } from '@/lib/supabase/repositories/recipes';
import { ingredientsCache } from '@/lib/cache/ingredientsCache';
import { getRecipeImageUrls } from '@/lib/supabase/storage';

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
    // ✅ OPTIMIZATION: Single unified query replaces 6-7 separate queries
    // Fetches: user + submission + current menu + quota data in 1 DB call
    const dashboardData = await dashboardDataRepository.getByUserId(userId);

    if (!dashboardData) {
      logger.error('Dashboard data not found', { userId });
      return res.status(404).json({ error: 'Données utilisateur introuvables' });
    }

    logger.debug('Unified dashboard data fetched', {
      userId,
      hasSubmission: !!dashboardData.submission_id,
      hasCurrentMenu: !!dashboardData.current_menu_id,
      canGenerateMenu: dashboardData.can_generate_menu,
      canSwap: dashboardData.can_swap
    });

    // Build submission object for frontend (if exists)
    const submission = dashboardData.submission_id ? {
      id: dashboardData.submission_id,
      userId: dashboardData.user_id,
      age: dashboardData.age,
      gender: dashboardData.gender,
      diet: dashboardData.diet,
      proteinPreferences: dashboardData.proteinPreferences,
      equipmentAvailable: dashboardData.equipmentAvailable,
      cookingLevel: dashboardData.cookingLevel,
      numRecipes: dashboardData.submission_num_recipes,
      numServings: dashboardData.submission_num_servings,
      dislikedFoods: dashboardData.dislikedFoods,
      favoriteFoods: dashboardData.favoriteFoods,
    } : null;

    // Build current menu if exists
    let currentMenu = null;
    let ingredientsCatalog: Record<string, any> = {};

    if (dashboardData.current_menu_id && dashboardData.activeRecipeIds) {
      logger.debug('Processing current menu', {
        menuId: dashboardData.current_menu_id,
        activeRecipeCount: dashboardData.activeRecipeIds.length,
        swapPoolCount: dashboardData.swapPoolRecipeIds?.length || 0
      });

      // ✅ OPTIMIZATION #5: Only load swap pool if user can swap
      const allRecipeIds = [...dashboardData.activeRecipeIds];

      if (dashboardData.can_swap && dashboardData.swapPoolRecipeIds) {
        allRecipeIds.push(...dashboardData.swapPoolRecipeIds);
      } else {
        logger.debug('Skipping swap pool load', {
          canSwap: dashboardData.can_swap,
          hasSwapPool: !!dashboardData.swapPoolRecipeIds,
          reason: !dashboardData.can_swap ? 'User cannot swap' : 'No swap pool available'
        });
      }

      // Hydrate full recipe objects from IDs
      const recipes = await getRecipesByIds(allRecipeIds);

      logger.debug('Recipes hydrated', {
        requestedCount: allRecipeIds.length,
        fetchedCount: recipes.length
      });

      // Get recipe image URLs from Supabase Storage
      const recipeImageUrls = new Map<string, string | null>();
      const pictureFiles = recipes
        .map((recipe: any) => recipe.picture_file as string | undefined)
        .filter((file): file is string => Boolean(file));

      if (pictureFiles.length > 0) {
        try {
          const urlMap = await getRecipeImageUrls(pictureFiles);
          urlMap.forEach((url, filename) => {
            recipeImageUrls.set(filename, url);
          });

          logger.debug('Recipe images loaded', {
            imageCount: recipeImageUrls.size
          });
        } catch (imageError) {
          logger.warn('Failed to load recipe images', {
            error: imageError
          });
        }
      }

      // Add image URLs to recipes
      const recipesWithImages = recipes.map((recipe: any) => ({
        ...recipe,
        imageUrl: recipe.picture_file ? recipeImageUrls.get(recipe.picture_file) : null
      }));

      // Map recipes by ID for easy lookup
      const recipeMap = new Map(recipesWithImages.map(r => [r.id, r]));

      // Build active recipes array
      const activeRecipes = dashboardData.activeRecipeIds
        .map(id => recipeMap.get(id))
        .filter(Boolean);

      // Build swap pool array (only if loaded)
      const activeIds = new Set(dashboardData.activeRecipeIds);
      const swapPool = (dashboardData.can_swap && dashboardData.swapPoolRecipeIds)
        ? dashboardData.swapPoolRecipeIds
            .filter(id => !activeIds.has(id)) // Remove duplicates
            .map(id => recipeMap.get(id))
            .filter(Boolean)
        : [];

      // Extract all unique ingredient canonical IDs
      const ingredientIds = new Set<string>();
      recipes.forEach(recipe => {
        recipe.ingredients?.forEach((ing: any) => {
          if (ing.canonicalId) {
            ingredientIds.add(ing.canonicalId);
          }
        });
      });

      // ✅ OPTIMIZATION #3: Fetch ingredients catalog with caching (~90% hit rate)
      const ingredientsMap = await ingredientsCache.get(Array.from(ingredientIds));

      // Convert Map to plain object for JSON serialization
      ingredientsCatalog = Object.fromEntries(ingredientsMap);

      logger.debug('Ingredients catalog fetched', {
        count: ingredientIds.size,
        cacheStats: ingredientsCache.getStats()
      });

      currentMenu = {
        id: dashboardData.current_menu_id,
        activeRecipes,
        swapPool,
        swapsCount: dashboardData.swapsCount || 0,
        numRecipes: dashboardData.menu_num_recipes || activeRecipes.length,
        numServings: dashboardData.menu_num_servings || 2,
        createdAt: dashboardData.menu_created_at || new Date().toISOString()
      };
    }

    // ✅ Build response using unified dashboard data
    const response = {
      user: {
        id: dashboardData.user_id,
        email: dashboardData.email,
        firstName: dashboardData.firstName,
        status: dashboardData.status,
        isFirstLogin: dashboardData.isFirstLogin,
      },
      quotas: {
        menusGeneratedThisWindow: dashboardData.menus_generated_this_window,
        menuQuotaLimit: dashboardData.menu_quota_limit,
        swapsUsedThisMenu: dashboardData.swaps_used_this_menu,
        swapQuotaLimit: dashboardData.swap_quota_limit,
        nextQuotaReset: dashboardData.next_quota_reset,
        canGenerateMenu: dashboardData.can_generate_menu,
      },
      currentMenu,
      ingredientsCatalog,
      submission,
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
