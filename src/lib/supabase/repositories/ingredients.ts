/**
 * Ingredient Repository
 * Handles all database operations for ingredient-related tables
 */

import { getServiceClient } from '../client';
import { createLogger } from '@/lib/logger';
import { TABLE_NAMES } from '../constants';

const logger = createLogger();

export interface CanonicalIngredientInfo {
  nameFr: string;
  category: string;
  sectionCode: string;
}

/**
 * Get canonical ingredient information by ID
 */
export async function getCanonicalIngredientById(
  canonicalId: string
): Promise<CanonicalIngredientInfo | null> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.INGREDIENT_CANONICAL)
    .select('nameFr, category, sectionCode')
    .eq('id', canonicalId)
    .single();

  if (error) {
    logger.error('Failed to fetch canonical ingredient info', { canonicalId, error });
    return null;
  }

  return data;
}

/**
 * Get multiple canonical ingredients by IDs (batch fetch)
 */
export async function getCanonicalIngredientsByIds(
  canonicalIds: string[]
): Promise<Map<string, CanonicalIngredientInfo>> {
  if (canonicalIds.length === 0) {
    return new Map();
  }

  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.INGREDIENT_CANONICAL)
    .select('id, nameFr, category, sectionCode')
    .in('id', canonicalIds);

  if (error) {
    logger.error('Failed to fetch canonical ingredients in batch', { canonicalIds, error });
    return new Map();
  }

  // Convert to Map for O(1) lookup
  const ingredientMap = new Map<string, CanonicalIngredientInfo>();
  data?.forEach(ingredient => {
    ingredientMap.set(ingredient.id, {
      nameFr: ingredient.nameFr,
      category: ingredient.category,
      sectionCode: ingredient.sectionCode
    });
  });

  return ingredientMap;
}

/**
 * Search canonical ingredients by name
 */
export async function searchCanonicalIngredients(
  searchTerm: string,
  limit: number = 10
): Promise<CanonicalIngredientInfo[]> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAMES.INGREDIENT_CANONICAL)
    .select('nameFr, category, sectionCode')
    .ilike('nameFr', `%${searchTerm}%`)
    .limit(limit);

  if (error) {
    logger.error('Failed to search canonical ingredients', { searchTerm, error });
    return [];
  }

  return data || [];
}

/**
 * Get ingredient count statistics
 */
export async function getIngredientStats(): Promise<{
  totalCanonical: number;
  totalAliases: number;
  byCategory: Record<string, number>;
}> {
  const supabase = getServiceClient();
  
  // Get canonical ingredient count by category
  const { data: canonicalData, error: canonicalError } = await supabase
    .from(TABLE_NAMES.INGREDIENT_CANONICAL)
    .select('category');

  if (canonicalError) {
    logger.error('Failed to fetch canonical ingredient stats', { error: canonicalError });
    return { totalCanonical: 0, totalAliases: 0, byCategory: {} };
  }

  // Get total alias count
  const { count: aliasCount, error: aliasError } = await supabase
    .from(TABLE_NAMES.INGREDIENT_ALIAS)
    .select('*', { count: 'exact', head: true });

  if (aliasError) {
    logger.error('Failed to fetch alias count', { error: aliasError });
  }

  // Calculate category statistics
  const byCategory: Record<string, number> = {};
  canonicalData?.forEach(ingredient => {
    byCategory[ingredient.category] = (byCategory[ingredient.category] || 0) + 1;
  });

  return {
    totalCanonical: canonicalData?.length || 0,
    totalAliases: aliasCount || 0,
    byCategory
  };
}