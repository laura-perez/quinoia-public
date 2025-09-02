/**
 * Database table names as constants
 * This ensures consistency across the application and makes refactoring easier
 */
export const TABLE_NAMES = {
  USERS: 'user',
  SUBMISSIONS: 'submission',
  RECIPES: 'recipe',
  USER_RECIPE_HISTORY: 'userRecipeHistory',
  INGREDIENT_CANONICAL: 'ingredientCanonical',
  INGREDIENT_ALIAS: 'ingredientAlias',
  RECIPE_INGREDIENT: 'recipeIngredient',
} as const;

// Type for table names (useful for generic functions)
export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];
