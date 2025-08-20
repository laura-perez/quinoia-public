import { createLogger } from '@/lib/logger';
import { getUserRecentRecipes } from '@/lib/supabase/repositories/userRecipeHistory';
import { getFilteredRecipes } from '@/lib/supabase/repositories/recipes';
import { mapValue, equipmentMap } from '@/schemas/mappers';
import type { Recipe, SelectionContext, ScoredRecipe, RecipeSelectionResult } from '@/types/recipes';
import type { RecentRecipesSplit } from '@/lib/supabase/repositories/userRecipeHistory';

const logger = createLogger();

/**
 * Main recipe selection algorithm implementing the scoring system from SPECS
 * 
 * Scoring breakdown:
 * - Protein category match: +3 if preferred, -2 if not
 * - Protein density: +0.8 × (protein_g / 100_kcal)  
 * - Calorie proximity: -c × |calories - target| (c=0.02 for weightLoss, 0.01 others)
 * - Batch cooking: +0.5 if both user wants and recipe supports
 * - Favorite foods: +1 per match
 * - Disliked foods: -3 per match
 * - Recent recipes: -1.5 penalty for 14-21 day recipes
 */
export async function selectRecipes(context: SelectionContext): Promise<RecipeSelectionResult> {
  logger.info('Starting recipe selection', { 
    userId: context.userId,
    numRecipes: context.numRecipes,
    diet: context.diet 
  });

  // 1. Get user's recent recipes for recency filtering
  const recentRecipes = await getUserRecentRecipes(context.userId);
  
  // 2. Apply hard filters
  const filteredRecipes = await applyHardFilters(context, recentRecipes);
  
  if (filteredRecipes.length < context.numRecipes) {
    logger.warn('Insufficient recipes after hard filtering', {
      available: filteredRecipes.length,
      requested: context.numRecipes,
      userId: context.userId
    });
    // If not enough recipes are found, we can try to relax some filters or use fallbacks
    // TODO: send notification to warn of error, with context data for easy adding
    // return, don't go further; // Placeholder for error handling
  }
  
  // 3. Score all filtered recipes
  const scoredRecipes = scoreRecipes(filteredRecipes, context, recentRecipes);
  
  // 4. Apply diversity strategy and select final recipes
  const selectedRecipes = applyDiversitySelection(scoredRecipes, context);
  
  // 5. Calculate nutrition summary
  const nutritionSummary = calculateNutritionSummary(selectedRecipes, context.numServings);
  
  logger.info('Recipe selection completed', {
    userId: context.userId,
    selectedCount: selectedRecipes.length,
    avgScore: selectedRecipes.reduce((sum, r) => sum + r.score, 0) / selectedRecipes.length
  });

  return {
    selectedRecipes: selectedRecipes.map(r => ({ ...r, score: undefined, scoreBreakdown: undefined } as Recipe)),
    scoringDetails: {
      totalFiltered: filteredRecipes.length,
      totalScored: scoredRecipes.length,
      diversityStrategy: getDiversityStrategy(context.diet),
      fallbacksUsed: [] // TODO: implement fallback tracking
    },
    nutritionSummary
  };
}


/**
 * Apply hard filters that cannot be compromised
 */
async function applyHardFilters(
  context: SelectionContext, 
  recentRecipes: RecentRecipesSplit
): Promise<Recipe[]> {
  // Get recipes using repository
  const recipes = await getFilteredRecipes({
    diet: context.diet,
    status: 'active',
    maxPrepTime: 30,
    minCalories: context.mealMinKcal,
    maxCalories: context.mealMaxKcal,
    minProtein: context.proteinFloorG,
    excludeRecipeIds: recentRecipes.strict // Exclude recent strict recipes (≤14 days)
  });
  
  // Base equipment assumed to be available for everyone (in English to match user input after mapping)
  const BASE_EQUIPMENT = ["Pan", "Pot"];
  const userEquipmentWithBase = [...BASE_EQUIPMENT, ...context.equipmentAvailable];
  
  // Additional filtering for equipment, cooking level, and protein preferences
  return recipes.filter(recipe => {
    // Equipment check: translate French equipment to English and compare
    const hasRequiredEquipment = recipe.equipmentRequired.every(
      (eq: string) => {
        const mappedEquipment = mapValue(equipmentMap, eq) || eq;
        return userEquipmentWithBase.includes(mappedEquipment);
      }
    );
    
    // Cooking level check
    const levelOrder: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
    const hasSkillLevel = levelOrder[recipe.cookingLevel] <= levelOrder[context.cookingLevel];
    
    // Protein category check: only allow user's preferences
    const isPreferredProtein = context.proteinPreferences.includes(recipe.proteinCategory);
    
    return hasRequiredEquipment && hasSkillLevel && isPreferredProtein;
  });
}

/**
 * Score recipes using the deterministic algorithm from SPECS
 */
function scoreRecipes(
  recipes: Recipe[], 
  context: SelectionContext,
  recentRecipes: RecentRecipesSplit
): ScoredRecipe[] {
  const favoriteWords = context.favoriteFoods?.toLowerCase().split(/\s+/) || [];
  const dislikedWords = context.dislikedFoods?.toLowerCase().split(/\s+/) || [];
  
  return recipes.map(recipe => {
    const scoreBreakdown = {
      proteinCategoryMatch: 0,
      proteinDensity: 0,
      calorieProximity: 0,
      batchBonus: 0,
      favoriteBonus: 0,
      dislikedPenalty: 0,
      recencyPenalty: 0
    };
    
    // 1. Protein category preference: +3 if preferred, -2 if not
    scoreBreakdown.proteinCategoryMatch = context.proteinPreferences.includes(recipe.proteinCategory) ? 3 : -2;
    
    // 2. Protein density bonus: +0.8 × (protein_g / 100_kcal)
    const proteinDensity = (recipe.proteinGPerServing / recipe.caloriesPerServing) * 100;
    scoreBreakdown.proteinDensity = 0.8 * proteinDensity;
    
    // 3. Calorie proximity penalty
    const calorieCoeff = context.primaryGoal === 'weightLoss' ? 0.02 : 0.01;
    const calorieDistance = Math.abs(recipe.caloriesPerServing - context.mealTargetKcal);
    scoreBreakdown.calorieProximity = -calorieCoeff * calorieDistance;
    
    // 4. Batch cooking bonus
    if (context.batchMode && recipe.batchFriendly) {
      scoreBreakdown.batchBonus = 0.5;
    }
    
    // 5. Favorite foods bonus (+1 per match with ingredients/tags/title)
    const recipeText = `${recipe.titleFr} ${recipe.tags.join(' ')} ${recipe.ingredients.map(i => i.nom).join(' ')}`.toLowerCase();
    scoreBreakdown.favoriteBonus = favoriteWords.reduce((sum, word) => 
      recipeText.includes(word) ? sum + 1 : sum, 0
    );
    
    // 6. Disliked foods penalty (-3 per match with ingredients/tags/title)  
    scoreBreakdown.dislikedPenalty = -3 * dislikedWords.reduce((sum, word) =>
      recipeText.includes(word) ? sum + 1 : sum, 0
    );
    
    // 7. Recency penalty for soft recent recipes (-1.5)
    if (recentRecipes.soft.includes(recipe.id)) {
      scoreBreakdown.recencyPenalty = -1.5;
    }
    
    const totalScore = Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0);
    
    return {
      ...recipe,
      score: totalScore,
      scoreBreakdown
    };
  }).sort((a, b) => {
    // Primary sort: score descending
    if (b.score !== a.score) return b.score - a.score;
    
    // Tiebreaker 1: closer to calorie target
    const aCalorieDist = Math.abs(a.caloriesPerServing - context.mealTargetKcal);
    const bCalorieDist = Math.abs(b.caloriesPerServing - context.mealTargetKcal);
    if (aCalorieDist !== bCalorieDist) return aCalorieDist - bCalorieDist;
    
    // Tiebreaker 2: more protein
    if (b.proteinGPerServing !== a.proteinGPerServing) {
      return b.proteinGPerServing - a.proteinGPerServing;
    }
    
    // Tiebreaker 3: ID ascending (deterministic)
    return a.id.localeCompare(b.id);
  });
}

/**
 * Apply diversity strategy based on diet preferences
 */
function applyDiversitySelection(scoredRecipes: ScoredRecipe[], context: SelectionContext): ScoredRecipe[] {
  const diversityOrder = getDiversityOrder(context.diet);
  const selected: ScoredRecipe[] = [];
  const used = new Set<string>();
  
  // Phase 1: Ensure at least one recipe per preferred protein category
  for (const proteinCategory of context.proteinPreferences) {
    if (selected.length >= context.numRecipes) break;
    
    const candidate = scoredRecipes.find(r => 
      r.proteinCategory === proteinCategory && !used.has(r.id)
    );
    
    if (candidate) {
      selected.push(candidate);
      used.add(candidate.id);
    }
  }
  
  // Phase 2: Fill remaining slots with best scoring recipes, respecting diversity
  while (selected.length < context.numRecipes && used.size < scoredRecipes.length) {
    const remaining = scoredRecipes.filter(r => !used.has(r.id));
    if (remaining.length === 0) break;
    
    // Try to find next recipe following diversity order
    let nextRecipe = null;
    for (const proteinCategory of diversityOrder) {
      nextRecipe = remaining.find(r => r.proteinCategory === proteinCategory);
      if (nextRecipe) break;
    }
    
    // If no diversity option available, take highest scoring
    if (!nextRecipe) {
      nextRecipe = remaining[0];
    }
    
    selected.push(nextRecipe);
    used.add(nextRecipe.id);
  }
  
  return selected;
}

/**
 * Get diversity order based on diet type (from SPECS)
 */
function getDiversityOrder(diet: string): string[] {
  const orders: Record<string, string[]> = {
    omnivore: ["Beef", "Poultry", "Meat alternatives", "Fish", "Eggs", "Dairy", "Legumes", "Tofu"],
    flexitarian: ["Poultry", "Meat alternatives", "Fish", "Eggs", "Dairy", "Legumes", "Tofu", "Beef"],
    vegetarian: ["Meat alternatives", "Eggs", "Dairy", "Legumes", "Tofu"],
    vegan: ["Meat alternatives", "Legumes", "Tofu"]
  };
  
  return orders[diet] || orders.omnivore;
}

function getDiversityStrategy(diet: string): string {
  return `${diet}_protein_rotation`;
}

/**
 * Calculate nutrition summary for selected recipes
 */
function calculateNutritionSummary(recipes: ScoredRecipe[], numServings: number) {
  const totalCalories = recipes.reduce((sum, r) => sum + r.caloriesPerServing, 0) * numServings;
  const totalProtein = recipes.reduce((sum, r) => sum + r.proteinGPerServing, 0) * numServings;
  
  return {
    avgCalories: Math.round(totalCalories / recipes.length / numServings),
    avgProtein: Math.round((totalProtein / recipes.length / numServings) * 10) / 10,
    totalCalories,
    totalProtein: Math.round(totalProtein * 10) / 10
  };
}