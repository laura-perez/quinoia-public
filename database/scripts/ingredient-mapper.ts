#!/usr/bin/env tsx

/**
 * Ingredient Mapping CLI Tool
 * 
 * Usage:
 *   npx tsx database/scripts/ingredient-mapper.ts analyze
 *   npx tsx database/scripts/ingredient-mapper.ts apply
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Manual env loading (same pattern as recipe import)
const ROOT = process.cwd();
const ENV_CANDIDATES = [
  '.env.local',
  '.env'
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

import { 
  analyzeUnmappedIngredients, 
  saveAnalysisForReview, 
  applyApprovedIngredients 
} from '../../src/lib/ingredients';

const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

async function main() {
  const command = process.argv[2];
  
  if (!command || !['analyze', 'apply'].includes(command)) {
    console.log(`
🔍 Ingredient Mapping Tool

Usage:
  npx tsx database/scripts/ingredient-mapper.ts analyze
  npx tsx database/scripts/ingredient-mapper.ts apply

Commands:
  analyze    - Scan all recipes and identify unmapped ingredients
  apply      - Apply approved ingredients from review file
    `);
    process.exit(1);
  }

  // Check required env vars
  const requiredKeys = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'
  ];
  const missing = requiredKeys.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  try {
    if (command === 'analyze') {
      await runAnalysis();
    } else if (command === 'apply') {
      await runApplication();
    }
  } catch (error) {
    logger.error('Command failed', { command, error });
    console.error(`\\n❌ Command failed: ${error}`);
    process.exit(1);
  }
}

async function runAnalysis() {
  console.log('\\n🔍 Analyzing ingredient mappings...');
  
  const analysis = await analyzeUnmappedIngredients();
  
  console.log('\\n=== INGREDIENT MAPPING ANALYSIS ===');
  console.log(`📊 Total recipes analyzed: ${analysis.totalRecipes}`);
  console.log(`📊 Total ingredients found: ${analysis.totalIngredients}`);
  console.log(`✅ Already mapped: ${analysis.mappedIngredients}`);
  console.log(`❓ Unmapped ingredients: ${analysis.unmappedIngredients.length}`);
  
  if (analysis.unmappedIngredients.length > 0) {
    console.log('\\n--- Summary by Category ---');
    Object.entries(analysis.summary.byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} ingredients`);
    });
    
    console.log('\\n--- Summary by Confidence ---');
    Object.entries(analysis.summary.byConfidence).forEach(([confidence, count]) => {
      const emoji = confidence === 'high' ? '🟢' : confidence === 'medium' ? '🟡' : '🔴';
      console.log(`  ${emoji} ${confidence}: ${count} ingredients`);
    });

    // Save for review
    const reviewFile = 'database/unmapped-ingredients-review.json';
    await saveAnalysisForReview(analysis, reviewFile);
    
    console.log(`\\n📝 Analysis saved to: ${reviewFile}`);
    console.log(`\\nNext steps:`);
    console.log(`1. Review the JSON file and set 'action' for each ingredient`);
    console.log(`2. Run: npx tsx database/scripts/ingredient-mapper.ts apply`);
  } else {
    console.log('\\n🎉 All ingredients are already mapped!');
  }
}

async function runApplication() {
  const reviewFile = 'database/unmapped-ingredients-review.json';
  
  if (!fs.existsSync(reviewFile)) {
    console.error(`\\n❌ Review file not found: ${reviewFile}`);
    console.error('Run the analyze command first.');
    process.exit(1);
  }

  console.log('\\n⚙️ Applying approved ingredients...');
  
  const results = await applyApprovedIngredients(reviewFile);
  
  console.log('\\n=== APPLICATION RESULTS ===');
  console.log(`✅ Created: ${results.created} ingredients`);
  console.log(`⏭️  Skipped: ${results.skipped} ingredients`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\\n--- Errors ---');
    results.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
  
  if (results.created > 0) {
    console.log('\\n🎉 Ingredient creation completed!');
    console.log('\\nNext steps:');
    console.log('1. Run recipe import again to verify all mappings');
    console.log('2. Test recipe selection with new ingredients');
    
    // Archive the review file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveFile = `database/applied-ingredients-${timestamp}.json`;
    fs.renameSync(reviewFile, archiveFile);
    console.log(`3. Review file archived as: ${archiveFile}`);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}