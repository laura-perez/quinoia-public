/**
 * Recipe Repository
 * Handles all database operations for the recipe table
 */

import { getServiceClient } from '../client';
import { createLogger } from '@/lib/logger';
import { TABLE_NAMES } from '../constants';
import type { Recipe } from '@/types/recipes';

const logger = createLogger();

export interface RecipeFilters {
  diet: string;
  status?: string;
  maxPrepTime?: number;
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  excludeRecipeIds?: string[];
}

/**
 * Get allowed diets for a user's diet type
 */
function getAllowedDiets(userDiet: string): string[] {
  const dietHierarchy: Record<string, string[]> = {
    'omnivore': ['omnivore', 'flexitarian', 'vegetarian'],
    'flexitarian': ['flexitarian', 'vegetarian', 'vegan'],
    'vegetarian': ['vegetarian', 'vegan'],
    'vegan': ['vegan']
  };
  
  return dietHierarchy[userDiet] || [userDiet];
}

/**
 * Get filtered recipes based on selection criteria
 */
export async function getFilteredRecipes(filters: RecipeFilters): Promise<Recipe[]> {
  const supabase = getServiceClient();
  
  // Get allowed diets based on user's diet preference
  const allowedDiets = getAllowedDiets(filters.diet);
  
  let query = supabase
    .from(TABLE_NAMES.RECIPES)
    .select('*')
    .eq('status', filters.status || 'active')
    .in('diet', allowedDiets);
    
  // Apply nutritional filters
  if (filters.maxPrepTime) {
    query = query.lte('prepTimeMinutes', filters.maxPrepTime);
  }
  
  if (filters.minCalories) {
    query = query.gte('caloriesPerServing', filters.minCalories);
  }
  
  if (filters.maxCalories) {
    query = query.lte('caloriesPerServing', filters.maxCalories);
  }
  
  if (filters.minProtein) {
    query = query.gte('proteinGPerServing', filters.minProtein);
  }
  
  // Exclude specific recipes (for recency filtering)
  if (filters.excludeRecipeIds && filters.excludeRecipeIds.length > 0) {
    query = query.not('id', 'in', `(${filters.excludeRecipeIds.join(',')})`);
  }
  
  const { data: recipes, error } = await query;
  
  if (error) {
    logger.error('Failed to fetch filtered recipes', { error, filters });
    throw new Error('Recipe query failed');
  }
  
  return recipes || [];
}

/**
 * Get recipe by ID
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.RECIPES)
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    logger.error('Failed to fetch recipe by ID', { error, id });
    return null;
  }
  
  return data;
}

/**
 * Get recipes by IDs (batch fetch)
 */
export async function getRecipesByIds(ids: string[]): Promise<Recipe[]> {
  if (ids.length === 0) return [];
  
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.RECIPES)
    .select('*')
    .in('id', ids);
    
  if (error) {
    logger.error('Failed to fetch recipes by IDs', { error, ids });
    return [];
  }
  
  return data || [];
}

/**
 * Get all recipes for a specific diet type (includes compatible diets)
 */
export async function getRecipesByDiet(
  diet: string, 
  status: string = 'active'
): Promise<Recipe[]> {
  const supabase = getServiceClient();
  
  const allowedDiets = getAllowedDiets(diet);
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.RECIPES)
    .select('*')
    .in('diet', allowedDiets)
    .eq('status', status)
    .order('createdAt', { ascending: false });

  if (error) {
    logger.error('Failed to fetch recipes by diet', { error, diet });
    return [];
  }
  
  return data || [];
}

/**
 * Search recipes by text (title, tags, ingredients)
 */
export async function searchRecipes(
  searchTerm: string,
  diet?: string,
  limit?: number
): Promise<Recipe[]> {
  const supabase = getServiceClient();
  
  let query = supabase
    .from(TABLE_NAMES.RECIPES)
    .select('*')
    .eq('status', 'active');
    
  if (diet) {
    query = query.eq('diet', diet);
  }
  
  // Simple text search in title (can be enhanced with full-text search later)
  query = query.ilike('titleFr', `%${searchTerm}%`);
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    logger.error('Failed to search recipes', { error, searchTerm, diet });
    return [];
  }
  
  return data || [];
}

/**
 * Get recipe count by diet
 */
export async function getRecipeCountByDiet(): Promise<Record<string, number>> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.RECIPES)
    .select('diet')
    .eq('status', 'active');
    
  if (error) {
    logger.error('Failed to get recipe count by diet', { error });
    return {};
  }
  
  const counts: Record<string, number> = {};
  data.forEach(recipe => {
    counts[recipe.diet] = (counts[recipe.diet] || 0) + 1;
  });
  
  return counts;
}