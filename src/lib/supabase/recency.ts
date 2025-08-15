/**
 * Fonctions de récupération des données de récence et exclusion depuis Supabase
 * Conforme aux specs MVP v1.1 section 5.3
 * 
 * IMPORTANT: Module server-only - ne jamais importer côté client
 */

import { getServiceClient } from '@/lib/database/client'
import type { RecentRecipe, ExclusionLists, RecencyAndExclusion } from '@/types/recency'

// Sécurité : empêcher l'import côté client (sauf en tests)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  throw new Error('lib/supabase/recency.ts must never be imported on the client side')
}

/**
 * Interface pour les données de récence depuis la vue userRecency
 */
interface UserRecencyData {
  excludeRecipeIds: string[]
  recentStrict: string[]
  recentSoft: string[]
}

/**
 * Récupère les données de récence depuis la vue SQL userRecency
 * @param userId - ID utilisateur (optionnel)
 * @returns Objet avec les trois listes de recettes ou tableaux vides
 */
export async function getUserRecencyFromView(userId?: string): Promise<UserRecencyData> {
  // Si pas d'utilisateur, retourner tableaux vides
  if (!userId) {
    return {
      excludeRecipeIds: [],
      recentStrict: [],
      recentSoft: []
    }
  }

  try {
    const supabase = getServiceClient()
    
    const { data, error } = await supabase
      .from("userRecency")
      .select('"excludeRecipeIds", "recentStrict", "recentSoft"')
      .eq("userId", userId)
      .maybeSingle()

    if (error) {
      console.error('Erreur récupération userRecency:', error)
      // Fallback gracieux
      return {
        excludeRecipeIds: [],
        recentStrict: [],
        recentSoft: []
      }
    }

    // Si pas de données (nouvel utilisateur), retourner tableaux vides
    if (!data) {
      return {
        excludeRecipeIds: [],
        recentStrict: [],
        recentSoft: []
      }
    }

    // Nettoyer les données (enlever les nulls des array_agg)
    return {
      excludeRecipeIds: (data.excludeRecipeIds || []).filter(Boolean),
      recentStrict: (data.recentStrict || []).filter(Boolean),
      recentSoft: (data.recentSoft || []).filter(Boolean)
    }

  } catch (err) {
    console.error('Erreur getUserRecencyFromView:', err)
    // Fallback gracieux
    return {
      excludeRecipeIds: [],
      recentStrict: [],
      recentSoft: []
    }
  }
}

// Configuration par défaut pour la récence
const DEFAULT_RECENCY_DAYS = 7

/**
 * Récupère les recettes consommées récemment par l'utilisateur
 * @param userId - ID utilisateur (optionnel)
 * @param dayWindow - Nombre de jours à considérer (défaut: 7)
 * @returns Tableau des recettes récentes ou tableau vide si pas d'utilisateur
 */
export async function getRecentRecipes(
  userId?: string,
  dayWindow: number = DEFAULT_RECENCY_DAYS
): Promise<RecentRecipe[]> {
  // Si pas d'utilisateur, retourner tableau vide (fallback gracieux)
  if (!userId) {
    return []
  }

  try {
    const supabase = getServiceClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - dayWindow)

    const { data, error } = await supabase
      .from('user_recipe_consumption')
      .select('recipe_id, consumed_at')
      .eq('user_id', userId)
      .gte('consumed_at', cutoffDate.toISOString())
      .order('consumed_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération récence:', error)
      return [] // Fallback gracieux
    }

    return data?.map(row => ({
      recipeId: row.recipe_id,
      consumedAt: new Date(row.consumed_at)
    })) ?? []

  } catch (error) {
    console.error('Erreur inattendue récupération récence:', error)
    return [] // Fallback gracieux
  }
}

/**
 * Récupère les listes d'exclusion de l'utilisateur  
 * @param userId - ID utilisateur (optionnel)
 * @returns Listes d'exclusion ou listes vides si pas d'utilisateur
 */
export async function getExclusionLists(userId?: string): Promise<ExclusionLists> {
  // Si pas d'utilisateur, retourner listes vides (fallback gracieux)
  if (!userId) {
    return {
      excludedIngredients: [],
      excludedRecipes: []
    }
  }

  try {
    const supabase = getServiceClient()

    // Récupération parallèle des deux listes
    const [ingredientsResult, recipesResult] = await Promise.all([
      supabase
        .from('user_excluded_ingredients')
        .select('ingredient_name')
        .eq('user_id', userId)
        .eq('is_active', true),
      
      supabase
        .from('user_excluded_recipes')
        .select('recipe_id')
        .eq('user_id', userId)
        .eq('is_active', true)
    ])

    const excludedIngredients = ingredientsResult.data?.map(row => row.ingredient_name) ?? []
    const excludedRecipes = recipesResult.data?.map(row => row.recipe_id) ?? []

    if (ingredientsResult.error || recipesResult.error) {
      console.error('Erreur récupération exclusions:', {
        ingredients: ingredientsResult.error,
        recipes: recipesResult.error
      })
      // Fallback gracieux même en cas d'erreur partielle
    }

    return {
      excludedIngredients,
      excludedRecipes
    }

  } catch (error) {
    console.error('Erreur inattendue récupération exclusions:', error)
    return {
      excludedIngredients: [],
      excludedRecipes: []
    }
  }
}

/**
 * Récupère toutes les données de récence et exclusion en une seule fois
 * @param userId - ID utilisateur (optionnel)
 * @param dayWindow - Nombre de jours pour la récence (défaut: 7)
 * @returns Données complètes de récence et exclusion
 */
export async function getRecencyAndExclusion(
  userId?: string,
  dayWindow?: number
): Promise<RecencyAndExclusion> {
  // Exécution parallèle pour optimiser les performances
  const [recentRecipes, exclusionLists] = await Promise.all([
    getRecentRecipes(userId, dayWindow),
    getExclusionLists(userId)
  ])

  return {
    recentRecipes,
    exclusionLists
  }
}
