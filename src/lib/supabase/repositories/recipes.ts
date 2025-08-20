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
 * Get filtered recipes based on selection criteria
 */
export async function getFilteredRecipes(filters: RecipeFilters): Promise<Recipe[]> {
  const supabase = getServiceClient();
  
  let query = supabase
    .from(TABLE_NAMES.RECIPES)
    .select('*')
    .eq('status', filters.status || 'active')
    .eq('diet', filters.diet);
    
  // Apply nutritional filters
  if (filters.maxPrepTime) {
    query = query.lte('prep_time_minutes', filters.maxPrepTime);
  }
  
  if (filters.minCalories) {
    query = query.gte('calories_per_serving', filters.minCalories);
  }
  
  if (filters.maxCalories) {
    query = query.lte('calories_per_serving', filters.maxCalories);
  }
  
  if (filters.minProtein) {
    query = query.gte('protein_g_per_serving', filters.minProtein);
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
 * Get all recipes for a specific diet type
 */
export async function getRecipesByDiet(
  diet: string, 
  status: string = 'active'
): Promise<Recipe[]> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.RECIPES)
    .select('*')
    .eq('diet', diet)
    .eq('status', status)
    .order('created_at', { ascending: false });
    
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
  query = query.ilike('title_fr', `%${searchTerm}%`);
  
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