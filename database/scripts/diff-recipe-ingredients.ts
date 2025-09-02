#!/usr/bin/env tsx
/**
 * Compare recipe.ingredients (JSONB) against ingredientCanonical (nameFr/commonAliases) and report differences.
 * Output: JSON report saved to database/recipe-ingredient-diff.json
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env from .env.local if present
dotenv.config({ path: path.resolve('.env.local') });

function getEnv(name: string, fallbacks: string[] = []): string | undefined {
  if (process.env[name]) return process.env[name];
  for (const fb of fallbacks) if (process.env[fb]) return process.env[fb];
  return undefined;
}

function getClient() {
  const url = getEnv('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']);
  const key = getEnv('SUPABASE_SERVICE_KEY', ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY (or role/anon) in environment or .env.local');
  }
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

  // Fetch canonical list including aliases (from both commonAliases array and ingredientAlias table)
  const { data: canonical, error: cErr } = await supabase
    .from('ingredientCanonical')
    .select('id, nameFr, commonAliases');
  if (cErr) throw cErr;

  const canonById = new Map<string, any>((canonical || []).map((c: any) => [c.id, c]));

  // Build lookup indexes from canonical names and aliases
  const nameIndex = new Map<string, string>(); // norm(nameFr) -> id
  const aliasIndex = new Map<string, string>(); // norm(alias) -> id

  for (const c of canonical || []) {
    if (c?.nameFr) nameIndex.set(norm(c.nameFr), c.id);
    const aliases = Array.isArray(c?.commonAliases)
      ? (c.commonAliases as any[]).map((a) => (typeof a === 'string' ? a : String(a)))
      : [];
    for (const a of aliases) aliasIndex.set(norm(a), c.id);
  }

  // Also include aliases from ingredientAlias table
  try {
    const { data: aliasRows, error: aErr } = await supabase
      .from('ingredientAlias')
      .select('canonicalId, aliasName');
    if (!aErr) {
      for (const row of aliasRows || []) {
        if (row?.aliasName && row?.canonicalId) aliasIndex.set(norm(row.aliasName), row.canonicalId);
      }
    }
    // If the table is missing/dropped, just proceed with commonAliases
  } catch (_) {
    // No-op: ingredientAlias not available
  }

  const report: any[] = [];

  for (const recipe of recipes || []) {
    const jsonIngs = Array.isArray((recipe as any).ingredients) ? (recipe as any).ingredients : [];

    const issues = {
      unmapped: [] as Array<{ name: string }>,
      missingCanonicalId: [] as Array<{ name: string; expectedCanonicalId: string; expectedNameFr: string }>,
      canonicalIdMismatch: [] as Array<{ name: string; jsonCanonicalId: string; expectedCanonicalId: string; expectedNameFr: string }>,
      unknownCanonicalId: [] as Array<{ name: string; jsonCanonicalId: string }>,
      nameNotInCanonicalAliases: [] as Array<{ name: string; jsonCanonicalId: string; canonicalNameFr: string; aliases: string[] }>,
      duplicateCanonicalWithinRecipe: [] as Array<{ canonicalId: string; names: string[] }>,
    };

    const seenByCanonical = new Map<string, string[]>();

    const IGNORE_NORMS = new Set<string>(['sel', 'poivre', 'eau']);

    for (const ing of jsonIngs) {
      const name: string = (ing?.nom ?? '').trim();
      const jsonCanonicalId: string | undefined = ing?.canonicalId ?? ing?.canonicalID ?? ing?.canonical_id;
      const k = norm(name);

      // Ignore certain ubiquitous items (salt/pepper/water) per project conventions
      if (IGNORE_NORMS.has(k)) {
        continue;
      }

      const foundByName = nameIndex.get(k);
      const foundByAlias = aliasIndex.get(k);
      const matchedId = foundByName || foundByAlias;

      if (!matchedId) {
        // No canonical match by name or alias
        if (jsonCanonicalId) {
          if (!canonById.has(jsonCanonicalId)) {
            issues.unknownCanonicalId.push({ name, jsonCanonicalId });
          } else {
            const canonical = canonById.get(jsonCanonicalId);
            const aliases = Array.isArray(canonical?.commonAliases) ? canonical.commonAliases : [];
            issues.nameNotInCanonicalAliases.push({
              name,
              jsonCanonicalId,
              canonicalNameFr: canonical?.nameFr ?? '',
              aliases,
            });
          }
        } else {
          issues.unmapped.push({ name });
        }
        continue;
      }

      // There is a canonical match by name/alias; ensure JSON canonicalId matches it
      const canonical = canonById.get(matchedId);
      if (!jsonCanonicalId) {
        issues.missingCanonicalId.push({ name, expectedCanonicalId: matchedId, expectedNameFr: canonical?.nameFr ?? '' });
      } else if (jsonCanonicalId !== matchedId) {
        issues.canonicalIdMismatch.push({
          name,
          jsonCanonicalId,
          expectedCanonicalId: matchedId,
          expectedNameFr: canonical?.nameFr ?? '',
        });
      }

      // Track duplicates of canonical within a recipe
      const arr = seenByCanonical.get(matchedId) || [];
      arr.push(name);
      seenByCanonical.set(matchedId, arr);
    }

    for (const [cid, names] of seenByCanonical) {
      if (names.length > 1) issues.duplicateCanonicalWithinRecipe.push({ canonicalId: cid, names });
    }

    if (
      issues.unmapped.length ||
      issues.missingCanonicalId.length ||
      issues.canonicalIdMismatch.length ||
      issues.unknownCanonicalId.length ||
      issues.nameNotInCanonicalAliases.length ||
      issues.duplicateCanonicalWithinRecipe.length
    ) {
      report.push({ recipeId: recipe.id, titleFr: (recipe as any).titleFr, issues });
    }
  }

  const outPath = path.resolve('database/recipe-ingredient-canonical-diff.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));
  console.log(`Canonical diff written to ${outPath} with ${report.length} recipes having issues.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
