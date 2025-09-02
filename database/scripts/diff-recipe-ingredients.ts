#!/usr/bin/env tsx
/**
 * Compare recipe.ingredients (JSONB) vs recipeIngredient (normalized) and report differences.
 * Output: JSON report saved to database/recipe-ingredient-diff.json
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getClient() {
  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_KEY as string;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key);
}

function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const supabase = getClient();

  // Fetch active recipes with JSON ingredients
  const { data: recipes, error: rErr } = await supabase
    .from('recipe')
    .select('id, titleFr, ingredients')
    .eq('status', 'active');
  if (rErr) throw rErr;

  // Fetch normalized mapping per recipe
  const { data: mappings, error: mErr } = await supabase
    .from('recipeIngredient')
    .select('recipeId, canonicalIngredientId, originalName, quantity, unit');
  if (mErr) throw mErr;

  // Fetch canonical names for reporting
  const { data: canonical, error: cErr } = await supabase
    .from('ingredientCanonical')
    .select('id, nameFr, category, sectionCode');
  if (cErr) throw cErr;
  const canonById = new Map(canonical.map(c => [c.id, c]));

  const mappingsByRecipe = new Map<string, any[]>();
  (mappings || []).forEach(row => {
    const arr = mappingsByRecipe.get(row.recipeId) || [];
    arr.push(row);
    mappingsByRecipe.set(row.recipeId, arr);
  });

  const report: any[] = [];

  for (const recipe of recipes || []) {
    const jsonIngs = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const normRows = mappingsByRecipe.get(recipe.id) || [];

    // Build comparable sets
    const jsonSet = new Map<string, { qty: number; unit: string }>();
    jsonIngs.forEach((i: any) => {
      jsonSet.set(norm(i.nom), { qty: Number(i.quantite) || 0, unit: i.unite || '' });
    });

    const normSet = new Map<string, { original: string; canon?: string; qty: number; unit: string }>();
    normRows.forEach((r: any) => {
      const key = norm(r.originalName);
      const canon = canonById.get(r.canonicalIngredientId)?.nameFr;
      normSet.set(key, { original: r.originalName, canon, qty: Number(r.quantity) || 0, unit: r.unit || '' });
    });

    const missingInNormalized: string[] = [];
    const missingInJson: string[] = [];
    const quantityMismatches: Array<{ name: string; jsonQty: number; jsonUnit: string; normQty: number; normUnit: string }> = [];

    // Check json -> normalized
    for (const [k, v] of jsonSet) {
      if (!normSet.has(k)) {
        missingInNormalized.push(k);
      } else {
        const n = normSet.get(k)!;
        if (Math.abs((v.qty || 0) - (n.qty || 0)) > 0.01 || (v.unit || '') !== (n.unit || '')) {
          quantityMismatches.push({ name: n.original, jsonQty: v.qty, jsonUnit: v.unit, normQty: n.qty, normUnit: n.unit });
        }
      }
    }

    // Check normalized -> json
    for (const [k, n] of normSet) {
      if (!jsonSet.has(k)) {
        missingInJson.push(n.original);
      }
    }

    if (missingInNormalized.length || missingInJson.length || quantityMismatches.length) {
      report.push({
        recipeId: recipe.id,
        titleFr: recipe.titleFr,
        issues: {
          missingInNormalized,
          missingInJson,
          quantityMismatches
        }
      });
    }
  }

  const outPath = path.resolve('database/recipe-ingredient-diff.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));
  console.log(`Diff written to ${outPath} with ${report.length} recipes having issues.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
