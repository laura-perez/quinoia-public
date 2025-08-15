/**
 * Construction du payload complet API→n8n
 * Conforme aux specs MVP v1.1 section 6
 */

import { z } from 'zod'
import { computeActivityFactor, computeTargets, computeWindow } from './index'
import { getRecencyAndExclusion } from '@/lib/supabase/recency'
import { apiToN8nPayloadSchema } from '@/schemas/apiToN8nPayload.schema'
import type { NormalizedInput } from '@/schemas/normalizedInput.schema'
import { CONTRACT_VERSION } from '@/config/contracts'
import { randomUUID } from 'crypto'

// Type pour le payload final
export type ApiToN8nPayload = z.infer<typeof apiToN8nPayloadSchema>

/**
 * Construit le payload complet pour l'API n8n
 * @param normalizedInput - Données normalisées du formulaire utilisateur
 * @param userId - ID utilisateur pour récupérer récence/exclusion (optionnel)
 * @param submissionId - ID de soumission pour traçabilité (optionnel)
 * @returns Payload non-PII conforme au schema
 */
export async function buildN8nPayload(
  normalizedInput: NormalizedInput,
  userId?: string,
  submissionId?: string
): Promise<ApiToN8nPayload> {
  
  // 1. Calcul du facteur d'activité
  const activityFactor = computeActivityFactor(normalizedInput.activity)
  
  // 2. Calcul des targets énergétiques/protéiques
  const targets = computeTargets(normalizedInput, activityFactor)
  
  // 3. Calcul de la fenêtre énergétique du repas
  const window = computeWindow(
    targets.dailyEnergyTarget,
    normalizedInput.primaryGoal,
    normalizedInput.secondaryFocus
  )
  
  // 4. Récupération des listes récence/exclusion (parallèle)
  const { recentRecipes, exclusionLists } = await getRecencyAndExclusion(userId)
  
  // 5. Séparation des recettes récentes par fenêtre temporelle
  const now = new Date()
  const strictCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) // 14 jours
  const softCutoff = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000) // 21 jours
  
  const recentStrict = recentRecipes
    .filter(r => r.consumedAt >= strictCutoff)
    .map(r => r.recipeId)
  
  const recentSoft = recentRecipes
    .filter(r => r.consumedAt >= softCutoff && r.consumedAt < strictCutoff)
    .map(r => r.recipeId)
  
  // 6. Assemblage du payload final
  const payload: ApiToN8nPayload = {
    profile: {
      diet: normalizedInput.diet,
      equipmentAvailable: normalizedInput.equipmentAvailable,
      cookingLevel: normalizedInput.cookingLevel,
      proteinPreferences: normalizedInput.proteinPreferences,
      favoriteFoods: normalizedInput.favoriteFoods,
      dislikedFoods: normalizedInput.dislikedFoods,
      batchMode: normalizedInput.batchMode,
      numRecipes: normalizedInput.numRecipes,
      numServings: normalizedInput.numServings
    },
    
    window: {
      mealMinKcal: window.mealMinKcal,
      mealMaxKcal: window.mealMaxKcal,
      mealTargetKcal: window.mealTargetKcal,
      proteinFloorG: window.proteinFloorG
    },
    
    policy: {
      primaryGoal: normalizedInput.primaryGoal,
      secondaryFocus: normalizedInput.secondaryFocus,
      mealShare: 0.35, // MEAL_SHARE constant
      tolerancePct: normalizedInput.primaryGoal === 'weightLoss' ? 0.10 : 0.15
    },
    
    targets: {
      bmrKcal: targets.bmr,
      activityFactor: Math.round(activityFactor * 100) / 100, // 2 décimales
      tdeeKcal: targets.tdee,
      dailyTargetKcal: targets.dailyEnergyTarget
    },
    
    recency: {
      excludeRecipeIds: exclusionLists.excludedRecipes,
      recentStrict,
      recentSoft
    },
    
    trace: {
      runId: randomUUID(),
      submissionId: submissionId || randomUUID(),
      contractVersion: CONTRACT_VERSION
    }
  }
  
  // 7. Validation finale du payload contre le schema
  try {
    return apiToN8nPayloadSchema.parse(payload)
  } catch (error) {
    console.error('Erreur validation payload n8n:', error)
    throw new Error(`Payload invalide: ${error instanceof z.ZodError ? error.issues.map(i => i.message).join(', ') : 'erreur inconnue'}`)
  }
}
