/**
 * Shopping List Service
 * Business logic for generating intelligent shopping lists
 */

import { createLogger } from '@/lib/logger';
import { getCanonicalIngredientsByIds } from '@/lib/supabase/repositories/ingredients';
import type { 
  Recipe, 
  RecipeIngredient, 
  ShoppingList, 
  ShoppingListItem,
  ScaledIngredient
} from '../types';

const logger = createLogger();

/**
 * Category ordering for French grocery stores
 */
const FRENCH_GROCERY_ORGANIZATION = [
  { category: 'Légumes', section_code: 'frais', priority: 1 },
  { category: 'Viande', section_code: 'frais', priority: 2 },
  { category: 'Volaille', section_code: 'frais', priority: 3 },
  { category: 'Poisson', section_code: 'frais', priority: 4 },
  { category: 'Œufs', section_code: 'frais', priority: 5 },
  { category: 'Produits laitiers', section_code: 'frais', priority: 6 },
  { category: 'Fromages', section_code: 'frais', priority: 7 },
  { category: 'Herbes', section_code: 'frais', priority: 8 },
  { category: 'Alternatives végétales', section_code: 'frais', priority: 9 },
  { category: 'Protéines végétales', section_code: 'frais', priority: 10 },
  { category: 'Laits végétaux', section_code: 'frais', priority: 11 },
  { category: 'Féculents', section_code: 'sec', priority: 12 },
  { category: 'Épices', section_code: 'sec', priority: 13 },
  { category: 'Graines', section_code: 'sec', priority: 14 },
  { category: 'Épicerie', section_code: 'sec', priority: 15 },
  { category: 'Huiles', section_code: 'epicerie', priority: 16 },
  { category: 'Condiments', section_code: 'epicerie', priority: 17 },
  { category: 'Agrumes', section_code: 'frais', priority: 18 },
  { category: 'Pâtisserie', section_code: 'frais', priority: 19 },
  { category: 'Conserves', section_code: 'conserves', priority: 20 },
  { category: 'Surgelé', section_code: 'surgele', priority: 21 }
];

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
 * Organize ingredients by French grocery store categories
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

  // Create organized list with proper grocery store ordering
  const organized = FRENCH_GROCERY_ORGANIZATION
    .filter(org => categoryMap.has(org.category))
    .map(org => ({
      category: org.category,
      section_code: org.section_code,
      items: categoryMap.get(org.category)!
    }));

  // Add any categories not in the predefined organization
  for (const [category, categoryItems] of categoryMap.entries()) {
    if (!FRENCH_GROCERY_ORGANIZATION.some(org => org.category === category)) {
      organized.push({
        category,
        section_code: 'autres',
        items: categoryItems
      });
    }
  }

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