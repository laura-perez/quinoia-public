/**
 * Types for recipe recency and exclusion
 * Updated for v2.0 - main types moved to repositories
 */

// Re-export from repository for backward compatibility
export type { UserRecipeHistory, RecentRecipesSplit } from '@/lib/supabase/repositories/userRecipeHistory';

export interface RecentRecipe {
  recipeId: string;
  consumedAt: Date;
}

export interface ExclusionLists {
  excludedIngredients: string[];
  excludedRecipes: string[];
}

export interface RecencyAndExclusion {
  recentRecipes: RecentRecipe[];
  exclusionLists: ExclusionLists;
}
