/**
 * User Recipe History Repository
 * Handles all database operations for the userRecipeHistory table
 */

import { getServiceClient } from '../client';
import { createLogger } from '@/lib/logger';
import { TABLE_NAMES } from '../constants';

export interface UserRecipeHistory {
  id: string;
  userId: string;
  recipeId: string;
  menuResultId?: string;
  consumedAt: Date;
  servingCount: number;
  userRating?: number;
  createdAt: Date;
}

const logger = createLogger();

export interface RecentRecipesFilter {
  userId: string;
  daysPeriod: number;
}

export interface RecentRecipesSplit {
  strict: string[];  // Recipe IDs consumed within 14 days
  soft: string[];    // Recipe IDs consumed 15-21 days ago
}

/**
 * Get user's recent recipe consumption for recency filtering
 */
export async function getUserRecentRecipes(
  userId: string,
  daysPeriod: number = 21
): Promise<RecentRecipesSplit> {
  const supabase = getServiceClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysPeriod);
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.USER_RECIPE_HISTORY)
    .select('recipeId, consumedAt')
    .eq('userId', userId)
    .gte('consumedAt', cutoffDate.toISOString())
    .order('consumedAt', { ascending: false });
    
  if (error) {
    logger.error('Failed to fetch user recent recipes', { error, userId });
    return { strict: [], soft: [] };
  }

  if (!data) {
    return { strict: [], soft: [] };
  }
  
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  const strict = data
    .filter(r => new Date(r.consumedAt) > fourteenDaysAgo)
    .map(r => r.recipeId);
    
  const soft = data
    .filter(r => new Date(r.consumedAt) <= fourteenDaysAgo)
    .map(r => r.recipeId);
  
  return { strict, soft };
}

/**
 * Add a recipe consumption record
 */
export async function addRecipeConsumption(
  userId: string,
  recipeId: string,
  menuResultId?: string,
  servingCount: number = 1
): Promise<UserRecipeHistory | null> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.USER_RECIPE_HISTORY)
    .insert({
      userId,
      recipeId,
      menuResultId,
      servingCount,
      consumedAt: new Date().toISOString()
    })
    .select()
    .single();
    
  if (error) {
    logger.error('Failed to add recipe consumption', { error, userId, recipeId });
    return null;
  }
  
  return data;
}

/**
 * Get user's recipe history with ratings
 */
export async function getUserRecipeHistory(
  userId: string,
  limit?: number
): Promise<UserRecipeHistory[]> {
  const supabase = getServiceClient();
  
  let query = supabase
    .from(TABLE_NAMES.USER_RECIPE_HISTORY)
    .select('*')
    .eq('userId', userId)
    .order('consumedAt', { ascending: false });
    
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    logger.error('Failed to fetch user recipe history', { error, userId });
    return [];
  }
  
  return data || [];
}

/**
 * Update user rating for a recipe
 */
export async function updateRecipeRating(
  historyId: string,
  rating: number
): Promise<boolean> {
  const supabase = getServiceClient();
  
  const { error } = await supabase
    .from(TABLE_NAMES.USER_RECIPE_HISTORY)
    .update({ userRating: rating })
    .eq('id', historyId);
    
  if (error) {
    logger.error('Failed to update recipe rating', { error, historyId, rating });
    return false;
  }
  
  return true;
}