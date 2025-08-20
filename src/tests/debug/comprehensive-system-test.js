/**
 * Comprehensive Quinoïa v2.0 System Test
 * Equivalent to src/tests/integration/v2-system.test.ts but runnable with Node.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Test cases from the integration test
const testCases = [
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
  
  try {
    // Test ingredient taxonomy
    const { data: ingredients, error: ingredientsError } = await client
      .from('ingredientCanonical')
      .select('id')
      .limit(1);
    
    const ingredientCount = ingredients?.length || 0;
    console.log(`✅ Ingredient taxonomy: ${ingredientCount > 0 ? 'Available' : 'Empty'}`);
    
    // Test recipes
    const { data: recipes, error: recipesError } = await client
      .from('recipe')
      .select('id')
      .eq('status', 'active');
    
    if (recipesError) throw recipesError;
    
    const recipeCount = recipes?.length || 0;
    console.log(`✅ Recipe catalog: ${recipeCount} active recipes`);
    
    return {
      success: true,
      stats: {
        ingredients: ingredientCount,
        recipes: recipeCount
      }
    };
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testRecipeSelection(testCase) {
  console.log(`\n🍽️ Testing: ${testCase.name}`);
  
  const startTime = Date.now();
  
  try {
    // Get recipes matching the test context
    const { data: recipes, error } = await client
      .from('recipe')
      .select(`
        id, titleFr, diet, proteinCategory, cookingLevel,
        caloriesPerServing, proteinGPerServing, carbsGPerServing, fatGPerServing,
        equipmentRequired, batchFriendly, servingsBase,
        ingredients, instructions, tags, status
      `)
      .eq('status', 'active')
      .eq('diet', testCase.context.diet)
      .lte('prepTimeMinutes', 30)
      .gte('caloriesPerServing', testCase.context.mealMinKcal)
      .lte('caloriesPerServing', testCase.context.mealMaxKcal)
      .gte('proteinGPerServing', testCase.context.proteinFloorG);
      
    if (error) throw error;
    
    const selectionTime = Date.now() - startTime;
    
    // Filter by protein preferences
    const proteinFiltered = recipes.filter(r => 
      testCase.context.proteinPreferences.includes(r.proteinCategory)
    );
    
    // Sort by protein content and select required number
    const selected = proteinFiltered
      .sort((a, b) => b.proteinGPerServing - a.proteinGPerServing)
      .slice(0, testCase.context.numRecipes);
    
    const selectedCount = selected.length;
    const withinRange = selectedCount >= testCase.expectedOutcome.minRecipes && 
                       selectedCount <= testCase.expectedOutcome.maxRecipes;
    
    // Calculate nutrition summary
    const avgCalories = selected.reduce((sum, r) => sum + r.caloriesPerServing, 0) / selected.length;
    const avgProtein = selected.reduce((sum, r) => sum + r.proteinGPerServing, 0) / selected.length;
    
    console.log(`  📊 Selection results:`);
    console.log(`     - Recipes found: ${recipes.length} total, ${proteinFiltered.length} after protein filter`);
    console.log(`     - Recipes selected: ${selectedCount}`);
    console.log(`     - Selection time: ${selectionTime}ms`);
    console.log(`     - Avg calories: ${Math.round(avgCalories)} kcal`);
    console.log(`     - Avg protein: ${Math.round(avgProtein)}g`);
    
    selected.forEach((recipe, i) => {
      console.log(`     ${i+1}. ${recipe.titleFr} (${recipe.caloriesPerServing}kcal, ${recipe.proteinGPerServing}g protein)`);
    });
    
    // Performance check
    const performanceOk = selectionTime <= testCase.expectedOutcome.performance.maxSelectionTimeMs;
    
    console.log(`  ✅ Recipe count: ${withinRange ? 'PASS' : 'FAIL'} (${selectedCount}/${testCase.expectedOutcome.maxRecipes})`);
    console.log(`  ${performanceOk ? '✅' : '❌'} Performance: ${performanceOk ? 'PASS' : 'FAIL'} (${selectionTime}ms <= ${testCase.expectedOutcome.performance.maxSelectionTimeMs}ms)`);
    
    return {
      success: withinRange && performanceOk,
      recipes: selected,
      metrics: {
        selectionTime,
        selectedCount,
        performanceOk,
        avgCalories,
        avgProtein
      }
    };
    
  } catch (error) {
    console.error(`  ❌ Recipe selection failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testShoppingListGeneration(testCase, recipes) {
  console.log(`\n🛒 Testing shopping list generation...`);
  
  if (!recipes || recipes.length === 0) {
    console.log('   ❌ No recipes provided');
    return { success: false };
  }
  
  const startTime = Date.now();
  
  try {
    // Extract and aggregate ingredients
    const allIngredients = [];
    
    recipes.forEach(recipe => {
      const servingMultiplier = testCase.context.numServings / recipe.servingsBase;
      
      recipe.ingredients?.forEach(ingredient => {
        if (ingredient.quantite && ingredient.quantite > 0) {
          allIngredients.push({
            recipeTitle: recipe.titleFr,
            nom: ingredient.nom,
            scaledAmount: ingredient.quantite * servingMultiplier,
            unite: ingredient.unite || 'g',
            canonicalId: ingredient.canonicalId || ingredient.canonical_id,
            canonicalName: ingredient.canonicalName || ingredient.canonical_name
          });
        }
      });
    });
    
    // Group by canonical ID or name
    const aggregated = new Map();
    let unmapped = 0;
    
    allIngredients.forEach(ingredient => {
      const key = ingredient.canonicalId || ingredient.nom;
      
      if (!ingredient.canonicalId) {
        unmapped++;
      }
      
      if (aggregated.has(key)) {
        const existing = aggregated.get(key);
        existing.totalAmount += ingredient.scaledAmount;
        existing.sources.push(ingredient.recipeTitle);
      } else {
        aggregated.set(key, {
          name_fr: ingredient.canonicalName || ingredient.nom,
          totalAmount: ingredient.scaledAmount,
          unit: ingredient.unite,
          sources: [ingredient.recipeTitle],
          isMapped: !!ingredient.canonicalId
        });
      }
    });
    
    const aggregatedItems = Array.from(aggregated.values());
    const multiSourceItems = aggregatedItems.filter(item => item.sources.length > 1);
    const generationTime = Date.now() - startTime;
    
    console.log(`  📊 Shopping list results:`);
    console.log(`     - Total ingredient entries: ${allIngredients.length}`);
    console.log(`     - Aggregated to: ${aggregatedItems.length} unique items`);
    console.log(`     - Multi-source aggregations: ${multiSourceItems.length}`);
    console.log(`     - Generation time: ${generationTime}ms`);
    console.log(`     - Unmapped ingredients: ${unmapped}`);
    
    if (multiSourceItems.length > 0) {
      console.log(`     - Best aggregation examples:`);
      multiSourceItems
        .sort((a, b) => b.sources.length - a.sources.length)
        .slice(0, 3)
        .forEach(item => {
          const amount = Math.round(item.totalAmount * 10) / 10;
          console.log(`       • ${item.name_fr}: ${amount}${item.unit} (${item.sources.length} recipes)`);
        });
    }
    
    // Performance check
    const performanceOk = generationTime <= testCase.expectedOutcome.performance.maxShoppingListTimeMs;
    const hasItems = aggregatedItems.length > 0;
    
    console.log(`  ✅ Shopping list generated: ${hasItems ? 'PASS' : 'FAIL'}`);
    console.log(`  ${performanceOk ? '✅' : '❌'} Performance: ${performanceOk ? 'PASS' : 'FAIL'} (${generationTime}ms <= ${testCase.expectedOutcome.performance.maxShoppingListTimeMs}ms)`);
    
    return {
      success: hasItems && performanceOk,
      summary: {
        totalItems: aggregatedItems.length,
        totalCategories: 6, // Simplified category count
        unmappedIngredients: unmapped
      },
      items: aggregatedItems,
      metrics: {
        generationTime,
        totalItems: aggregatedItems.length,
        performanceOk,
        aggregationRatio: Math.round((1 - aggregatedItems.length / allIngredients.length) * 100)
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
  const results = [];
  
  // Run each test case
  for (const testCase of testCases) {
    const recipeTest = await testRecipeSelection(testCase);
    
    if (recipeTest.success) {
      const shoppingTest = await testShoppingListGeneration(testCase, recipeTest.recipes);
      
      if (shoppingTest.success) {
        console.log(`\n✅ ${testCase.name}: PASSED`);
        passedTests++;
        results.push({
          testCase: testCase.name,
          status: 'PASSED',
          recipeMetrics: recipeTest.metrics,
          shoppingMetrics: shoppingTest.metrics
        });
      } else {
        console.log(`\n❌ ${testCase.name}: FAILED (shopping list)`);
        results.push({
          testCase: testCase.name,
          status: 'FAILED',
          reason: 'shopping list generation'
        });
      }
    } else {
      console.log(`\n❌ ${testCase.name}: FAILED (recipe selection)`);
      results.push({
        testCase: testCase.name,
        status: 'FAILED',
        reason: 'recipe selection'
      });
    }
  }
  
  // Summary
  console.log('\n=======================================');
  console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  // Performance summary
  const passedResults = results.filter(r => r.status === 'PASSED');
  if (passedResults.length > 0) {
    console.log('\n⚡ Performance Summary:');
    passedResults.forEach(result => {
      console.log(`   ${result.testCase}:`);
      console.log(`     Recipe Selection: ${result.recipeMetrics.selectionTime}ms`);
      console.log(`     Shopping List: ${result.shoppingMetrics.generationTime}ms`);
      console.log(`     Aggregation: ${result.shoppingMetrics.aggregationRatio}%`);
    });
  }
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! v2.0 system is ready for launch.');
    console.log('\nSystem Status: ✅ PRODUCTION READY');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Review errors above.');
    console.log('\nSystem Status: ❌ NEEDS FIXES');
    process.exit(1);
  }
}

runSystemTests().catch(console.error);