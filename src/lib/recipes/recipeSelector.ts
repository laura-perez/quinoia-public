import { createLogger } from '@/lib/logger';
import { getFilteredRecipes } from '@/lib/supabase/repositories/recipes';
import { getUserRecencyFromView } from '@/lib/supabase/recency';
import { mapValue, equipmentMap } from '@/schemas/mappers';
import type { Recipe, SelectionContext, ScoredRecipe, RecipeSelectionResult } from '@/types/recipes';
// Using recency view now instead of userRecipeHistory direct table reads
interface RecencyViewData {
  excludeRecipeIds: string[];
  recentStrict: string[]; // recipes to hard-exclude (≤14/15 days)
  recentSoft: string[];   // recipes to soft-penalize (15-21 days)
}

const logger = createLogger();

/**
 * Main recipe selection algorithm implementing the scoring system
 *
 * Scoring breakdown (6 components):
 * - Protein preferences: +1 per matching preferred protein category
 * - Protein density: +0.8 × (protein_g / 100_kcal)
 * - Batch cooking: +0.5 if both user wants and recipe supports
 * - Favorite foods: +1 per match
 * - Disliked foods: -3 per match
 * - Recent recipes: -1.5 penalty for 14-21 day recipes
 */
export async function selectRecipes(
  context: SelectionContext,
  alertParams?: { userEmail: string; submissionId: string }
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

  // 2. Apply remaining filters (now in-memory but much faster)
  const filteredRecipes = applyRemainingFilters(baseRecipes, context, recency);
  
  if (filteredRecipes.length < context.numRecipes) {
    logger.error('Insufficient recipes after hard filtering', {
      available: filteredRecipes.length,
      requested: context.numRecipes,
      userId: context.userId,
      diet: context.diet,
      proteinPreferences: context.proteinPreferences,
      proteinFloorG: context.proteinFloorG
    });

    // Send alert email to admin (non-blocking)
    if (alertParams) {
      try {
        const { sendInsufficientRecipesAlert } = await import('@/lib/email');
        await sendInsufficientRecipesAlert({
          context,
          availableCount: filteredRecipes.length,
          requestedCount: context.numRecipes,
          userEmail: alertParams.userEmail,
          submissionId: alertParams.submissionId
        });
        logger.info('Insufficient recipes alert sent', {
          userId: context.userId,
          submissionId: alertParams.submissionId
        });
      } catch (emailError) {
        logger.error('Failed to send insufficient recipes alert', {
          userId: context.userId,
          submissionId: alertParams.submissionId,
          error: emailError
        });
      }
    }

    throw new Error(`Recipe selection aborted: only ${filteredRecipes.length} recipes available (< ${context.numRecipes} required)`);
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
  recency: RecencyViewData
): Promise<Recipe[]> {
  // Get recipes using repository
  const recipes = await getFilteredRecipes({
    diet: context.diet,
    status: 'active',
    maxPrepTime: 30,
    minProtein: context.proteinFloorG,
    // Exclude union of strict recent list + explicit exclusion list (deduped)
    excludeRecipeIds: Array.from(new Set([...(recency.recentStrict || []), ...(recency.excludeRecipeIds || [])]))
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
 * Apply remaining filters after parallel query execution
 * This combines the recency filtering with equipment/skill/protein filtering
 */
function applyRemainingFilters(
  baseRecipes: Recipe[],
  context: SelectionContext,
  recency: RecencyViewData
): Recipe[] {
  // First, filter out recipes that should be excluded based on recency
  const excludeIds = new Set([
    ...(recency.recentStrict || []),
    ...(recency.excludeRecipeIds || [])
  ]);

  const recipesAfterRecencyFilter = baseRecipes.filter(recipe =>
    !excludeIds.has(recipe.id)
  );

  // Then apply the remaining filters (equipment, skill level, protein preferences)
  // Optimize with Set for O(1) lookups instead of O(n) includes()
  const BASE_EQUIPMENT = ["Pan", "Pot"];
  const userEquipmentSet = new Set([...BASE_EQUIPMENT, ...context.equipmentAvailable]);
  const proteinPreferencesSet = new Set(context.proteinPreferences);
  const hasProteinPreferences = context.proteinPreferences.length > 0;
  const levelOrder: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const userSkillLevel = levelOrder[context.cookingLevel];

  return recipesAfterRecencyFilter.filter(recipe => {
    // Equipment check: translate French equipment to English and compare
    const hasRequiredEquipment = recipe.equipmentRequired.every(
      (eq: string) => {
        const mappedEquipment = mapValue(equipmentMap, eq) || eq;
        return userEquipmentSet.has(mappedEquipment);
      }
    );

    // Cooking level check (pre-computed)
    const hasSkillLevel = levelOrder[recipe.cookingLevel] <= userSkillLevel;

    // Protein category check: O(1) Set lookup
    // If no preferences specified, allow all proteins
    const isPreferredProtein = !hasProteinPreferences || proteinPreferencesSet.has(recipe.proteinCategory);

    return hasRequiredEquipment && hasSkillLevel && isPreferredProtein;
  });
}

/**
 * Score recipes using the deterministic algorithm from SPECS
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
      recencyPenalty: 0
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
    
    // 6. Recency penalty for soft recent recipes (-1.5)
  if (recency.recentSoft.includes(recipe.id)) {
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