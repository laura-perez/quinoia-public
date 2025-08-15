/**
 * Test d'intégration pour le pipeline complet submit API → buildN8nPayload → n8n
 * Vérifie que notre nouvelle intégration de buildN8nPayload fonctionne dans le context réel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextApiRequest, NextApiResponse } from 'next'
import { buildN8nPayload } from '@/lib/business/buildN8nPayload'
import { apiToN8nPayloadSchema } from '@/schemas/apiToN8nPayload.schema'
import type { NormalizedInput } from '@/schemas/normalizedInput.schema'

// Mock des fonctions externes
vi.mock('@/lib/supabase/recency', () => ({
  getUserRecencyFromView: vi.fn().mockImplementation((userId) => {
    if (!userId) {
      // Sans userId, retourner des listes vides
      return Promise.resolve({
        excludeRecipeIds: [],
        recentStrict: [],
        recentSoft: []
      })
    }
    
    // Avec userId, retourner des données de test conformes à la vue SQL
    return Promise.resolve({
      excludeRecipeIds: ['excluded_recipe_1', 'excluded_recipe_2'],
      recentStrict: ['recipe_1'], // <= 14 jours (10 jours dans le mock)
      recentSoft: ['recipe_2']    // 14-21 jours (16 jours dans le mock)
    })
  })
}))

vi.mock('@/lib/business', () => ({
  computeActivityFactor: vi.fn().mockReturnValue(1.42),
  computeTargets: vi.fn().mockReturnValue({
    bmr: 1359,
    tdee: 1930,
    dailyEnergyTarget: 1641
  }),
  computeWindow: vi.fn().mockReturnValue({
    mealMinKcal: 516,
    mealMaxKcal: 632,
    mealTargetKcal: 574,
    proteinFloorG: 40
  })
}))

describe('Pipeline complet Submit API → buildN8nPayload → n8n', () => {
  
  const mockNormalizedInput: NormalizedInput = {
    email: 'test@example.com',
    age: 28,
    gender: 'female',
    heightCm: 165,
    weightKg: 58,
    activity: {
      deskJob: true,
      dailySteps: '5-8k',
      sessionsPerWeek: '1-2',
      highIntensity: false
    },
    diet: 'omnivore',
    equipmentAvailable: ['Oven', 'Blender'],
    cookingLevel: 'intermediate',
    proteinPreferences: ['Poultry', 'Fish'],
    allergens: [],
    favoriteFoods: 'Italian cuisine, grilled vegetables',
    dislikedFoods: 'Spicy food, raw fish',
    primaryGoal: 'eatHealthier',
    secondaryFocus: 'highProtein',
    numRecipes: 5,
    numServings: 4,
    batchMode: false,
    locale: 'fr-FR',
    unitSystem: 'metric',
    consent: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait construire un payload n8n complet conforme au schema', async () => {
    // Arrange
    const userId = 'user_test_123'
    const submissionId = '550e8400-e29b-41d4-a716-446655440088' // Valid UUID
    
    // Act
    const payload = await buildN8nPayload(mockNormalizedInput, userId, submissionId)
    
    // Assert - Vérification du schéma Zod
    expect(() => apiToN8nPayloadSchema.parse(payload)).not.toThrow()
    
    // Assert - Structure du payload
    expect(payload).toMatchObject({
      profile: {
        diet: 'omnivore',
        equipmentAvailable: ['Oven', 'Blender'],
        cookingLevel: 'intermediate',
        proteinPreferences: ['Poultry', 'Fish'],
        favoriteFoods: 'Italian cuisine, grilled vegetables',
        dislikedFoods: 'Spicy food, raw fish',
        batchMode: false,
        numRecipes: 5,
        numServings: 4
      },
      window: {
        mealMinKcal: 516,
        mealMaxKcal: 632,
        mealTargetKcal: 574,
        proteinFloorG: 40
      },
      policy: {
        primaryGoal: 'eatHealthier',
        secondaryFocus: 'highProtein',
        mealShare: 0.35,
        tolerancePct: 0.15 // eatHealthier = 15%
      },
      targets: {
        bmrKcal: 1359,
        activityFactor: 1.42,
        tdeeKcal: 1930,
        dailyTargetKcal: 1641
      },
      recency: {
        excludeRecipeIds: ['excluded_recipe_1', 'excluded_recipe_2'],
        recentStrict: ['recipe_1'], // ≤14 jours
        recentSoft: ['recipe_2']    // 14-21 jours
      },
      trace: {
        runId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
        submissionId: submissionId,
        contractVersion: 'api_to_n8n.v1.1'
      }
    })
  })

  it('devrait gérer le cas sans userId (utilisateur anonyme)', async () => {
    // Act
    const payload = await buildN8nPayload(mockNormalizedInput, undefined, '550e8400-e29b-41d4-a716-446655440077')
    
    // Assert - Doit quand même fonctionner
    expect(() => apiToN8nPayloadSchema.parse(payload)).not.toThrow()
    
    // Assert - Listes vides pour recency sans utilisateur
    expect(payload.recency).toEqual({
      excludeRecipeIds: [],
      recentStrict: [],
      recentSoft: []
    })
  })

  it('devrait adapter la tolérance selon l\'objectif utilisateur', async () => {
    // Test avec objectif perte de poids
    const weightLossInput = {
      ...mockNormalizedInput,
      primaryGoal: 'weightLoss' as const
    }
    
    const payload = await buildN8nPayload(weightLossInput, 'user_123')
    
    expect(payload.policy.tolerancePct).toBe(0.10) // 10% pour perte de poids
  })

  it('devrait générer des UUIDs uniques pour chaque appel', async () => {
    // Act - Deux appels successifs
    const payload1 = await buildN8nPayload(mockNormalizedInput, 'user_1')
    const payload2 = await buildN8nPayload(mockNormalizedInput, 'user_2')
    
    // Assert - UUIDs différents (format valide)
    expect(payload1.trace.runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(payload1.trace.submissionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(payload2.trace.runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(payload2.trace.submissionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    
    // Assert - Tous les IDs sont différents
    expect(payload1.trace.runId).not.toBe(payload2.trace.runId)
    expect(payload1.trace.submissionId).not.toBe(payload2.trace.submissionId)
    expect(payload1.trace.runId).not.toBe(payload1.trace.submissionId)
  })

  it('devrait préserver le submissionId quand fourni explicitement', async () => {
    const explicitSubmissionId = '550e8400-e29b-41d4-a716-446655440099'
    
    const payload = await buildN8nPayload(
      mockNormalizedInput, 
      'user_123', 
      explicitSubmissionId
    )
    
    expect(payload.trace.submissionId).toBe(explicitSubmissionId)
  })
})
