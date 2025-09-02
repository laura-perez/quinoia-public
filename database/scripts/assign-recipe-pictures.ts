#!/usr/bin/env tsx
/**
 * Assign recipe.picture_file by matching Supabase Storage files in bucket 'recipes_photos'
 * to recipes by normalized title.
 *
 * Matching rule:
 *  - Key = title with diacritics removed; any non [a-z0-9] replaced by '_' ; underscores collapsed; trimmed; lowercased
 *  - File key derived from filename (without extension) using the same normalization
 *  - If multiple files map to the same key, skip (ambiguous) and report
 *  - On match, update recipe.picture_file with the exact file path (including extension)
 *
 * Env:
 *  - SUPABASE_URL, SUPABASE_SERVICE_KEY (or SERVICE_ROLE/ANON fallbacks)
 *  - Reads optional .env.local for local runs
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve('.env.local') });

function getEnv(name: string, fallbacks: string[] = []): string | undefined {
  if (process.env[name]) return process.env[name];
  for (const fb of fallbacks) if (process.env[fb]) return process.env[fb];
  return undefined;
}

function normKey(s: string): string {
  return (s || '')
  .toLowerCase()
  // Handle French ligatures before diacritic stripping
  .replace(/œ/g, 'oe')
  .replace(/Œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function getClient() {
  const url = getEnv('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']);
  const key = getEnv('SUPABASE_SERVICE_KEY', ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
  if (!url || !key) throw new Error('Missing Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_KEY/ROLE/ANON)');
  return createClient(url, key);
}

type ListedFile = {
  path: string; // full path within bucket
  name: string; // file name with extension
  id?: string;
};

async function listAllFiles(bucket: string, prefix = ''): Promise<ListedFile[]> {
  const supabase = getClient();
  const out: ListedFile[] = [];

  async function recurse(currentPrefix: string) {
    let offset = 0;
    const limit = 100;
    while (true) {
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .list(currentPrefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const entry of data) {
        if ((entry as any).metadata === null && entry.id === null && entry.name && (entry as any).created_at === null) {
          // Some SDK versions return folder markers this way; but safer is to use entry.id === null and no '.' in name
        }
  if ((entry as any).id === null && !entry.name.includes('.')) {
          // Folder (heuristic). Recurse.
          await recurse(path.posix.join(currentPrefix, entry.name));
        } else {
          out.push({ path: path.posix.join(currentPrefix, entry.name), name: entry.name, id: (entry as any).id });
        }
      }

      if (data.length < limit) break;
      offset += data.length;
    }
  }

  await recurse(prefix);
  return out;
}

async function main() {
  const supabase = getClient();
  const BUCKET = 'recipes_photos';

  // Verify column exists
  {
    const { data: cols, error: colErr } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name')
      .eq('table_name', 'recipe')
      .eq('column_name', 'picture_file');
    if (colErr) {
      console.warn('Warning: could not verify picture_file column existence via information_schema. Proceeding.');
    } else if (!cols || (cols as any[]).length === 0) {
      throw new Error('The column recipe.picture_file does not exist. Please create it before running this script.');
    }
  }

  // List all files in bucket
  const files = await listAllFiles(BUCKET);
  const fileKeyToPath = new Map<string, string>();
  const dupKeys = new Map<string, string[]>();

  for (const f of files) {
    const base = f.name.replace(/\.[^.]+$/, '');
    const key = normKey(base);
    if (!fileKeyToPath.has(key)) {
      fileKeyToPath.set(key, f.path);
    } else {
      const arr = dupKeys.get(key) || [fileKeyToPath.get(key)!];
      arr.push(f.path);
      dupKeys.set(key, arr);
    }
  }

  // Fetch all recipes (we'll update when a matching file exists)
  const { data: recipes, error: rErr } = await supabase
    .from('recipe')
    .select('id, titleFr, picture_file')
    .is('picture_file', null);
  if (rErr) throw rErr;

  type Assignment = { id: string; titleFr: string; key: string; path?: string; reason?: string };
  const assignments: Assignment[] = [];

  for (const r of recipes || []) {
    const titleKey = normKey(r.titleFr);
    const explicitKeyRaw: string | undefined = (r as any).key;
    const explicitKey = explicitKeyRaw ? normKey(explicitKeyRaw) : undefined;

    let chosenPath: string | undefined;
    let chosenKey: string = explicitKey || titleKey;

    // 1) If key includes extension and we have exact filename match, use it
    if (explicitKeyRaw && /\.[a-z0-9]{2,4}$/.test(explicitKeyRaw.toLowerCase())) {
      // key provided with extension, search exact name match
      for (const [k, pth] of fileKeyToPath) {
        const fname = path.posix.basename(pth);
        if (normKey(fname.replace(/\.[^.]+$/, '')) === normKey(explicitKeyRaw.replace(/\.[^.]+$/, '')) && fname.toLowerCase().endsWith(explicitKeyRaw.toLowerCase().slice(explicitKeyRaw.lastIndexOf('.')))) {
          chosenPath = pth;
          chosenKey = normKey(fname.replace(/\.[^.]+$/, ''));
          break;
        }
      }
    }

    // 2) If still not found, try key without extension
    if (!chosenPath && explicitKey) {
      if (dupKeys.has(explicitKey)) {
        // Even if ambiguous generally, pick the one whose basename matches explicitKey exactly if possible
        const candidates = dupKeys.get(explicitKey)!;
        const exact = candidates.find(p => normKey(path.posix.basename(p).replace(/\.[^.]+$/, '')) === explicitKey);
        if (exact) {
          chosenPath = exact;
          chosenKey = explicitKey;
        }
      }
      if (!chosenPath) {
        const p = fileKeyToPath.get(explicitKey);
        if (p) {
          chosenPath = p;
          chosenKey = explicitKey;
        }
      }
    }

    // 3) Fallback to title-based key
    if (!chosenPath) {
      if (dupKeys.has(titleKey)) {
        assignments.push({ id: r.id, titleFr: r.titleFr, key: titleKey, reason: `Ambiguous: multiple files ${dupKeys.get(titleKey)!.join(', ')}` });
        continue;
      }
      const p = fileKeyToPath.get(titleKey);
      if (!p) {
        assignments.push({ id: r.id, titleFr: r.titleFr, key: titleKey, reason: 'No matching file' });
        continue;
      }
      chosenPath = p;
      chosenKey = titleKey;
    }

    assignments.push({ id: r.id, titleFr: r.titleFr, key: chosenKey, path: chosenPath });
  }

  const toUpdate = assignments.filter(a => a.path);
  const skipped = assignments.filter(a => !a.path);

  // Batch updates
  const BATCH = 50;
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const chunk = toUpdate.slice(i, i + BATCH);
    for (const row of chunk) {
      // Store the exact file name (not path), per requirement: "match each file name"
      const fileName = path.posix.basename(row.path!);
      const { error: e } = await supabase.from('recipe').update({ picture_file: fileName }).eq('id', row.id);
      if (e) throw e;
    }
  }

  // Report
  const outPath = path.resolve('database/picture-file-assignment.json');
  fs.writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
  updated: toUpdate.length,
    skipped: skipped.length,
    skippedDetails: skipped,
  }, null, 2));
  console.log(`Updated ${toUpdate.length} recipes. Skipped ${skipped.length}. Report: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
