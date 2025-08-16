/**
 * Tests unitaires pour la construction du payload n8n
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildN8nPayload } from '@/lib/business/buildN8nPayload'
import type { NormalizedInput } from '@/schemas/normalizedInput.schema'
import { CONTRACT_VERSION } from '@/config/contracts'
import { getUserRecencyFromView } from '@/lib/supabase/recency'

// Mock des fonctions business
vi.mock('@/lib/business/activityFactor', () => ({
  computeActivityFactor: vi.fn(() => 1.42)
}))

vi.mock('@/lib/business/targets', () => ({
  computeTargets: vi.fn(() => ({
    formula: 'Mifflin-St Jeor',
    bmr: 1359,
    activityFactor: 1.42,
    tdee: 1930,
    dailyEnergyTarget: 1641,
    mealShare: 0.35,
    mealEnergyTarget: 574,
    tolerancePct: 0.10,
    mealEnergyMin: 516,
    mealEnergyMax: 632,
    proteinFloor: 40
  }))
}))

vi.mock('@/lib/business/windowCalculation', () => ({
  computeWindow: vi.fn(() => ({
    mealMinKcal: 516,
    mealMaxKcal: 632,
    mealTargetKcal: 574,
    proteinFloorG: 40
  }))
}))

// Mock des fonctions Supabase
vi.mock('@/lib/supabase/recency', () => ({
  getUserRecencyFromView: vi.fn()
}))

// Mock pour crypto.randomUUID avec importOriginal et UUID valide
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  return {
    ...actual,
    randomUUID: vi.fn(() => 'f47ac10b-58cc-4372-a567-0e02b2c3d479') // UUID v4 valide
  }
})

// Mock pour empêcher l'erreur window côté serveur dans recency
Object.defineProperty(global, 'window', {
  value: undefined,
  writable: true
})

// Données de test normalisées
const mockNormalizedInput: NormalizedInput = {
  email: 'test@example.com',
  firstName: 'Marie',
  age: 32,
  gender: 'female',
  heightCm: 165,
  weightKg: 65,
  diet: 'omnivore',
  proteinPreferences: ['Poultry', 'Fish', 'Eggs'],
  equipmentAvailable: ['Oven', 'Blender'],
  cookingLevel: 'intermediate',
  numRecipes: 4,
  numServings: 2,
  favoriteFoods: 'pasta, salads',
  dislikedFoods: 'spicy food',
  batchMode: true,
  primaryGoal: 'weightLoss',
  secondaryFocus: 'highProtein',
  activity: {
    deskJob: true,
    dailySteps: '5-8k',
    sessionsPerWeek: '3-4',
    highIntensity: false
  },
  allergiesText: undefined,
  allergens: ['Gluten'],
  locale: 'fr-FR',
  unitSystem: 'metric',
  consent: true
}

describe('Construction payload n8n - Tests unitaires', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock de Date.now pour des tests déterministes
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-08-15T12:00:00Z'))

    // Configuration par défaut du mock récence - format de la nouvelle fonction
    vi.mocked(getUserRecencyFromView).mockResolvedValue({
      excludeRecipeIds: ['recipe_excluded1', 'recipe_excluded2'],
      recentStrict: ['recipe1', 'recipe2'],
      recentSoft: ['recipe3']
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('buildN8nPayload', () => {
    it('devrait construire un payload complet avec utilisateur', async () => {
      const result = await buildN8nPayload(mockNormalizedInput, 'user123', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')

      // Vérification de la structure générale
      expect(result).toHaveProperty('profile')
      expect(result).toHaveProperty('window')
      expect(result).toHaveProperty('policy')
      expect(result).toHaveProperty('targets')
      expect(result).toHaveProperty('recency')
      expect(result).toHaveProperty('trace')

      // Profile (données non-PII du formulaire)
      expect(result.profile).toEqual({
        diet: 'omnivore',
        equipmentAvailable: ['Oven', 'Blender'],
        cookingLevel: 'intermediate',
        proteinPreferences: ['Poultry', 'Fish', 'Eggs'],
        favoriteFoods: 'pasta, salads',
        dislikedFoods: 'spicy food',
        batchMode: true,
        numRecipes: 4,
        numServings: 2
      })

      // Window (calculs fenêtre énergétique)
      expect(result.window).toEqual({
        mealMinKcal: 516,
        mealMaxKcal: 632,
        mealTargetKcal: 574,
        proteinFloorG: 40
      })

      // Policy (paramètres de sélection)
      expect(result.policy).toEqual({
        primaryGoal: 'weightLoss',
        secondaryFocus: 'highProtein',
        mealShare: 0.35,
        tolerancePct: 0.10 // weightLoss = 10%
      })

      // Targets (objectifs calculés)
      expect(result.targets).toEqual({
        bmrKcal: 1359,
        activityFactor: 1.42,
        tdeeKcal: 1930,
        dailyTargetKcal: 1641
      })

      // Recency (listes temporelles)
      expect(result.recency.excludeRecipeIds).toEqual(['recipe_excluded1', 'recipe_excluded2'])
      expect(result.recency.recentStrict).toEqual(['recipe1', 'recipe2']) // ≤14j
      expect(result.recency.recentSoft).toEqual(['recipe3']) // 14-21j

      // Trace (traçabilité) - UUID valide fourni
      expect(result.trace.runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      expect(result.trace.submissionId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479')
      expect(result.trace.contractVersion).toBe(CONTRACT_VERSION)
    })

    it('devrait construire un payload sans utilisateur', async () => {
      // Mock pour payload sans données utilisateur
      vi.mocked(getUserRecencyFromView).mockResolvedValue({
        excludeRecipeIds: [],
        recentStrict: [],
        recentSoft: []
      })

      const result = await buildN8nPayload(mockNormalizedInput)

      // Récence vide sans utilisateur
      expect(result.recency.excludeRecipeIds).toEqual([])
      expect(result.recency.recentStrict).toEqual([])
      expect(result.recency.recentSoft).toEqual([])

      // Génération auto des IDs de trace - doit être un UUID valide
      expect(result.trace.runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      expect(result.trace.submissionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      expect(result.trace.contractVersion).toBe(CONTRACT_VERSION)
    })

    it('devrait adapter la tolérance selon l\'objectif', async () => {
      // Test avec eatHealthier (15% tolerance)
      const inputHealthier: NormalizedInput = {
        ...mockNormalizedInput,
        primaryGoal: 'eatHealthier'
      }

      const result = await buildN8nPayload(inputHealthier)

      expect(result.policy.tolerancePct).toBe(0.15) // eatHealthier = 15%
      expect(result.policy.primaryGoal).toBe('eatHealthier')
    })

    it('devrait gérer secondaryFocus null', async () => {
      const inputNoSecondary: NormalizedInput = {
        ...mockNormalizedInput,
        secondaryFocus: null
      }

      const result = await buildN8nPayload(inputNoSecondary)

      expect(result.policy.secondaryFocus).toBeNull()
    })

    it('devrait séparer correctement les recettes par fenêtre temporelle', async () => {
      // Mock avec dates spécifiques pour tester les seuils - avec la nouvelle structure
      vi.mocked(getUserRecencyFromView).mockResolvedValue({
        excludeRecipeIds: ['recipe_21d', 'recipe_15d'], // <= 21 jours
        recentStrict: ['recent_5d', 'recent_14d'],      // <= 14 jours
        recentSoft: ['recent_15d', 'recent_21d']        // 14-21 jours
      })

      const result = await buildN8nPayload(mockNormalizedInput, 'user123')

      expect(result.recency.recentStrict).toEqual(['recent_5d', 'recent_14d'])
      expect(result.recency.recentSoft).toEqual(['recent_15d', 'recent_21d'])
      expect(result.recency.excludeRecipeIds).toEqual(['recipe_21d', 'recipe_15d'])
    })

    it('devrait valider le payload final contre le schema Zod', async () => {
      const result = await buildN8nPayload(mockNormalizedInput, 'user123')

      // Le fait que la fonction retourne sans erreur prouve la validation réussie
      expect(result).toBeDefined()
      
      // Vérification des types requis par le schema
      expect(typeof result.profile.diet).toBe('string')
      expect(Array.isArray(result.profile.equipmentAvailable)).toBe(true)
      expect(typeof result.window.mealMinKcal).toBe('number')
      expect(typeof result.policy.primaryGoal).toBe('string')
      expect(typeof result.targets.bmrKcal).toBe('number')
      expect(Array.isArray(result.recency.excludeRecipeIds)).toBe(true)
      expect(typeof result.trace.runId).toBe('string')
    })

    it('devrait lancer une erreur si le payload est invalide', async () => {
      // Mock qui retourne des données invalides
      vi.mocked(vi.mocked(await import('@/lib/business/windowCalculation')).computeWindow)
        .mockReturnValue({
          mealMinKcal: -100, // Invalide : négatif
          mealMaxKcal: 500,
          mealTargetKcal: 400,
          proteinFloorG: 30
        })

      await expect(buildN8nPayload(mockNormalizedInput, 'user123'))
        .rejects
        .toThrow(/Payload n8n validation failed/)
    })
  })
})
