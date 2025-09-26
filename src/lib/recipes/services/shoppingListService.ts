/**
 * Shopping List Service
 * Business logic for generating intelligent shopping lists
 */

import { createLogger } from '@/lib/logger';
import { getCanonicalIngredientsByIds } from '@/lib/supabase/repositories/ingredients';
import { SECTION_DISPLAY_ORDER, type SupermarketSectionCode } from '@/lib/constants';
import type { 
  Recipe, 
  RecipeIngredient, 
  ShoppingList, 
  ShoppingListItem,
  ScaledIngredient
} from '../types';

const logger = createLogger();

/**
 * Extract and scale ingredients from recipes based on serving count
 */
export function extractScaledIngredients(
  recipes: Recipe[], 
  numServings: number
): ScaledIngredient[] {
  const scaledIngredients: ScaledIngredient[] = [];

  for (const recipe of recipes) {
    const servingMultiplier = numServings / recipe.servingsBase;
    
    for (const ingredient of recipe.ingredients) {
      if (ingredient.quantite && ingredient.quantite > 0) {
        scaledIngredients.push({
          recipe_id: recipe.id,
          recipe_title: recipe.titleFr,
          nom: ingredient.nom,
          scaled_amount: ingredient.quantite * servingMultiplier,
          unite: ingredient.unite || 'g',
          canonicalId: ingredient.canonicalId,
          canonicalName: ingredient.canonicalName,
          serving_multiplier: servingMultiplier
        });
      }
    }
  }

  return scaledIngredients;
}

/**
 * Group ingredients by canonical ID with intelligent aggregation
 */
export async function aggregateIngredientsByCanonicalId(
  scaledIngredients: ScaledIngredient[]
): Promise<{
  items: ShoppingListItem[];
  unmappedIngredients: Array<{ name: string; recipes: string[] }>;
}> {
  const aggregatedMap = new Map<string, ShoppingListItem>();
  const unmappedIngredients: Array<{ name: string; recipes: string[] }> = [];

  // Collect all unique canonical IDs for batch fetch
  const canonicalIds = Array.from(
    new Set(
      scaledIngredients
        .map(ing => ing.canonicalId)
        .filter(Boolean) as string[]
    )
  );

  // Batch fetch canonical ingredient info
  const canonicalInfoMap = await getCanonicalIngredientsByIds(canonicalIds);

  for (const ingredient of scaledIngredients) {
    if (!ingredient.canonicalId || !ingredient.canonicalName) {
      // Track unmapped ingredients for quality monitoring
      const existing = unmappedIngredients.find(u => u.name === ingredient.nom);
      if (existing) {
        existing.recipes.push(ingredient.recipe_title);
      } else {
        unmappedIngredients.push({
          name: ingredient.nom,
          recipes: [ingredient.recipe_title]
        });
      }
      continue;
    }

    const key = ingredient.canonicalId;

    if (aggregatedMap.has(key)) {
      // Aggregate with existing canonical ingredient
      const existing = aggregatedMap.get(key)!;
      
      // Unit conversion if necessary (basic implementation)
      const normalizedAmount = normalizeAmount(
        ingredient.scaled_amount, 
        ingredient.unite, 
        existing.unit
      );
      
      existing.total_amount += normalizedAmount;
      existing.sources.push({
        recipe_id: ingredient.recipe_id,
        recipe_title: ingredient.recipe_title,
        amount: ingredient.scaled_amount,
        original_name: ingredient.nom,
        serving_multiplier: ingredient.serving_multiplier
      });
    } else {
      // Create new aggregated item
      const canonicalInfo = canonicalInfoMap.get(ingredient.canonicalId);
      
      aggregatedMap.set(key, {
        canonical_ingredient_id: key,
        name_fr: ingredient.canonicalName,
        total_amount: ingredient.scaled_amount,
        unit: ingredient.unite,
        category: canonicalInfo?.category || 'Autres',
        section_code: canonicalInfo?.sectionCode || 'epicerie',
        sources: [{
          recipe_id: ingredient.recipe_id,
          recipe_title: ingredient.recipe_title,
          amount: ingredient.scaled_amount,
          original_name: ingredient.nom,
          serving_multiplier: ingredient.serving_multiplier
        }]
      });
    }
  }

  const items = Array.from(aggregatedMap.values());
  return { items, unmappedIngredients };
}

/**
 * Organize ingredients by section_code and sort by supermarket logical order
 * Uses SECTION_DISPLAY_ORDER to respect real-world shopping flow
 */
export function organizeByGroceryCategories(items: ShoppingListItem[]): Array<{
  category: string;
  section_code: string;
  items: ShoppingListItem[];
}> {
  const categoryMap = new Map<string, ShoppingListItem[]>();

  // Group items by category
  for (const item of items) {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, []);
    }
    categoryMap.get(item.category)!.push(item);
  }

  // Sort items within each category alphabetically
  for (const [category, categoryItems] of categoryMap.entries()) {
    categoryItems.sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  }

  // Create organized list grouped by category, sorted by supermarket section order
  const organized = Array.from(categoryMap.entries())
    .map(([category, categoryItems]) => ({
      category,
      section_code: categoryItems[0]?.section_code || 'epicerie', // Use section from first item (all items in category should have same section)
      items: categoryItems
    }))
    .sort((a, b) => {
      // Primary sort: by section_code using supermarket display order
      const orderA = SECTION_DISPLAY_ORDER.indexOf(a.section_code as SupermarketSectionCode);
      const orderB = SECTION_DISPLAY_ORDER.indexOf(b.section_code as SupermarketSectionCode);
      
      // If section not found in order, put at end
      const finalOrderA = orderA === -1 ? SECTION_DISPLAY_ORDER.length : orderA;
      const finalOrderB = orderB === -1 ? SECTION_DISPLAY_ORDER.length : orderB;
      
      const sectionCompare = finalOrderA - finalOrderB;
      if (sectionCompare !== 0) return sectionCompare;
      
      // Secondary sort: by category alphabetically within same section
      return a.category.localeCompare(b.category, 'fr');
    });

  return organized;
}

/**
 * Basic unit normalization (can be enhanced later)
 */
function normalizeAmount(amount: number, fromUnit: string, toUnit: string): number {
  // For MVP, assume units are compatible
  // TODO: Implement full unit conversion system (ml/g, pieces to weight, etc.)
  
  if (fromUnit === toUnit) {
    return amount;
  }

  // Basic volume/weight conversions for common ingredients
  if ((fromUnit === 'ml' && toUnit === 'g') || (fromUnit === 'g' && toUnit === 'ml')) {
    // Assume density ~1.0 for most liquids (can be enhanced with actual densities)
    return amount;
  }

  // Log warning for unit mismatch
  logger.warn('Unit conversion not implemented', { fromUnit, toUnit, amount });
  return amount; // Return as-is for now
}

/**
 * Calculate aggregation statistics for monitoring
 */
export function calculateAggregationStats(
  originalIngredients: ScaledIngredient[], 
  aggregatedItems: ShoppingListItem[]
) {
  const totalOriginalIngredients = originalIngredients.length;
  const totalAggregatedItems = aggregatedItems.length;
  const aggregationRatio = totalOriginalIngredients > 0 ? 
    Math.round((totalOriginalIngredients - totalAggregatedItems) / totalOriginalIngredients * 100) : 0;

  // Find examples of successful aggregation
  const multiSourceItems = aggregatedItems.filter(item => item.sources.length > 1);
  const bestAggregation = multiSourceItems.reduce((best, current) => 
    current.sources.length > best.sources.length ? current : best,
    { sources: [] as any[] }
  );

  return {
    originalIngredients: totalOriginalIngredients,
    aggregatedItems: totalAggregatedItems,
    aggregationRatio: `${aggregationRatio}%`,
    multiSourceItems: multiSourceItems.length,
    bestAggregationExample: bestAggregation.sources.length > 1 ? {
      name: (bestAggregation as ShoppingListItem).name_fr,
      sourceCount: bestAggregation.sources.length,
      totalAmount: (bestAggregation as ShoppingListItem).total_amount,
      unit: (bestAggregation as ShoppingListItem).unit
    } : null
  };
}

/**
 * Format shopping list for display (utility function)
 */
export function formatShoppingListForDisplay(shoppingList: ShoppingList): string {
  let formatted = '🛒 **Liste de courses intelligente**\\n\\n';
  
  for (const category of shoppingList.organizedByCategory) {
    formatted += `## ${category.category} (${category.section_code})\\n`;
    
    for (const item of category.items) {
      const amount = Math.round(item.total_amount * 10) / 10;
      const sources = item.sources.length > 1 ? 
        ` (${item.sources.length} recettes)` : '';
      
      formatted += `- ${item.name_fr}: ${amount} ${item.unit}${sources}\\n`;
    }
    
    formatted += '\\n';
  }
  
  formatted += `📊 **Résumé**: ${shoppingList.summary.totalItems} ingrédients, ${shoppingList.summary.totalCategories} rayons\\n`;
  
  if (shoppingList.summary.unmappedIngredients > 0) {
    formatted += `⚠️ ${shoppingList.summary.unmappedIngredients} ingrédients nécessitent une vérification manuelle\\n`;
  }
  
  return formatted;
}