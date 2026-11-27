/**
 * Unit Tests for generateShoppingList
 *
 * Test Coverage:
 * 1. Basic aggregation by canonicalId
 * 2. Serving scaling (2x, 4x multipliers)
 * 3. Multi-recipe aggregation (same ingredient from 2+ recipes)
 * 4. Unit normalization (g/ml conversion)
 * 5. Unmapped ingredients handling
 * 6. Section ordering (supermarket flow)
 * 7. Edge cases (empty recipes, missing data)
 */

import { describe, it, expect } from 'vitest';
import { generateShoppingList } from '@/utils/shoppingList/generator';
import type { Recipe } from '@/lib/recipes/types';
import type { CanonicalIngredientInfo } from '@/lib/supabase/repositories/ingredients';

// Mock recipe data
const mockRecipe1: Recipe = {
  id: 'recipe-1',
  titleFr: 'Poulet rôti',
  servingsBase: 2,
  picture_file: '',
  prepTimeMinutes: 30,
  ingredients: [
    {
      nom: 'Blanc de poulet',
      quantite: 300,
      unite: 'g',
      canonicalId: 'chicken-breast',
      canonicalName: 'Blanc de poulet',
    },
    {
      nom: 'Riz basmati',
      quantite: 200,
      unite: 'g',
      canonicalId: 'basmati-rice',
      canonicalName: 'Riz basmati',
    },
    {
      nom: 'Oignon',
      quantite: 100,
      unite: 'g',
      canonicalId: 'onion',
      canonicalName: 'Oignon',
    },
  ],
};

const mockRecipe2: Recipe = {
  id: 'recipe-2',
  titleFr: 'Curry de légumes',
  servingsBase: 2,
  picture_file: '',
  prepTimeMinutes: 30,
  ingredients: [
    {
      nom: 'Oignon',
      quantite: 150,
      unite: 'g',
      canonicalId: 'onion',
      canonicalName: 'Oignon',
    },
    {
      nom: 'Riz basmati',
      quantite: 180,
      unite: 'g',
      canonicalId: 'basmati-rice',
      canonicalName: 'Riz basmati',
    },
    {
      nom: 'Lait de coco',
      quantite: 200,
      unite: 'ml',
      canonicalId: 'coconut-milk',
      canonicalName: 'Lait de coco',
    },
  ],
};

const mockRecipeUnmapped: Recipe = {
  id: 'recipe-3',
  titleFr: 'Recette avec ingrédient non mappé',
  servingsBase: 2,
  picture_file: '',
  prepTimeMinutes: 30,
  ingredients: [
    {
      nom: 'Ingredient inconnu',
      quantite: 50,
      unite: 'g',
      // No canonicalId - should be counted as unmapped
    },
  ],
};

const mockIngredientsCatalog: Record<string, CanonicalIngredientInfo> = {
  'chicken-breast': {
    nameFr: 'Blanc de poulet',
    category: 'Viandes',
    sectionCode: 'viande',
  },
  'basmati-rice': {
    nameFr: 'Riz basmati',
    category: 'Féculents',
    sectionCode: 'epicerie',
  },
  onion: {
    nameFr: 'Oignon',
    category: 'Légumes',
    sectionCode: 'fruits-legumes',
  },
  'coconut-milk': {
    nameFr: 'Lait de coco',
    category: 'Produits exotiques',
    sectionCode: 'epicerie',
  },
};

describe('generateShoppingList', () => {
  it('should generate shopping list with basic aggregation', () => {
    const result = generateShoppingList({
      recipes: [mockRecipe1],
      numServings: 2,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    expect(result.items).toHaveLength(3);
    expect(result.summary.totalItems).toBe(3);
    expect(result.summary.totalRecipes).toBe(1);
    expect(result.summary.unmappedIngredients).toBe(0);

    // Check individual items
    const chicken = result.items.find((item) => item.canonical_ingredient_id === 'chicken-breast');
    expect(chicken).toBeDefined();
    expect(chicken?.total_amount).toBe(300);
    expect(chicken?.unit).toBe('g');
    expect(chicken?.sources).toHaveLength(1);
  });

  it('should scale ingredients correctly for different servings', () => {
    // Test 2x scaling (base is 2, request 4)
    const result = generateShoppingList({
      recipes: [mockRecipe1],
      numServings: 4,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    const chicken = result.items.find((item) => item.canonical_ingredient_id === 'chicken-breast');
    expect(chicken?.total_amount).toBe(600); // 300 * 2

    const rice = result.items.find((item) => item.canonical_ingredient_id === 'basmati-rice');
    expect(rice?.total_amount).toBe(400); // 200 * 2
  });

  it('should aggregate same ingredient from multiple recipes', () => {
    const result = generateShoppingList({
      recipes: [mockRecipe1, mockRecipe2],
      numServings: 2,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    // Onion appears in both recipes (100g + 150g = 250g)
    const onion = result.items.find((item) => item.canonical_ingredient_id === 'onion');
    expect(onion).toBeDefined();
    expect(onion?.total_amount).toBe(250);
    expect(onion?.sources).toHaveLength(2);

    // Basmati rice appears in both recipes (200g + 180g = 380g)
    const rice = result.items.find((item) => item.canonical_ingredient_id === 'basmati-rice');
    expect(rice?.total_amount).toBe(380);
    expect(rice?.sources).toHaveLength(2);

    // Total unique items should be 4 (chicken, rice, onion, coconut milk)
    expect(result.items).toHaveLength(4);
  });

  it('should handle unit normalization (g/ml)', () => {
    const result = generateShoppingList({
      recipes: [mockRecipe2],
      numServings: 2,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    const coconutMilk = result.items.find(
      (item) => item.canonical_ingredient_id === 'coconut-milk'
    );
    expect(coconutMilk).toBeDefined();
    expect(coconutMilk?.total_amount).toBe(200);
    expect(coconutMilk?.unit).toBe('ml');
  });

  it('should track unmapped ingredients', () => {
    const result = generateShoppingList({
      recipes: [mockRecipe1, mockRecipeUnmapped],
      numServings: 2,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    expect(result.summary.unmappedIngredients).toBe(1);
    // Mapped items should still be correct (3 from mockRecipe1)
    expect(result.items).toHaveLength(3);
  });

  it('should organize items by category/section', () => {
    const result = generateShoppingList({
      recipes: [mockRecipe1, mockRecipe2],
      numServings: 2,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    expect(result.organizedByCategory.length).toBeGreaterThan(0);

    // Check that categories are present
    const categories = result.organizedByCategory.map((c) => c.category);
    expect(categories).toContain('Viandes');
    expect(categories).toContain('Légumes');
    expect(categories).toContain('Féculents');

    // Verify items are grouped correctly
    const viandes = result.organizedByCategory.find((c) => c.category === 'Viandes');
    expect(viandes?.items).toHaveLength(1);
    expect(viandes?.items[0].canonical_ingredient_id).toBe('chicken-breast');
  });

  it('should handle empty recipes array', () => {
    const result = generateShoppingList({
      recipes: [],
      numServings: 2,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    expect(result.items).toHaveLength(0);
    expect(result.organizedByCategory).toHaveLength(0);
    expect(result.summary.totalItems).toBe(0);
    expect(result.summary.totalRecipes).toBe(0);
  });

  it('should handle recipes with zero quantity ingredients', () => {
    const recipeWithZeroQty: Recipe = {
      id: 'recipe-zero',
      titleFr: 'Test',
      servingsBase: 2,
      picture_file: '',
      prepTimeMinutes: 30,
      ingredients: [
        {
          nom: 'Sel',
          quantite: 0,
          unite: 'g',
          canonicalId: 'salt',
          canonicalName: 'Sel',
        },
        {
          nom: 'Poulet',
          quantite: 300,
          unite: 'g',
          canonicalId: 'chicken-breast',
          canonicalName: 'Blanc de poulet',
        },
      ],
    };

    const result = generateShoppingList({
      recipes: [recipeWithZeroQty],
      numServings: 2,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    // Only ingredients with quantity > 0 should be included
    expect(result.items).toHaveLength(1);
    expect(result.items[0].canonical_ingredient_id).toBe('chicken-breast');
  });

  it('should preserve source recipe information', () => {
    const result = generateShoppingList({
      recipes: [mockRecipe1, mockRecipe2],
      numServings: 2,
      ingredientsCatalog: mockIngredientsCatalog,
    });

    const onion = result.items.find((item) => item.canonical_ingredient_id === 'onion');
    expect(onion?.sources).toHaveLength(2);

    // Check source details
    expect(onion?.sources[0].recipe_title).toBe('Poulet rôti');
    expect(onion?.sources[0].amount).toBe(100);
    expect(onion?.sources[0].original_name).toBe('Oignon');

    expect(onion?.sources[1].recipe_title).toBe('Curry de légumes');
    expect(onion?.sources[1].amount).toBe(150);
  });

  it('should sort items alphabetically within categories', () => {
    const recipeMultiItems: Recipe = {
      id: 'recipe-multi',
      titleFr: 'Test multi',
      servingsBase: 2,
      picture_file: '',
      prepTimeMinutes: 30,
      ingredients: [
        { nom: 'Tomate', quantite: 100, unite: 'g', canonicalId: 'tomato', canonicalName: 'Tomate' },
        { nom: 'Aubergine', quantite: 150, unite: 'g', canonicalId: 'eggplant', canonicalName: 'Aubergine' },
        { nom: 'Courgette', quantite: 120, unite: 'g', canonicalId: 'zucchini', canonicalName: 'Courgette' },
      ],
    };

    const catalogWithVeggies = {
      ...mockIngredientsCatalog,
      tomato: { id: 'tomato', nameFr: 'Tomate', category: 'Légumes', sectionCode: 'fruits-legumes' },
      eggplant: { id: 'eggplant', nameFr: 'Aubergine', category: 'Légumes', sectionCode: 'fruits-legumes' },
      zucchini: { id: 'zucchini', nameFr: 'Courgette', category: 'Légumes', sectionCode: 'fruits-legumes' },
    };

    const result = generateShoppingList({
      recipes: [recipeMultiItems],
      numServings: 2,
      ingredientsCatalog: catalogWithVeggies,
    });

    const legumes = result.organizedByCategory.find((c) => c.category === 'Légumes');
    expect(legumes?.items).toHaveLength(3);

    // Should be alphabetically sorted: Aubergine, Courgette, Tomate
    expect(legumes?.items[0].name_fr).toBe('Aubergine');
    expect(legumes?.items[1].name_fr).toBe('Courgette');
    expect(legumes?.items[2].name_fr).toBe('Tomate');
  });
});
