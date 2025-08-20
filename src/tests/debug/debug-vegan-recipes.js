const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function debugVeganRecipes() {
  console.log('🔍 Debugging Vegan Recipe Selection...\n');
  
  // Get all vegan recipes
  const { data: allVegan } = await client
    .from('recipe')
    .select('titleFr, diet, proteinCategory, cookingLevel, caloriesPerServing, proteinGPerServing, prepTimeMinutes')
    .eq('status', 'active')
    .eq('diet', 'vegan');
    
  console.log('📋 All Vegan Recipes:');
  allVegan.forEach((r, i) => {
    console.log(`   ${i+1}. ${r.titleFr}`);
    console.log(`      Protein Category: ${r.proteinCategory}`);
    console.log(`      ${r.caloriesPerServing}kcal, ${r.proteinGPerServing}g protein, ${r.prepTimeMinutes || 'null'}min`);
    console.log(`      Cooking Level: ${r.cookingLevel}`);
  });
  
  console.log('\n🎯 Test Context Requirements:');
  console.log('   Diet: vegan');
  console.log('   Protein Preferences: ["Tofu", "Legumes"]');
  console.log('   Cooking Level: intermediate'); 
  console.log('   Calories: 450-650 kcal');
  console.log('   Protein: 30g+');
  console.log('   Prep Time: ≤30min');
  
  // Apply each filter step by step
  console.log('\n🔍 Filter Analysis:');
  
  const step1 = allVegan.filter(r => r.diet === 'vegan');
  console.log(`   Step 1 - Diet filter: ${step1.length} recipes`);
  
  const step2 = step1.filter(r => (r.prepTimeMinutes || 999) <= 30);
  console.log(`   Step 2 - Prep time ≤30min: ${step2.length} recipes`);
  step2.forEach(r => console.log(`     • ${r.titleFr}: ${r.prepTimeMinutes || 'null'}min`));
  
  const step3 = step2.filter(r => r.caloriesPerServing >= 450 && r.caloriesPerServing <= 650);
  console.log(`   Step 3 - Calories 450-650: ${step3.length} recipes`);
  step3.forEach(r => console.log(`     • ${r.titleFr}: ${r.caloriesPerServing}kcal`));
  
  const step4 = step3.filter(r => r.proteinGPerServing >= 30);
  console.log(`   Step 4 - Protein ≥30g: ${step4.length} recipes`);
  step4.forEach(r => console.log(`     • ${r.titleFr}: ${r.proteinGPerServing}g`));
  
  const step5 = step4.filter(r => ['Tofu', 'Legumes'].includes(r.proteinCategory));
  console.log(`   Step 5 - Protein category (Tofu/Legumes): ${step5.length} recipes`);
  step5.forEach(r => console.log(`     • ${r.titleFr}: ${r.proteinCategory}`));
  
  // Check the specific tofu recipes you mentioned
  console.log('\n🧐 Checking Specific Tofu Recipes:');
  const tofuRecipes = allVegan.filter(r => r.titleFr.toLowerCase().includes('tofu'));
  tofuRecipes.forEach(r => {
    console.log(`   • ${r.titleFr}`);
    console.log(`     Protein Category: ${r.proteinCategory} (matches Tofu: ${r.proteinCategory === 'Tofu'})`);
    console.log(`     Calories: ${r.caloriesPerServing} (in range 450-650: ${r.caloriesPerServing >= 450 && r.caloriesPerServing <= 650})`);
    console.log(`     Protein: ${r.proteinGPerServing}g (≥30g: ${r.proteinGPerServing >= 30})`);
    console.log(`     Prep time: ${r.prepTimeMinutes || 'null'}min (≤30: ${(r.prepTimeMinutes || 999) <= 30})`);
  });
}

debugVeganRecipes().catch(console.error);