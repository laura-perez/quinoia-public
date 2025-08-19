/**
 * Quinoïa v2.0 System Integration Test
 * Tests the complete flow: database → recipe selection → shopping list generation
 * Run with: npx vitest run src/tests/integration/v2-system.test.ts
 */

import { selectRecipes } from '@/lib/recipes/recipeSelector';
import { generateShoppingList } from '@/lib/recipes/shoppingListGenerator';
import { createLogger } from '@/lib/logger';
import { getServiceClient } from '@/lib/supabase/client';

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
      proteinPreferences: ["Tofu", "Legumes"],
      equipmentAvailable: ["Poêle", "Casserole"],
      cookingLevel: "intermediate",
      numRecipes: 4,
      numServings: 1,
      batchMode: true,
      favoriteFoods: "quinoa tofu légumes",
      dislikedFoods: "champignons",
      mealTargetKcal: 550,
      mealMinKcal: 450,
      mealMaxKcal: 650,
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

// Handle script execution
if (require.main === module) {
  runSystemTests().catch(console.error);
}

export { runSystemTests };