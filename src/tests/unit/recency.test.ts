/**
 * Tests unitaires pour les fonctions de récence et exclusion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRecentRecipes, getExclusionLists, getRecencyAndExclusion } from '@/lib/supabase/recency'

// Mock de la fonction getServiceClient avec une approche simplifiée
const mockSupabaseClient = {
  from: vi.fn()
}

vi.mock('@/lib/supabase/client', () => ({
  getServiceClient: vi.fn(() => mockSupabaseClient)
}))

// Mock pour empêcher l'erreur window côté serveur
Object.defineProperty(global, 'window', {
  value: undefined,
  writable: true
})

describe('Récence et exclusion - Tests unitaires', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getRecentRecipes', () => {
    it('devrait retourner un tableau vide sans userId', async () => {
      const result = await getRecentRecipes()
      expect(result).toEqual([])
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('devrait retourner un tableau vide avec userId undefined', async () => {
      const result = await getRecentRecipes(undefined, 7)
      expect(result).toEqual([])
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('devrait récupérer les recettes récentes avec succès', async () => {
      const mockData = [
        { recipe_id: 'recipe1', consumed_at: '2024-01-10T12:00:00Z' },
        { recipe_id: 'recipe2', consumed_at: '2024-01-09T10:00:00Z' }
      ]

      // Mock complet de la chaîne Supabase
      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const mockGte = vi.fn().mockReturnValue({ order: mockOrder })
      const mockEq = vi.fn().mockReturnValue({ gte: mockGte })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const result = await getRecentRecipes('user123', 7)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        recipeId: 'recipe1',
        consumedAt: new Date('2024-01-10T12:00:00Z')
      })
      expect(result[1]).toEqual({
        recipeId: 'recipe2',
        consumedAt: new Date('2024-01-09T10:00:00Z')
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_recipe_consumption')
      expect(mockSelect).toHaveBeenCalledWith('recipe_id, consumed_at')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user123')
      expect(mockOrder).toHaveBeenCalledWith('consumed_at', { ascending: false })
    })

    it('devrait gérer les erreurs Supabase gracieusement', async () => {
      const mockError = { message: 'Database connection failed' }
      
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockGte = vi.fn().mockReturnValue({ order: mockOrder })
      const mockEq = vi.fn().mockReturnValue({ gte: mockGte })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await getRecentRecipes('user123', 7)

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Erreur récupération récence:', mockError)
      
      consoleSpy.mockRestore()
    })

    it('devrait gérer les exceptions inattendues', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await getRecentRecipes('user123', 7)

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Erreur inattendue récupération récence:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('getExclusionLists', () => {
    it('devrait retourner des listes vides sans userId', async () => {
      const result = await getExclusionLists()
      expect(result).toEqual({
        excludedIngredients: [],
        excludedRecipes: []
      })
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('devrait récupérer les listes d\'exclusion avec succès', async () => {
      const mockIngredientsData = [
        { ingredient_name: 'nuts' },
        { ingredient_name: 'dairy' }
      ]
      const mockRecipesData = [
        { recipe_id: 'recipe_exclude1' },
        { recipe_id: 'recipe_exclude2' }
      ]

      // Premier appel (ingredients)
      const mockEq1_2 = vi.fn().mockResolvedValue({ data: mockIngredientsData, error: null })
      const mockEq1_1 = vi.fn().mockReturnValue({ eq: mockEq1_2 })
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1_1 })

      // Deuxième appel (recipes)
      const mockEq2_2 = vi.fn().mockResolvedValue({ data: mockRecipesData, error: null })
      const mockEq2_1 = vi.fn().mockReturnValue({ eq: mockEq2_2 })
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2_1 })

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 })

      const result = await getExclusionLists('user123')

      expect(result.excludedIngredients).toEqual(['nuts', 'dairy'])
      expect(result.excludedRecipes).toEqual(['recipe_exclude1', 'recipe_exclude2'])
    })
  })

  describe('getRecencyAndExclusion', () => {
    it('devrait récupérer toutes les données en parallèle', async () => {
      const mockRecentRecipes = [
        { recipe_id: 'recent1', consumed_at: '2024-01-10T12:00:00Z' }
      ]
      const mockIngredientsData = [{ ingredient_name: 'gluten' }]
      const mockRecipesData = [{ recipe_id: 'exclude1' }]

      // Mock pour getRecentRecipes
      const mockOrder = vi.fn().mockResolvedValue({ data: mockRecentRecipes, error: null })
      const mockGte = vi.fn().mockReturnValue({ order: mockOrder })
      const mockEq = vi.fn().mockReturnValue({ gte: mockGte })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

      // Mock pour les deux appels d'exclusion
      const mockEq1_2 = vi.fn().mockResolvedValue({ data: mockIngredientsData, error: null })
      const mockEq1_1 = vi.fn().mockReturnValue({ eq: mockEq1_2 })
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1_1 })

      const mockEq2_2 = vi.fn().mockResolvedValue({ data: mockRecipesData, error: null })
      const mockEq2_1 = vi.fn().mockReturnValue({ eq: mockEq2_2 })
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2_1 })

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: mockSelect })  // getRecentRecipes
        .mockReturnValueOnce({ select: mockSelect1 }) // ingredients
        .mockReturnValueOnce({ select: mockSelect2 }) // recipes

      const result = await getRecencyAndExclusion('user123', 5)

      expect(result.recentRecipes).toHaveLength(1)
      expect(result.recentRecipes[0].recipeId).toBe('recent1')
      expect(result.exclusionLists.excludedIngredients).toEqual(['gluten'])
      expect(result.exclusionLists.excludedRecipes).toEqual(['exclude1'])
    })

    it('devrait gérer l\'absence d\'userId', async () => {
      const result = await getRecencyAndExclusion()

      expect(result).toEqual({
        recentRecipes: [],
        exclusionLists: {
          excludedIngredients: [],
          excludedRecipes: []
        }
      })
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })
  })
})
