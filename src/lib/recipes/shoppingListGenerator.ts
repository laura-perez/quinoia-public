/**
 * Intelligent Shopping List Generator - v2.0 Core Feature
 * Canonical ingredient aggregation: "quinoa blanc" + "quinoa rouge" = "Quinoa"
 * French grocery store organization with proper quantity scaling
 */

import { createLogger } from '@/lib/logger';
import {
  extractScaledIngredients,
  aggregateIngredientsByCanonicalId,
  organizeByGroceryCategories,
  calculateAggregationStats
} from './services/shoppingListService';
import type { Recipe, ShoppingList } from './types';

const logger = createLogger();

/**
 * Generate intelligent shopping list with canonical ingredient aggregation
 */
export async function generateShoppingList(
  recipes: Recipe[],
  numServings: number
): Promise<ShoppingList> {
  const startTime = Date.now();
  
  logger.info('Starting shopping list generation', { 
    numRecipes: recipes.length,
    numServings,
    totalIngredients: recipes.reduce((sum, r) => sum + r.ingredients.length, 0)
  });

  try {
    // 1. Extract and scale all ingredients from selected recipes
    const scaledIngredients = extractScaledIngredients(recipes, numServings);
    
    // 2. Group ingredients by canonical ID with batch database fetch
    const { items, unmappedIngredients } = await aggregateIngredientsByCanonicalId(scaledIngredients);

    // 3. Organize by grocery store sections
    const organizedByCategory = organizeByGroceryCategories(items);

    // 4. Log aggregation statistics
    const aggregationStats = calculateAggregationStats(scaledIngredients, items);
    logger.info('Shopping list aggregation completed', {
      duration: `${Date.now() - startTime}ms`,
      ...aggregationStats,
      unmappedIngredients: unmappedIngredients.length
    });

    // 5. Log unmapped ingredients for quality monitoring
    if (unmappedIngredients.length > 0) {
      logger.warn('Unmapped ingredients detected', {
        unmappedIngredients: unmappedIngredients.slice(0, 5), // Log first 5
        totalUnmapped: unmappedIngredients.length
      });
    }

    return {
      items,
      organizedByCategory,
      summary: {
        totalItems: items.length,
        totalCategories: organizedByCategory.length,
        totalRecipes: recipes.length,
        unmappedIngredients: unmappedIngredients.length
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Shopping list generation failed', { error: errorMessage });
    throw new Error(`Shopping list generation failed: ${errorMessage}`);
  }
}

// Re-export utility functions for backward compatibility
export { formatShoppingListForDisplay } from './services/shoppingListService';