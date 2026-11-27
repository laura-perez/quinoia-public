require('dotenv').config({ path: '.env.local.test' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRecipes() {
  console.log('🔍 Checking recipes in database...');

  const { data, error, count } = await supabase
    .from('recipe')
    .select('id, titleFr, diet', { count: 'exact' })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${count} total recipes in database`);
  console.log('First 10 recipes:');
  data?.forEach((r, i) => console.log(`  ${i + 1}. ${r.titleFr} (${r.diet})`));
}

checkRecipes();
