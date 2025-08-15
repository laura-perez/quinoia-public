/**
 * Types pour la récence et l'exclusion de recettes
 * Conforme aux specs MVP v1.1 section 5.3
 */

export interface RecentRecipe {
  recipeId: string
  consumedAt: Date
}

export interface ExclusionLists {
  excludedIngredients: string[]
  excludedRecipes: string[]
}

export interface RecencyAndExclusion {
  recentRecipes: RecentRecipe[]
  exclusionLists: ExclusionLists
}
