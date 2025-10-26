import { createLogger } from '@/lib/logger';
import { getFilteredRecipes } from '@/lib/supabase/repositories/recipes';
import { getUserRecencyFromView, type RecencyViewData } from '@/lib/supabase/recency';
import { mapValue, equipmentMap } from '@/schemas/mappers';
import type { Recipe, SelectionContext, ScoredRecipe, RecipeSelectionResult } from '@/types/recipes';

const logger = createLogger();

// Freshness scoring constants
const FRESHNESS_THRESHOLDS = {
  VERY_RECENT: 7,
  RECENT: 14,
  NEUTRAL: 21,
  OLD: 30
} as const;

const FRESHNESS_BONUSES = {
  VERY_RECENT_PENALTY: -2.0,
  NEUTRAL: 0.0,
  RECENT_SOFT_BONUS: 0.5,
  OLD_BONUS: 1.5,
  VERY_OLD_BONUS: 2.0,
  NEVER_SEEN_BONUS: 0.5
} as const;

/**
 * Main recipe selection algorithm implementing the scoring system
 *
 * Scoring breakdown (6 components):
 * - Protein preferences: +1 per matching preferred protein category
 * - Protein density: +0.8 × (protein_g / 100_kcal)
 * - Batch cooking: +0.5 if both user wants and recipe supports
 * - Favorite foods: +1 per match
 * - Disliked foods: -3 per match
 * - Freshness bonus/penalty (NEW): Replaces hard recency exclusion
 *   • Never seen: +0.5
 *   • >30 days: +2.0
 *   • 22-30 days (inclusive): +1.5
 *   • 15-21 days (inclusive): +0.5
 *   • 8-14 days (inclusive): 0 (neutral)
 *   • ≤7 days: -2.0
 */
export async function selectRecipes(
  context: SelectionContext
): Promise<RecipeSelectionResult> {
  logger.info('Starting recipe selection', { 
    userId: context.userId,
    numRecipes: context.numRecipes,
    diet: context.diet 
  });

  // 1. Parallel execution: Get recency data AND base recipes simultaneously
  logger.info('Starting parallel database queries', { userId: context.userId });
  const startParallelTime = Date.now();

  const [recency, baseRecipes] = await Promise.all([
    getUserRecencyFromView(context.userId),
    getFilteredRecipes({
      diet: context.diet,
      status: 'active',
      maxPrepTime: 30,
      minProtein: context.proteinFloorG,
      // Exclude recipes passed in context (e.g., active recipes during refetch)
      excludeRecipeIds: context.excludeRecipeIds || []
    })
  ]);

  logger.info('Parallel queries completed', {
    userId: context.userId,
    parallelQueryTime: Date.now() - startParallelTime,
    baseRecipesCount: baseRecipes.length,
    recencyDataFound: !!recency
  });

  // 2. Apply remaining filters with automatic cycle reset fallback
  const filteredRecipes = applyRemainingFilters(baseRecipes, context, recency);

  // Note: No longer throw error for insufficient recipes
  // The progressive fallback in applyRemainingFilters ensures we always have recipes
  // In the worst case (extreme heavy user), all recipes are re-included with freshness penalties
  if (filteredRecipes.length < context.numRecipes) {
    logger.warn('Pool smaller than requested but continuing with available recipes', {
      available: filteredRecipes.length,
      requested: context.numRecipes,
      userId: context.userId
    });
    // Continue anyway - diversity selection will handle it
  }
  
  // 3. Score all filtered recipes (soft list provides recency penalty)
  const scoredRecipes = scoreRecipes(filteredRecipes, context, recency);

  // 3b. Remove near-duplicates to improve variety
  const dedupedScoredRecipes = filterNearDuplicates(scoredRecipes, {
    rejectThreshold: 0.7,
    softThreshold: 0.6, // future use (penalty zone) - currently only hard reject ≥ rejectThreshold
    maxLossFraction: 0.4 // do not remove more than 40% of pool
  });
  
  // 4. Apply diversity strategy and select final recipes
  const selectedRecipes = applyDiversitySelection(dedupedScoredRecipes, context);
  
  // 5. Calculate nutrition summary
  const nutritionSummary = calculateNutritionSummary(selectedRecipes, context.numServings);
  
  logger.info('Recipe selection completed', {
    userId: context.userId,
    selectedCount: selectedRecipes.length,
    avgScore: selectedRecipes.length > 0
      ? selectedRecipes.reduce((sum, r) => sum + r.score, 0) / selectedRecipes.length
      : 0
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
 * Apply remaining filters after parallel query execution
 * NEW: Progressive fallback when pool is too small (automatic cycle reset)
 * FIX: Apply context filters FIRST, then recency fallback to maintain minimum pool size
 */
function applyRemainingFilters(
  baseRecipes: Recipe[],
  context: SelectionContext,
  recency: RecencyViewData
): Recipe[] {
  const MIN_POOL_SIZE = 15; // Minimum comfortable pool size for variety

  // STEP 1: Apply context filters FIRST (equipment, skill level, protein preferences)
  // This ensures we know the actual available pool before applying recency logic
  const BASE_EQUIPMENT = ["Pan", "Pot"];
  const userEquipmentSet = new Set([...BASE_EQUIPMENT, ...context.equipmentAvailable]);
  const proteinPreferencesSet = new Set(context.proteinPreferences);
  const hasProteinPreferences = context.proteinPreferences.length > 0;
  const levelOrder: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const userSkillLevel = levelOrder[context.cookingLevel];

  const recipesAfterContextFilter = baseRecipes.filter(recipe => {
    // Equipment check: translate French equipment to English and compare
    const hasRequiredEquipment = recipe.equipmentRequired.every(
      (eq: string) => {
        const mappedEquipment = mapValue(equipmentMap, eq) || eq;
        return userEquipmentSet.has(mappedEquipment);
      }
    );

    // Cooking level check
    const hasSkillLevel = levelOrder[recipe.cookingLevel] <= userSkillLevel;

    // Protein category check
    const isPreferredProtein = !hasProteinPreferences || proteinPreferencesSet.has(recipe.proteinCategory);

    return hasRequiredEquipment && hasSkillLevel && isPreferredProtein;
  });

  // STEP 2: Apply recency filters with progressive fallback on the context-filtered pool
  const excludeIds = new Set(recency.excludeRecipeIds || []);

  // First attempt: exclude all recipes from last 21 days
  let finalPool = recipesAfterContextFilter.filter(recipe =>
    !excludeIds.has(recipe.id)
  );

  // Progressive fallback: if pool is too small, gradually re-include older recipes
  if (finalPool.length < MIN_POOL_SIZE) {
    logger.info('Pool too small - starting cycle fallback (re-including recipes 15-21 days old)', {
      userId: context.userId,
      currentPoolSize: finalPool.length,
      minRequired: MIN_POOL_SIZE,
      recipesExcluded: excludeIds.size
    });

    // Fallback Level 1: Re-include recipes seen 15-21 days ago
    // These already have +0.5 freshness bonus, so they're naturally lower priority
    finalPool = recipesAfterContextFilter.filter(recipe => {
      const daysSince = getDaysSinceLastSeen(recipe.id, recency);
      // Keep recipes never seen OR seen more than 14 days ago
      return daysSince === null || daysSince > 14;
    });
  }

  // Fallback Level 2: if still too small, re-include recipes 8-14 days old
  if (finalPool.length < MIN_POOL_SIZE) {
    logger.info('Pool still too small - extending fallback (re-including recipes 8-14 days old)', {
      userId: context.userId,
      currentPoolSize: finalPool.length
    });

    finalPool = recipesAfterContextFilter.filter(recipe => {
      const daysSince = getDaysSinceLastSeen(recipe.id, recency);
      // Keep recipes never seen OR seen more than 7 days ago
      return daysSince === null || daysSince > 7;
    });
  }

  // Fallback Level 3: if STILL too small (pathological heavy user), reset completely
  if (finalPool.length < MIN_POOL_SIZE) {
    logger.warn('Extreme heavy user detected - complete cycle reset (all recipes available)', {
      userId: context.userId,
      recipesSeenInLast21Days: excludeIds.size,
      poolAfterContextFilters: recipesAfterContextFilter.length
    });

    // Reset cycle: all context-filtered recipes available
    // (freshness scoring will still penalize recent ones)
    finalPool = recipesAfterContextFilter;
  }

  return finalPool;
}

/**
 * Calculate days since last seen for a recipe
 * Uses recipeTimestamps from the view for accurate calculation
 * @returns number of days or null if never seen
 */
function getDaysSinceLastSeen(recipeId: string, recency: RecencyViewData): number | null {
  const timestampData = recency.recipeTimestamps?.[recipeId];

  if (timestampData) {
    // Use pre-calculated daysSince from the view
    return timestampData.daysSince;
  }

  // Recipe never seen before
  return null;
}

/**
 * Score recipes using the deterministic algorithm from SPECS
 * NEW: Replaces hard recency exclusion with freshness bonus/penalty
 */
function scoreRecipes(
  recipes: Recipe[],
  context: SelectionContext,
  recency: RecencyViewData
): ScoredRecipe[] {
  const favoriteWords = context.favoriteFoods?.toLowerCase().split(/\s+/) || [];
  const dislikedWords = context.dislikedFoods?.toLowerCase().split(/\s+/) || [];
  
  return recipes.map(recipe => {
    const scoreBreakdown = {
      proteinPreferenceBonus: 0,
      proteinDensity: 0,
      batchBonus: 0,
      favoriteBonus: 0,
      dislikedPenalty: 0,
      freshnessBonus: 0 // NEW: Replaces recencyPenalty (can be positive or negative)
    };

    // 1. Protein preference bonus: +1 for each matching preferred protein category
    scoreBreakdown.proteinPreferenceBonus = context.proteinPreferences.includes(recipe.proteinCategory) ? 1 : 0;

    // 2. Protein density bonus: +0.8 × (protein_g / 100_kcal)
    const proteinDensity = (recipe.proteinGPerServing / recipe.caloriesPerServing) * 100;
    scoreBreakdown.proteinDensity = 0.8 * proteinDensity;

    // 3. Batch cooking bonus
    if (context.batchMode && recipe.batchFriendly) {
      scoreBreakdown.batchBonus = 0.5;
    }

    // 4. Favorite foods bonus (+1 per match with ingredients/tags/title)
    const recipeText = `${recipe.titleFr} ${recipe.tags.join(' ')} ${recipe.ingredients.map(i => i.nom).join(' ')}`.toLowerCase();
    scoreBreakdown.favoriteBonus = favoriteWords.reduce((sum, word) =>
      recipeText.includes(word) ? sum + 1 : sum, 0
    );

    // 5. Disliked foods penalty (-3 per match with ingredients/tags/title)
    scoreBreakdown.dislikedPenalty = -3 * dislikedWords.reduce((sum, word) =>
      recipeText.includes(word) ? sum + 1 : sum, 0
    );

    // 6. NEW: Freshness bonus/penalty (replaces hard recency exclusion)
    //    Recipes rotate naturally: old ones come back, recent ones are penalized
    const daysSinceLastSeen = getDaysSinceLastSeen(recipe.id, recency);

    if (daysSinceLastSeen === null) {
      scoreBreakdown.freshnessBonus = FRESHNESS_BONUSES.NEVER_SEEN_BONUS;
    } else if (daysSinceLastSeen > FRESHNESS_THRESHOLDS.OLD) {
      scoreBreakdown.freshnessBonus = FRESHNESS_BONUSES.VERY_OLD_BONUS;
    } else if (daysSinceLastSeen >= 22) {
      // 22-30 days inclusive
      scoreBreakdown.freshnessBonus = FRESHNESS_BONUSES.OLD_BONUS;
    } else if (daysSinceLastSeen >= 15) {
      // 15-21 days inclusive
      scoreBreakdown.freshnessBonus = FRESHNESS_BONUSES.RECENT_SOFT_BONUS;
    } else if (daysSinceLastSeen >= 8) {
      // 8-14 days inclusive: neutral
      scoreBreakdown.freshnessBonus = FRESHNESS_BONUSES.NEUTRAL;
    } else {
      // 0-7 days: big penalty
      scoreBreakdown.freshnessBonus = FRESHNESS_BONUSES.VERY_RECENT_PENALTY;
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
    
    // Tiebreaker 1: more protein
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
  // Use round-robin rotation through protein categories to ensure variety
  let diversityIndex = 0;
  while (selected.length < context.numRecipes && used.size < scoredRecipes.length) {
    const remaining = scoredRecipes.filter(r => !used.has(r.id));
    if (remaining.length === 0) break;

    // Try to find next recipe following diversity order with round-robin rotation
    let nextRecipe = null;
    let attempts = 0;

    // Try each protein category in order, starting from current diversity index
    while (!nextRecipe && attempts < diversityOrder.length) {
      const proteinCategory = diversityOrder[diversityIndex % diversityOrder.length];
      nextRecipe = remaining.find(r => r.proteinCategory === proteinCategory);

      if (nextRecipe) {
        // Found a recipe in this category, move to next category for next iteration
        diversityIndex++;
        break;
      }

      // No recipe in this category, try next one
      diversityIndex++;
      attempts++;
    }

    // If no diversity option available (all categories exhausted), take highest scoring
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
  if (recipes.length === 0) {
    return {
      avgProtein: 0,
      totalProtein: 0
    };
  }

  const totalProtein = recipes.reduce((sum, r) => sum + r.proteinGPerServing, 0) * numServings;

  return {
    avgProtein: Math.round((totalProtein / recipes.length / numServings) * 10) / 10,
    totalProtein: Math.round(totalProtein * 10) / 10
  };
}

/**
 * Near-duplicate filtering
 * Removes lower-scoring recipes that are very similar to an already retained higher-scoring one.
 */
function filterNearDuplicates(
  scored: ScoredRecipe[],
  opts: { rejectThreshold: number; softThreshold: number; maxLossFraction: number }
): ScoredRecipe[] {
  const { rejectThreshold, maxLossFraction } = opts;
  const kept: ScoredRecipe[] = [];
  const removed: { a: string; b: string; sim: number }[] = [];

  for (const recipe of scored) {
    const isDuplicate = kept.some(existing => {
      const sim = similarity(existing, recipe);
      if (sim >= rejectThreshold) {
        removed.push({ a: existing.titleFr, b: recipe.titleFr, sim: Math.round(sim * 100) / 100 });
        return true;
      }
      return false;
    });
    if (!isDuplicate) kept.push(recipe);
  }

  // Safety: avoid over-filtering
  if (kept.length < scored.length * (1 - maxLossFraction)) {
    logger.warn('Duplicate filter reverted (would remove too many recipes)', {
      original: scored.length,
      kept: kept.length
    });
    return scored;
  }

  if (removed.length) {
    logger.info('Near-duplicate recipes filtered', {
      original: scored.length,
      kept: kept.length,
      removedPairs: removed.slice(0, 10) // cap log size
    });
  }
  return kept;
}

// --- Similarity helpers ---
function similarity(a: Recipe, b: Recipe): number {
  const ingA = new Set(a.ingredients?.map(i => normalizeToken(i.nom)) || []);
  const ingB = new Set(b.ingredients?.map(i => normalizeToken(i.nom)) || []);
  const jaccardIng = jaccard(ingA, ingB);

  const titleTokensA = tokenize(a.titleFr);
  const titleTokensB = tokenize(b.titleFr);
  const jaccardTitle = jaccard(new Set(titleTokensA), new Set(titleTokensB));

  const baseMatch = baseToken(a.titleFr) === baseToken(b.titleFr) ? 1 : 0;
  const proteinMatch = a.proteinCategory === b.proteinCategory ? 1 : 0;
  const structural = (baseMatch && proteinMatch) ? 1 : 0;
  const patternA = cookingPattern(titleTokensA);
  const patternB = cookingPattern(titleTokensB);
  const patternMatch = patternA && patternB && patternA === patternB ? 1 : 0;

  // Important vegetable tokens (normalized without accents)
  const importantVeg = ['carotte','carottes','brocoli','courgette','pois','petits','edamame','poivron','oignon'];
  const sharedImportant = new Set(titleTokensA.filter(t => importantVeg.includes(t) && titleTokensB.includes(t)));

  let score = 0.35 * jaccardIng + 0.25 * jaccardTitle + 0.25 * structural + 0.15 * patternMatch;

  // Heuristic boost: same stir-fry rice pattern + at least one shared important veg -> raise similarity floor
  if (patternMatch && patternA?.includes('riz-saute') && sharedImportant.size > 0) {
    score = Math.max(score, 0.8);
  }

  return score;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const v of a) if (b.has(v)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

function tokenize(text: string): string[] {
  return normalizeToken(text).split('-').filter(Boolean);
}

function normalizeToken(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');
}

function baseToken(title: string): string {
  const tokens = tokenize(title);
  // Look for common cooking style words
  const styles = ['saute', 'sauté', 'curry', 'bowl', 'gratin', 'wrap', 'salade', 'riz', 'pate', 'nouilles', 'quinoa'];
  return tokens.find(t => styles.includes(t)) || tokens[0] || '';
}

function cookingPattern(tokens: string[]): string | null {
  const hasRiz = tokens.includes('riz');
  const hasSaute = tokens.includes('saute') || tokens.includes('sauté');
  if (hasRiz && hasSaute) return 'riz-saute';
  if (tokens.includes('curry')) return 'curry';
  if (tokens.includes('bowl')) return 'bowl';
  return null;
}