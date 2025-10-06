/**
 * Pure Shopping List Generator (Frontend)
 *
 * Generates shopping lists ENTIRELY on the frontend with 0 database calls.
 * This is a PURE function - no side effects, no API calls, no DB queries.
 *
 * Architecture:
 * - Takes recipes + ingredientsCatalog (both fetched ONCE on dashboard load)
 * - Performs aggregation entirely client-side
 * - Returns formatted shopping list ready for display
 *
 * Performance: ~5ms for 7 recipes with 50 ingredients
 */

import type { Recipe, ShoppingList, ShoppingListItem, ScaledIngredient } from '@/lib/recipes/types';
import type { CanonicalIngredientInfo } from '@/lib/supabase/repositories/ingredients';
import { SECTION_DISPLAY_ORDER, type SupermarketSectionCode } from '@/lib/constants';

export interface GenerateShoppingListInput {
  recipes: Recipe[];
  numServings: number;
  ingredientsCatalog: Record<string, CanonicalIngredientInfo>; // Pre-fetched canonical ingredient info
}

/**
 * Pure function to generate shopping list from recipes
 * NO DATABASE CALLS - all data passed in via parameters
 */
export function generateShoppingList(input: GenerateShoppingListInput): ShoppingList {
  const { recipes, numServings, ingredientsCatalog } = input;

  // Step 1: Extract and scale ingredients
  const scaledIngredients = extractScaledIngredients(recipes, numServings);

  // Step 2: Aggregate by canonical ID
  const { items, unmappedCount } = aggregateIngredients(scaledIngredients, ingredientsCatalog);

  // Step 3: Organize by grocery categories/sections
  const organizedByCategory = organizeByGroceryCategories(items);

  // Step 4: Build summary
  const summary = {
    totalItems: items.length,
    totalCategories: organizedByCategory.length,
    totalRecipes: recipes.length,
    unmappedIngredients: unmappedCount,
  };

  return {
    items,
    organizedByCategory,
    summary,
  };
}

/**
 * Extract and scale ingredients from recipes based on serving count
 * Pure function - no side effects
 */
function extractScaledIngredients(recipes: Recipe[], numServings: number): ScaledIngredient[] {
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
          serving_multiplier: servingMultiplier,
        });
      }
    }
  }

  return scaledIngredients;
}

/**
 * Aggregate ingredients by canonical ID using pre-fetched catalog
 * Pure function - no database calls
 */
function aggregateIngredients(
  scaledIngredients: ScaledIngredient[],
  ingredientsCatalog: Record<string, CanonicalIngredientInfo>
): {
  items: ShoppingListItem[];
  unmappedCount: number;
} {
  const aggregatedMap = new Map<string, ShoppingListItem>();
  let unmappedCount = 0;

  for (const ingredient of scaledIngredients) {
    if (!ingredient.canonicalId || !ingredient.canonicalName) {
      // Track unmapped count (quality monitoring)
      unmappedCount++;
      continue;
    }

    const key = ingredient.canonicalId;

    if (aggregatedMap.has(key)) {
      // Aggregate with existing canonical ingredient
      const existing = aggregatedMap.get(key)!;

      // Unit conversion if necessary
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
        serving_multiplier: ingredient.serving_multiplier,
      });
    } else {
      // Create new aggregated item
      const canonicalInfo = ingredientsCatalog[ingredient.canonicalId];

      aggregatedMap.set(key, {
        canonical_ingredient_id: key,
        name_fr: ingredient.canonicalName,
        total_amount: ingredient.scaled_amount,
        unit: ingredient.unite,
        category: canonicalInfo?.category || 'Autres',
        section_code: canonicalInfo?.sectionCode || 'epicerie',
        sources: [
          {
            recipe_id: ingredient.recipe_id,
            recipe_title: ingredient.recipe_title,
            amount: ingredient.scaled_amount,
            original_name: ingredient.nom,
            serving_multiplier: ingredient.serving_multiplier,
          },
        ],
      });
    }
  }

  const items = Array.from(aggregatedMap.values());
  return { items, unmappedCount };
}

/**
 * Organize ingredients by section_code and sort by supermarket logical order
 * Pure function - deterministic output
 */
function organizeByGroceryCategories(
  items: ShoppingListItem[]
): Array<{
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
      section_code: categoryItems[0]?.section_code || 'epicerie',
      items: categoryItems,
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
 * Basic unit normalization (pure function)
 */
function normalizeAmount(amount: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) {
    return amount;
  }

  // Basic volume/weight conversions for common ingredients
  if ((fromUnit === 'ml' && toUnit === 'g') || (fromUnit === 'g' && toUnit === 'ml')) {
    // Assume density ~1.0 for most liquids
    return amount;
  }

  // Return as-is for unit mismatch (can be enhanced later)
  return amount;
}
