/**
 * Recipe Import Script - Load recipes from recipes.json into v2.0 database
 * Run with: npx tsx database/scripts/import-recipes.ts
 *
 * Note: When run outside Next.js, .env.local is NOT auto-loaded. We manually load
 * env files (priority: .env.recipe-import -> .env.local -> .env) before importing
 * any modules that rely on validated env variables.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Manual env loading (idempotent). Only set keys that aren't already defined.
const ROOT = process.cwd();
const ENV_CANDIDATES = [
  '.env.recipe-import', // specialized overrides (optional)
  '.env.local',         // local dev (provided by user)
  '.env'                // fallback
];

for (const file of ENV_CANDIDATES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  try {
    const parsed = dotenv.parse(fs.readFileSync(full));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch (e) {
    // Non-fatal; continue to next file
  }
}

import { createLogger } from '../../src/lib/logger';

const logger = createLogger();

async function main() {
  try {
    // Diagnostics: ensure required server env vars present BEFORE dynamic import
    const requiredKeys = [
      'RECAPTCHA_SECRET_KEY','SUPABASE_URL','SUPABASE_SERVICE_KEY','SUPABASE_ANON_KEY',
      'N8N_WEBHOOK_URL','N8N_WEBHOOK_SECRET','HMAC_SECRET','APP_BASE_URL'
    ];
    const missing = requiredKeys.filter(k => !process.env[k]);
    logger.info('Starting recipe import process...', {
      loadedEnvFiles: ENV_CANDIDATES.filter(f => fs.existsSync(path.join(ROOT, f))),
      missingEnvKeys: missing
    });
    if (missing.length) {
      console.error('\nMissing required environment variables (before import):');
      missing.forEach(k => console.error(' -', k));
      console.error('\nAdd them to .env.local or .env.recipe-import and rerun.');
      process.exit(1);
    }

    // Dynamic import AFTER env is guaranteed loaded to avoid early validation failure
    const { importRecipesFromJson } = await import('../../src/lib/recipes/recipeImporter');
    
    const recipesJsonPath = process.argv[2]
      ? path.resolve(process.argv[2])
      : path.join(__dirname, '../new_recipes_to_import.json');
    
    // Check if the source file exists
    if (!fs.existsSync(recipesJsonPath)) {
      console.error(`\n❌ Source file not found: ${recipesJsonPath}`);
      console.error('Please ensure the file exists or specify a different path.');
      process.exit(1);
    }
    const result = await importRecipesFromJson(recipesJsonPath);
    
    // Display results
    console.log('\n=== RECIPE IMPORT RESULTS ===');
    console.log(`✅ Successfully imported: ${result.imported} recipes`);
    console.log(`⚠️  Skipped: ${result.skipped} recipes`);
    console.log(`🔍 Need review: ${result.reviewRequired.length} recipes`);
    console.log(`❌ Errors: ${result.errors.length}`);
    
    // Show file management results
    const isNewRecipesFile = recipesJsonPath.endsWith('new_recipes_to_import.json');
    if (isNewRecipesFile) {
      console.log(`\n📁 FILE MANAGEMENT:`);
      console.log(`   • Moved ${result.successfulRecipes?.length || 0} recipes to recipes.json`);
      console.log(`   • Left ${result.failedRecipes?.length || 0} failed recipes in new_recipes_to_import.json`);
    }
    
    if (result.reviewRequired.length > 0) {
      console.log('\n--- Recipes needing review ---');
      result.reviewRequired.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('\n--- Import errors ---');
      result.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }
    
    if (result.imported > 0) {
      console.log('\n🎉 Recipe import completed successfully!');
      console.log('Next steps:');
      console.log('1. Review recipes with low-confidence ingredient mappings');
      console.log('2. Test recipe selection algorithm');
      console.log('3. Validate shopping list aggregation');
      
      if (isNewRecipesFile && (result.failedRecipes?.length || 0) > 0) {
        console.log('4. Fix failed recipes in new_recipes_to_import.json and run import again');
      }
    } else if (isNewRecipesFile && (result.failedRecipes?.length || 0) > 0) {
      console.log('\n⚠️  No recipes were imported successfully.');
      console.log('Fix the issues above and run the import script again.');
      console.log('Failed recipes remain in new_recipes_to_import.json for retry.');
    }
    
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Recipe import failed', { error: err });
    console.error('\n❌ Recipe import failed:', err.message);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}