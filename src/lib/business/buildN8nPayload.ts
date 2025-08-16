/**
 * Construction du payload complet API→n8n
 * Conforme aux specs MVP v1.1 section 6
 */

import { z } from 'zod'
import { computeActivityFactor, computeTargets, computeWindow } from './index'
import { getUserRecencyFromView } from '@/lib/supabase/recency'
import { apiToN8nPayloadSchema } from '@/schemas/apiToN8nPayload.schema'
import type { NormalizedInput } from '@/schemas/normalizedInput.schema'
import { CONTRACT_VERSION } from '@/config/contracts'
import { randomUUID } from 'crypto'
import { createLogger } from '@/lib/logger'
import { roundToPrecision } from '@/lib/constants/ui'
import { logAndThrowError } from '@/lib/utils/errorHandling'

const logger = createLogger()

// Type pour le payload final
export type ApiToN8nPayload = z.infer<typeof apiToN8nPayloadSchema>

/**
 * Calcule les données métaboliques (BMR, TDEE, fenêtre énergétique)
 * 
 * @param normalizedInput - Données utilisateur normalisées
 * @returns Objet contenant facteur d'activité, targets nutritionnels et fenêtre repas
 * 
 * @description
 * Centralise les calculs métaboliques pour éviter la duplication dans buildN8nPayload
 */
function computeMetabolicData(normalizedInput: NormalizedInput) {
  const activityFactor = computeActivityFactor(normalizedInput.activity)
  const targets = computeTargets(normalizedInput, activityFactor)
  const window = computeWindow(
    targets.dailyEnergyTarget,
    normalizedInput.primaryGoal,
    normalizedInput.secondaryFocus
  )
  return { activityFactor, targets, window }
}

/**
 * Construit la section profil du payload
 * 
 * @param normalizedInput - Données utilisateur normalisées
 * @returns Section 'profile' du payload n8n (données non-PII)
 * 
 * @description
 * Exclut volontairement les données PII (nom, email, âge, poids, taille)
 * pour respecter la confidentialité dans les workflows n8n
 */
function buildProfileSection(normalizedInput: NormalizedInput) {
  return {
    diet: normalizedInput.diet,
    equipmentAvailable: normalizedInput.equipmentAvailable,
    cookingLevel: normalizedInput.cookingLevel,
    proteinPreferences: normalizedInput.proteinPreferences,
    favoriteFoods: normalizedInput.favoriteFoods,
    dislikedFoods: normalizedInput.dislikedFoods,
    batchMode: normalizedInput.batchMode,
    numRecipes: normalizedInput.numRecipes,
    numServings: normalizedInput.numServings
  }
}

/**
 * Construit la section politique du payload
 * 
 * @param normalizedInput - Données utilisateur normalisées
 * @returns Section 'policy' avec objectifs et paramètres de calcul
 * 
 * @description
 * Définit les règles de sélection des recettes selon les objectifs utilisateur
 */
function buildPolicySection(normalizedInput: NormalizedInput) {
  return {
    primaryGoal: normalizedInput.primaryGoal,
    secondaryFocus: normalizedInput.secondaryFocus,
    mealShare: 0.35, // MEAL_SHARE constant
    tolerancePct: normalizedInput.primaryGoal === 'weightLoss' ? 0.10 : 0.15
  }
}

/**
 * Valide le payload final contre le schema Zod
 * 
 * @param payload - Payload à valider
 * @returns Payload typé et validé
 * @throws Error si le payload ne respecte pas le schema
 * 
 * @description
 * Validation finale avec logging structuré pour debugging en cas d'échec
 */
function validatePayload(payload: unknown): ApiToN8nPayload {
  try {
    return apiToN8nPayloadSchema.parse(payload)
  } catch (error) {
    const details = error instanceof z.ZodError 
      ? { zodIssues: error.issues.map(i => i.message) }
      : { rawError: String(error) };
    
    logAndThrowError(
      'Payload n8n validation failed',
      error,
      { payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [], ...details }
    );
  }
}

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
  
  // 1. Calculs métaboliques
  const { activityFactor, targets, window } = computeMetabolicData(normalizedInput)
  
  // 2. Récupération données de récence
  const recencyData = await getUserRecencyFromView(userId)
  
  // 3. Assemblage du payload
  const payload = {
    profile: buildProfileSection(normalizedInput),
    window: {
      mealMinKcal: window.mealMinKcal,
      mealMaxKcal: window.mealMaxKcal,
      mealTargetKcal: window.mealTargetKcal,
      proteinFloorG: window.proteinFloorG
    },
    policy: buildPolicySection(normalizedInput),
    targets: {
      bmrKcal: targets.bmr,
      activityFactor: roundToPrecision(activityFactor),
      tdeeKcal: targets.tdee,
      dailyTargetKcal: targets.dailyEnergyTarget
    },
    recency: {
      excludeRecipeIds: recencyData.excludeRecipeIds,
      recentStrict: recencyData.recentStrict,
      recentSoft: recencyData.recentSoft
    },
    trace: {
      runId: randomUUID(),
      submissionId: submissionId || randomUUID(),
      contractVersion: CONTRACT_VERSION
    }
  }
  
  // 4. Validation finale
  return validatePayload(payload)
}
