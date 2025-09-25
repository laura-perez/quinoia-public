import { z } from 'zod';

// Recipe types matching database schema
export const RecipeSchema = z.object({
  id: z.string(),
  titleFr: z.string(),
  slug: z.string(),
  servingsBase: z.number().min(1).max(8),
  prepTimeMinutes: z.number().max(30),
  
  // Nutrition
  caloriesPerServing: z.number(),
  proteinGPerServing: z.number(),
  carbsGPerServing: z.number(),
  fatGPerServing: z.number(),
  
  // Classification
  diet: z.enum(['omnivore', 'flexitarian', 'vegetarian', 'vegan']),
  proteinCategory: z.enum(['Beef', 'Poultry', 'Fish', 'Eggs', 'Dairy', 'Tofu', 'Legumes', 'Meat alternatives']),
  cookingLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  
  // Equipment and features
  equipmentRequired: z.array(z.string()),
  batchFriendly: z.boolean(),
  
  // Content
  ingredients: z.array(z.object({
    nom: z.string(),
    quantite: z.number().optional(),
    unite: z.string().optional(),
    section: z.string().optional()
  })),
  instructions: z.array(z.string()),
  
  // Recipe metadata
  tags: z.array(z.string()).default([]),
  cuisineType: z.string().optional(),
  imageFilename: z.string().optional(),
  
  // Quality
  cookingTip: z.string().optional(),
  gptAutoEvaluation: z.record(z.string(), z.unknown()).optional(),
  
  status: z.enum(['active', 'draft', 'archived']).default('active')
});

export type Recipe = z.infer<typeof RecipeSchema>;

// Selection context from user submission (simplified)
export interface SelectionContext {
  // User profile
  diet: string;
  proteinPreferences: string[];
  equipmentAvailable: string[];
  cookingLevel: string;
  numRecipes: number;
  numServings: number;
  batchMode?: boolean;

  // Preferences
  favoriteFoods?: string;
  dislikedFoods?: string;

  // Nutritional targets (protein only)
  proteinFloorG: number;
  primaryGoal: string;

  // User history
  userId: string;
}

// Recipe with scoring (6 components)
export interface ScoredRecipe extends Recipe {
  score: number;
  scoreBreakdown: {
    proteinPreferenceBonus: number;
    proteinDensity: number;
    batchBonus: number;
    favoriteBonus: number;
    dislikedPenalty: number;
    recencyPenalty: number;
  };
}

// Selection result
export interface RecipeSelectionResult {
  selectedRecipes: Recipe[];
  scoringDetails: {
    totalFiltered: number;
    totalScored: number;
    diversityStrategy: string;
    fallbacksUsed: string[];
  };
  nutritionSummary: {
    avgProtein: number;
    totalProtein: number;
  };
}