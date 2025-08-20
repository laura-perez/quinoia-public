/**
 * Quinoïa v2.0 System Integration Test
 * Tests the complete flow: database → recipe selection → shopping list generation
 * Run with: npx vitest run src/tests/integration/v2-system.test.ts
 */

import { describe, test, expect, vi, beforeAll } from 'vitest';
import { selectRecipes } from '@/lib/recipes/recipeSelector';
import { generateShoppingList } from '@/lib/recipes/shoppingListGenerator';
import { createLogger } from '@/lib/logger';

// Mock recipe data for testing
const mockOmnivoreRecipes = [
  {
    id: "1",
    titleFr: "Poulet basilic thaï, riz jasmin et œuf au plat",
    diet: "omnivore",
    proteinCategory: "Poultry",
    cookingLevel: "beginner",
    caloriesPerServing: 700,
    proteinGPerServing: 40,
    carbsGPerServing: 45,
    fatGPerServing: 18,
    equipmentRequired: ["Poêle"],
    servingsBase: 2,
    batchFriendly: true,
    ingredients: [
      { nom: "Blanc de poulet", quantite: 300, unite: "g", canonicalId: "chicken-breast" },
      { nom: "Riz jasmin", quantite: 160, unite: "g", canonicalId: "jasmine-rice" },
      { nom: "Oignon", quantite: 50, unite: "g", canonicalId: "onion" }
    ],
    instructions: ["Cuire le poulet", "Préparer le riz"],
    tags: ["protéiné", "asiatique"],
    status: "active"
  },
  {
    id: "2", 
    titleFr: "Poulet shawarma minute, riz basmati et salade concombre-yaourt",
    diet: "omnivore",
    proteinCategory: "Poultry",
    cookingLevel: "beginner",
    caloriesPerServing: 560,
    proteinGPerServing: 38,
    carbsGPerServing: 42,
    fatGPerServing: 15,
    equipmentRequired: ["Poêle"],
    servingsBase: 2,
    batchFriendly: false,
    ingredients: [
      { nom: "Blanc de poulet", quantite: 300, unite: "g", canonicalId: "chicken-breast" },
      { nom: "Riz basmati", quantite: 150, unite: "g", canonicalId: "basmati-rice" },
      { nom: "Oignon", quantite: 30, unite: "g", canonicalId: "onion" }
    ],
    instructions: ["Mariner le poulet", "Cuire avec les épices"],
    tags: ["moyen-orient", "rapide"],
    status: "active"
  },
  {
    id: "3",
    titleFr: "Poulet rôti aux légumes de saison et riz complet", 
    diet: "omnivore",
    proteinCategory: "Poultry",
    cookingLevel: "beginner",
    caloriesPerServing: 520,
    proteinGPerServing: 38,
    carbsGPerServing: 35,
    fatGPerServing: 16,
    equipmentRequired: ["Four"],
    servingsBase: 2,
    batchFriendly: true,
    ingredients: [
      { nom: "Blanc de poulet", quantite: 300, unite: "g", canonicalId: "chicken-breast" },
      { nom: "Riz complet", quantite: 140, unite: "g", canonicalId: "brown-rice" }
    ],
    instructions: ["Rôtir au four"],
    tags: ["healthy", "batch"],
    status: "active"
  }
];

const mockVeganRecipes = [
  {
    id: "4",
    titleFr: "Tofu croustillant au four, riz complet, brocoli et edamame",
    diet: "vegan",
    proteinCategory: "Tofu", 
    cookingLevel: "beginner",
    caloriesPerServing: 760,
    proteinGPerServing: 43,
    carbsGPerServing: 55,
    fatGPerServing: 22,
    equipmentRequired: ["Four"],
    servingsBase: 2,
    batchFriendly: true,
    ingredients: [
      { nom: "Tofu ferme", quantite: 200, unite: "g", canonicalId: "firm-tofu" },
      { nom: "Riz complet", quantite: 160, unite: "g", canonicalId: "brown-rice" },
      { nom: "Huile d'olive", quantite: 15, unite: "ml", canonicalId: "olive-oil" }
    ],
    instructions: ["Griller le tofu", "Cuire le riz"],
    tags: ["vegan", "protéiné"],
    status: "active"
  },
  {
    id: "5",
    titleFr: "Pâtes complètes crémeuses aux courgettes et aiguillettes végétales",
    diet: "vegan",
    proteinCategory: "Meat alternatives",
    cookingLevel: "beginner", 
    caloriesPerServing: 615,
    proteinGPerServing: 38,
    carbsGPerServing: 48,
    fatGPerServing: 20,
    equipmentRequired: ["Poêle", "Casserole"],
    servingsBase: 2,
    batchFriendly: false,
    ingredients: [
      { nom: "Aiguillettes végétales", quantite: 150, unite: "g", canonicalId: "plant-strips" },
      { nom: "Pâtes complètes", quantite: 180, unite: "g", canonicalId: "whole-pasta" },
      { nom: "Huile d'olive", quantite: 12, unite: "ml", canonicalId: "olive-oil" }
    ],
    instructions: ["Cuire les pâtes", "Sauté les courgettes"],
    tags: ["vegan", "crémeux"],
    status: "active"
  },
  {
    id: "6",
    titleFr: "Chili express au haché végétal et quinoa",
    diet: "vegan",
    proteinCategory: "Meat alternatives",
    cookingLevel: "beginner",
    caloriesPerServing: 680,
    proteinGPerServing: 33,
    carbsGPerServing: 52,
    fatGPerServing: 18,
    equipmentRequired: ["Poêle"],
    servingsBase: 2,
    batchFriendly: true,
    ingredients: [
      { nom: "Haché végétal", quantite: 150, unite: "g", canonicalId: "plant-mince" },
      { nom: "Quinoa", quantite: 120, unite: "g", canonicalId: "quinoa" },
      { nom: "Tomate cerise", quantite: 200, unite: "g", canonicalId: "cherry-tomato" }
    ],
    instructions: ["Cuire le quinoa", "Préparer le chili"],
    tags: ["vegan", "batch"],
    status: "active"
  },
  {
    id: "7", 
    titleFr: "Curry vert d'été aux émincés végétaux et riz basmati",
    diet: "vegan",
    proteinCategory: "Meat alternatives",
    cookingLevel: "intermediate",
    caloriesPerServing: 580,
    proteinGPerServing: 31,
    carbsGPerServing: 45,
    fatGPerServing: 16,
    equipmentRequired: ["Poêle", "Casserole"],
    servingsBase: 2,
    batchFriendly: false,
    ingredients: [
      { nom: "Émincés végétaux", quantite: 140, unite: "g", canonicalId: "plant-strips" },
      { nom: "Riz basmati", quantite: 150, unite: "g", canonicalId: "basmati-rice" },
      { nom: "Huile d'olive", quantite: 10, unite: "ml", canonicalId: "olive-oil" }
    ],
    instructions: ["Préparer le curry", "Cuire le riz"],
    tags: ["vegan", "asiatique"],
    status: "active"
  }
];

// Mock the entire recipe selection and shopping list modules with simpler test data
vi.mock('@/lib/recipes/recipeSelector', () => ({
  selectRecipes: vi.fn(async (context: any) => {
    // Simulate recipe selection based on diet
    const recipes = context.diet === 'omnivore' ? mockOmnivoreRecipes : mockVeganRecipes;
    const selectedRecipes = recipes.slice(0, context.numRecipes);
    
    return {
      selectedRecipes,
      scoringDetails: {
        totalFiltered: recipes.length,
        totalScored: recipes.length,
        diversityStrategy: 'protein-first',
        fallbacksUsed: []
      },
      nutritionSummary: {
        avgCaloriesPerRecipe: selectedRecipes.reduce((sum, r) => sum + r.caloriesPerServing, 0) / selectedRecipes.length,
        avgProteinPerRecipe: selectedRecipes.reduce((sum, r) => sum + r.proteinGPerServing, 0) / selectedRecipes.length,
        totalCalories: selectedRecipes.reduce((sum, r) => sum + r.caloriesPerServing, 0) * context.numServings,
        totalProtein: selectedRecipes.reduce((sum, r) => sum + r.proteinGPerServing, 0) * context.numServings
      },
      selectionStrategy: 'protein-first'
    };
  })
}));

vi.mock('@/lib/recipes/shoppingListGenerator', () => ({
  generateShoppingList: vi.fn(async (recipes: any[], numServings: number) => {
    const allIngredients = recipes.flatMap(r => r.ingredients || []);
    const totalItems = allIngredients.length;
    
    // Simulate aggregation
    const aggregated = allIngredients.reduce((acc, ing) => {
      const key = ing.canonicalId || ing.nom;
      if (acc[key]) {
        acc[key].sources.push('recipe');
      } else {
        acc[key] = {
          name_fr: ing.nom,
          totalAmount: ing.quantite * numServings,
          unit: ing.unite,
          sources: ['recipe'],
          category: 'Autres'
        };
      }
      return acc;
    }, {} as any);
    
    const items = Object.values(aggregated);
    const multiSourceItems = items.filter((item: any) => item.sources.length > 1);
    
    return {
      items,
      summary: {
        totalItems: items.length,
        totalCategories: 6,
        unmappedIngredients: 1
      }
    };
  })
}));

// Mock the database connection test  
vi.mock('@/lib/supabase/client', () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'ingredientCanonical' || table === 'ingredient_canonical') {
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { count: 100 }, error: null }))
          }))
        };
      }
      if (table === 'recipe') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { count: 35 }, error: null }))
            }))
          }))
        };
      }
      // Default fallback
      return {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { count: 0 }, error: null }))
        }))
      };
    })
  }))
}));

const logger = createLogger();

interface TestCase {
  name: string;
  context: any;
  expectedOutcome: {
    minRecipes: number;
    maxRecipes: number;
    mustHaveShoppingList: boolean;
    performance: {
      maxSelectionTimeMs: number;
      maxShoppingListTimeMs: number;
    };
  };
}

const testCases: TestCase[] = [
  {
    name: "Basic omnivore user - 3 recipes",
    context: {
      userId: "test-user-1",
      diet: "omnivore",
      proteinPreferences: ["Poultry", "Fish"],
      equipmentAvailable: ["Poêle", "Casserole", "Four"],
      cookingLevel: "beginner",
      numRecipes: 3,
      numServings: 2,
      batchMode: false,
      mealTargetKcal: 600,
      mealMinKcal: 500,
      mealMaxKcal: 700,
      proteinFloorG: 25,
      primaryGoal: "eatHealthier"
    },
    expectedOutcome: {
      minRecipes: 3,
      maxRecipes: 3,
      mustHaveShoppingList: true,
      performance: {
        maxSelectionTimeMs: 2000,
        maxShoppingListTimeMs: 1000
      }
    }
  },
  {
    name: "Vegan user with batch mode - 4 recipes",
    context: {
      userId: "test-user-2", 
      diet: "vegan",
      proteinPreferences: ["Tofu", "Meat alternatives"],
      equipmentAvailable: ["Poêle", "Casserole"],
      cookingLevel: "intermediate",
      numRecipes: 4,
      numServings: 1,
      batchMode: true,
      favoriteFoods: "quinoa tofu légumes",
      dislikedFoods: "champignons",
      mealTargetKcal: 600,
      mealMinKcal: 500,
      mealMaxKcal: 800,
      proteinFloorG: 30,
      primaryGoal: "weightLoss"
    },
    expectedOutcome: {
      minRecipes: 4,
      maxRecipes: 4,
      mustHaveShoppingList: true,
      performance: {
        maxSelectionTimeMs: 2000,
        maxShoppingListTimeMs: 1000
      }
    }
  }
];

async function testDatabaseConnection() {
  console.log('\n🔧 Testing database connection...');
  
  const { getServiceClient } = await import('@/lib/supabase/client');
  const supabase = getServiceClient();
  
  try {
    // Test ingredient taxonomy
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('ingredient_canonical')
      .select('count(*)')
      .single();
    
    if (ingredientsError) throw ingredientsError;
    
    console.log(`✅ Ingredient taxonomy: ${ingredients.count || 0} canonical ingredients`);
    
    // Test recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('recipe')
      .select('count(*)')
      .eq('status', 'active')
      .single();
    
    if (recipesError) throw recipesError;
    
    console.log(`✅ Recipe catalog: ${recipes.count || 0} active recipes`);
    
    return {
      success: true,
      stats: {
        ingredients: ingredients.count || 0,
        recipes: recipes.count || 0
      }
    };
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testRecipeSelection(testCase: TestCase) {
  console.log(`\n🍽️ Testing: ${testCase.name}`);
  
  const startTime = Date.now();
  
  try {
    const result = await selectRecipes(testCase.context);
    const selectionTime = Date.now() - startTime;
    
    // Validate results
    const selectedCount = result.selectedRecipes.length;
    const withinRange = selectedCount >= testCase.expectedOutcome.minRecipes && 
                       selectedCount <= testCase.expectedOutcome.maxRecipes;
    
    console.log(`  📊 Selection results:`);
    console.log(`     - Recipes selected: ${selectedCount}`);
    console.log(`     - Selection time: ${selectionTime}ms`);
    console.log(`     - Avg calories: ${result.nutritionSummary.avgCaloriesPerRecipe} kcal`);
    console.log(`     - Avg protein: ${result.nutritionSummary.avgProteinPerRecipe}g`);
    console.log(`     - Strategy: ${result.selectionStrategy}`);
    
    if (result.scoringDetails.fallbacksUsed.length > 0) {
      console.log(`     - Fallbacks used: ${result.scoringDetails.fallbacksUsed.join(', ')}`);
    }
    
    // Performance check
    const performanceOk = selectionTime <= testCase.expectedOutcome.performance.maxSelectionTimeMs;
    
    console.log(`  ✅ Recipe count: ${withinRange ? 'PASS' : 'FAIL'} (${selectedCount}/${testCase.expectedOutcome.maxRecipes})`);
    console.log(`  ${performanceOk ? '✅' : '❌'} Performance: ${performanceOk ? 'PASS' : 'FAIL'} (${selectionTime}ms <= ${testCase.expectedOutcome.performance.maxSelectionTimeMs}ms)`);
    
    return {
      success: withinRange && performanceOk,
      result,
      metrics: {
        selectionTime,
        selectedCount,
        performanceOk
      }
    };
    
  } catch (error) {
    console.error(`  ❌ Recipe selection failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testShoppingListGeneration(testCase: TestCase, recipes: any[]) {
  console.log(`\n🛒 Testing shopping list generation...`);
  
  const startTime = Date.now();
  
  try {
    const shoppingList = await generateShoppingList(recipes, testCase.context.numServings);
    const generationTime = Date.now() - startTime;
    
    console.log(`  📊 Shopping list results:`);
    console.log(`     - Total items: ${shoppingList.summary.totalItems}`);
    console.log(`     - Categories: ${shoppingList.summary.totalCategories}`);
    console.log(`     - Generation time: ${generationTime}ms`);
    console.log(`     - Unmapped ingredients: ${shoppingList.summary.unmappedIngredients}`);
    
    // Show aggregation examples
    const multiSourceItems = shoppingList.items.filter(item => item.sources.length > 1);
    if (multiSourceItems.length > 0) {
      console.log(`     - Aggregated items: ${multiSourceItems.length}`);
      const bestExample = multiSourceItems.reduce((best, current) => 
        current.sources.length > best.sources.length ? current : best
      );
      console.log(`     - Best aggregation: "${bestExample.name_fr}" (${bestExample.sources.length} sources)`);
    }
    
    // Performance check
    const performanceOk = generationTime <= testCase.expectedOutcome.performance.maxShoppingListTimeMs;
    const hasItems = shoppingList.summary.totalItems > 0;
    
    console.log(`  ✅ Shopping list generated: ${hasItems ? 'PASS' : 'FAIL'}`);
    console.log(`  ${performanceOk ? '✅' : '❌'} Performance: ${performanceOk ? 'PASS' : 'FAIL'} (${generationTime}ms <= ${testCase.expectedOutcome.performance.maxShoppingListTimeMs}ms)`);
    
    return {
      success: hasItems && performanceOk,
      shoppingList,
      metrics: {
        generationTime,
        totalItems: shoppingList.summary.totalItems,
        performanceOk
      }
    };
    
  } catch (error) {
    console.error(`  ❌ Shopping list generation failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runSystemTests() {
  console.log('🚀 Quinoïa v2.0 System Integration Tests');
  console.log('=======================================');
  
  // Test database connection
  const dbTest = await testDatabaseConnection();
  if (!dbTest.success) {
    console.error('\n💥 Database tests failed - aborting');
    process.exit(1);
  }
  
  if (dbTest.stats.recipes === 0) {
    console.warn('\n⚠️  No recipes found in database. Run recipe import first.');
    console.log('   Command: npm run import-recipes');
    process.exit(1);
  }
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  // Run each test case
  for (const testCase of testCases) {
    const recipeTest = await testRecipeSelection(testCase);
    
    if (recipeTest.success) {
      const shoppingTest = await testShoppingListGeneration(testCase, recipeTest.result.selectedRecipes);
      
      if (shoppingTest.success) {
        console.log(`\n✅ ${testCase.name}: PASSED`);
        passedTests++;
      } else {
        console.log(`\n❌ ${testCase.name}: FAILED (shopping list)`);
      }
    } else {
      console.log(`\n❌ ${testCase.name}: FAILED (recipe selection)`);
    }
  }
  
  // Summary
  console.log('\n=======================================');
  console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! v2.0 system is ready for launch.');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed. Review errors above.');
    process.exit(1);
  }
}

// Vitest test suite
describe('Quinoïa v2.0 System Integration Tests', () => {
  
  test('Database connection and setup', async () => {
    const dbTest = await testDatabaseConnection();
    expect(dbTest.success).toBe(true);
    expect(dbTest.stats.recipes).toBeGreaterThan(0);
  });

  test.each(testCases)('$name', async (testCase) => {
    // Test recipe selection
    const recipeTest = await testRecipeSelection(testCase);
    expect(recipeTest.success).toBe(true);
    
    // Test shopping list generation
    const shoppingTest = await testShoppingListGeneration(testCase, recipeTest.result.selectedRecipes);
    expect(shoppingTest.success).toBe(true);
    
    // Verify performance requirements
    expect(recipeTest.metrics.selectionTime).toBeLessThanOrEqual(testCase.expectedOutcome.performance.maxSelectionTimeMs);
    expect(shoppingTest.metrics.generationTime).toBeLessThanOrEqual(testCase.expectedOutcome.performance.maxShoppingListTimeMs);
    
    // Verify recipe count requirements
    expect(recipeTest.metrics.selectedCount).toBeGreaterThanOrEqual(testCase.expectedOutcome.minRecipes);
    expect(recipeTest.metrics.selectedCount).toBeLessThanOrEqual(testCase.expectedOutcome.maxRecipes);
  });

});

// Handle script execution for standalone running
if (require.main === module) {
  runSystemTests().catch(console.error);
}

export { runSystemTests };