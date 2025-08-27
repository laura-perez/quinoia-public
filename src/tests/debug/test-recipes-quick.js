const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment from .env.local
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testRecipeSystem() {
  console.log('🔧 Testing Quinoïa v2.0 Recipe System...\n');
  
  try {
    // 1. Test recipe count and structure
    const { data: recipes, error: recipeError } = await client
      .from('recipe')
      .select('id, titleFr, diet, proteinCategory, caloriesPerServing, proteinGPerServing, ingredients')
      .eq('status', 'active')
      .limit(3);
    
    if (recipeError) throw recipeError;
    
    console.log(`✅ Recipe Database: ${recipes.length} active recipes found`);
    
    if (recipes.length === 0) {
      console.log('❌ No recipes found! Run recipe import first.');
      return;
    }
    
    // Show sample recipes
    console.log('\n📋 Sample Recipes:');
    recipes.forEach((recipe, i) => {
      console.log(`   ${i+1}. ${recipe.titleFr}`);
      console.log(`      Diet: ${recipe.diet} | Protein: ${recipe.proteinCategory}`);
      console.log(`      ${recipe.caloriesPerServing}kcal, ${recipe.proteinGPerServing}g protein`);
      console.log(`      Ingredients: ${recipe.ingredients?.length || 0}`);
    });
    
    // 2. Test ingredient canonical mapping
    const hasCanonicalIds = recipes.some(r => 
      r.ingredients?.some(ing => ing.canonicalId || ing.canonical_id)
    );
    
    console.log(`\n🔗 Canonical Mapping: ${hasCanonicalIds ? '✅ Found' : '❌ Missing'}`);
    
    if (hasCanonicalIds) {
      const mappedIngredient = recipes
        .flatMap(r => r.ingredients || [])
        .find(ing => ing.canonicalId || ing.canonical_id);
      
      if (mappedIngredient) {
        console.log(`   Example: "${mappedIngredient.nom}" → ID: ${mappedIngredient.canonicalId || mappedIngredient.canonical_id}`);
      }
    }
    
    // 3. Test ingredient taxonomy table
    const { data: ingredients, error: ingredientError } = await client
      .from('ingredientCanonical')
      .select('id, nameFr, category')
      .limit(5);
    
    if (ingredientError) {
      console.log('\n⚠️ Ingredient Taxonomy: Table not accessible or empty');
    } else {
      console.log(`\n✅ Ingredient Taxonomy: ${ingredients.length} canonical ingredients found`);
      if (ingredients.length > 0) {
        console.log(`   Examples: ${ingredients.map(i => i.nameFr).join(', ')}`);
      }
    }
    
    // 4. Basic recipe selection simulation
    console.log('\n🎯 Recipe Selection Simulation:');
    
    const omnivoreRecipes = recipes.filter(r => r.diet === 'omnivore');
    const vegetarianRecipes = recipes.filter(r => r.diet === 'vegetarian');
    const veganRecipes = recipes.filter(r => r.diet === 'vegan');
    
    console.log(`   Omnivore recipes: ${omnivoreRecipes.length}`);
    console.log(`   Vegetarian recipes: ${vegetarianRecipes.length}`);
    console.log(`   Vegan recipes: ${veganRecipes.length}`);
    
    // 5. Shopping list potential test
    const totalIngredients = recipes.reduce((sum, r) => sum + (r.ingredients?.length || 0), 0);
    const uniqueIngredientNames = new Set(
      recipes.flatMap(r => r.ingredients || []).map(ing => ing.nom)
    );
    
    console.log('\n🛒 Shopping List Potential:');
    console.log(`   Total ingredient entries: ${totalIngredients}`);
    console.log(`   Unique ingredient names: ${uniqueIngredientNames.size}`);
    console.log(`   Aggregation potential: ${Math.round((1 - uniqueIngredientNames.size / totalIngredients) * 100)}%`);
    
    console.log('\n🎉 System Ready for Testing!');
    console.log('\nNext steps:');
    console.log('1. Fix any missing canonical mappings');
    console.log('2. Run recipe selector with test context');
    console.log('3. Test shopping list generation');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRecipeSystem();