import { z } from 'zod';

// Recipe types matching database schema
export const RecipeSchema = z.object({
  id: z.string(),
  title_fr: z.string(),
  slug: z.string(),
  servings_base: z.number().min(1).max(8),
  prep_time_minutes: z.number().max(30),
  
  // Nutrition
  calories_per_serving: z.number(),
  protein_g_per_serving: z.number(),
  carbs_g_per_serving: z.number(),
  fat_g_per_serving: z.number(),
  
  // Classification
  diet: z.enum(['omnivore', 'flexitarian', 'vegetarian', 'vegan']),
  protein_category: z.enum(['Beef', 'Poultry', 'Fish', 'Eggs', 'Dairy', 'Tofu', 'Legumes', 'Meat alternatives']),
  cooking_level: z.enum(['beginner', 'intermediate', 'advanced']),
  
  // Equipment and features
  equipment_required: z.array(z.string()),
  batch_friendly: z.boolean(),
  
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
  cuisine_type: z.string().optional(),
  image_filename: z.string().optional(),
  
  // Quality
  cooking_tip: z.string().optional(),
  gpt_auto_evaluation: z.record(z.string(), z.unknown()).optional(),
  
  status: z.enum(['active', 'draft', 'archived']).default('active')
});

export type Recipe = z.infer<typeof RecipeSchema>;

// Selection context from user submission
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
  
  // Nutritional targets
  mealTargetKcal: number;
  mealMinKcal: number;
  mealMaxKcal: number;
  proteinFloorG: number;
  primaryGoal: string;
  
  // User history
  userId: string;
}

// Recipe with scoring
export interface ScoredRecipe extends Recipe {
  score: number;
  scoreBreakdown: {
    proteinCategoryMatch: number;
    proteinDensity: number;
    calorieProximity: number;
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
    avgCalories: number;
    avgProtein: number;
    totalCalories: number;
    totalProtein: number;
  };
}