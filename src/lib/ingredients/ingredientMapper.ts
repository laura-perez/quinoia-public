/**
 * Ingredient Mapping Library
 * 
 * Automatically processes all recipes to identify and create missing ingredients.
 * Two-phase approach: Analysis + Review + Application
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Simple logger replacement to avoid env validation
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || '')
};

// Create Supabase client directly (will be passed in from CLI)
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
  
  return createClient(url, key);
}

// Types
export interface UnmappedIngredient {
  id: string;
  recipeId: string;
  recipeName: string;
  originalName: string;
  quantity: number;
  unit: string;
  suggestedCategory: string;
  suggestedSectionCode: string;
  suggestedCanonicalName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface AnalysisResult {
  totalRecipes: number;
  totalIngredients: number;
  mappedIngredients: number;
  unmappedIngredients: UnmappedIngredient[];
  summary: {
    byCategory: Record<string, number>;
    byConfidence: Record<string, number>;
  };
}

export interface ApprovalDecision {
  ingredientId: string;
  action: 'approve' | 'reject' | 'modify';
  modifications?: {
    canonicalName?: string;
    category?: string;
    sectionCode?: string;
  };
}

// Category and section mapping based on existing taxonomy
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Féculents': ['riz', 'pâtes', 'quinoa', 'couscous', 'semoule', 'nouilles', 'orzo', 'pomme de terre', 'patate'],
  'Légumes': ['courgette', 'brocoli', 'carotte', 'tomate', 'poivron', 'oignon', 'épinards', 'concombre', 'courge'],
  'Protéines animales': ['poulet', 'bœuf', 'porc', 'agneau', 'canard', 'œuf', 'blanc de poulet'],
  'Poissons': ['saumon', 'thon', 'cabillaud', 'merlu', 'sardine', 'colin', 'poisson'],
  'Protéines végétales': ['tofu', 'lentilles', 'pois chiches', 'haricots', 'edamame', 'tempeh'],
  'Alternatives à la viande': ['merguez végétales', 'haché végétal', 'émincés végétaux', 'steaks végétaux', 'lardons végétaux'],
  'Produits laitiers': ['fromage', 'yaourt', 'lait', 'crème', 'beurre', 'mozzarella', 'parmesan', 'feta', 'chèvre', 'comté'],
  'Herbes': ['persil', 'coriandre', 'basilic', 'ciboulette', 'thym', 'romarin', 'menthe'],
  'Épices': ['cumin', 'paprika', 'curry', 'gingembre', 'ail', 'piment', 'herbes de provence'],
  'Condiments': ['huile', 'vinaigre', 'sauce', 'moutarde', 'ketchup', 'pesto', 'bouillon'],
  'Conserves': ['concentré', 'passata', 'tomates pelées', 'tomates séchées']
};

const SECTION_MAPPING: Record<string, string> = {
  'Féculents': 'sec',
  'Légumes': 'frais',
  'Protéines animales': 'boucherie',
  'Poissons': 'poissonnerie', 
  'Protéines végétales': 'sec',
  'Alternatives à la viande': 'frais',
  'Produits laitiers': 'frais',
  'Herbes': 'frais',
  'Épices': 'sec',
  'Condiments': 'epicerie',
  'Conserves': 'conserves'
};

// Default units mapped by category (use Record<string,string> so dynamic indexing is safe)
const DEFAULT_UNITS: Record<string, string> = {
  'Féculents': 'g',
  'Légumes': 'g', 
  'Protéines animales': 'g',
  'Poissons': 'g',
  'Protéines végétales': 'g',
  'Alternatives à la viande': 'g',
  'Produits laitiers': 'g',
  'Herbes': 'g',
  'Épices': 'g',
  'Condiments': 'ml',
  'Conserves': 'g'
};

function getDefaultUnit(category: string): string {
  return DEFAULT_UNITS[category] ?? 'g';
}

/**
 * Analyze all recipes and identify unmapped ingredients
 */
export async function analyzeUnmappedIngredients(): Promise<AnalysisResult> {
  const supabase = getSupabaseClient();
  
  logger.info('Starting ingredient mapping analysis');

  // Get all recipes with their ingredients
  const { data: recipes, error: recipesError } = await supabase
    .from('recipe')
    .select(`
      id,
      titleFr,
      ingredients
    `)
    .eq('status', 'active');

  if (recipesError) {
    throw new Error(`Failed to fetch recipes: ${recipesError.message}`);
  }

  // Get existing canonical ingredients and aliases for lookup
  const { data: canonicalIngredients, error: canonicalError } = await supabase
    .from('ingredientCanonical')
    .select('id, nameFr, commonAliases, category, sectionCode');

  if (canonicalError) {
    throw new Error(`Failed to fetch canonical ingredients: ${canonicalError.message}`);
  }

  const { data: aliases, error: aliasError } = await supabase
    .from('ingredientAlias')
    .select('aliasName, canonicalId, normalizedForm');

  if (aliasError) {
    throw new Error(`Failed to fetch ingredient aliases: ${aliasError.message}`);
  }

  // Create lookup maps
  const canonicalMap = new Map<string, any>();
  const aliasMap = new Map<string, string>(); // alias -> canonicalId

  canonicalIngredients?.forEach(ingredient => {
    canonicalMap.set(ingredient.id, ingredient);
    // Add canonical name as lookup
    const normalized = normalizeIngredientName(ingredient.nameFr);
    aliasMap.set(normalized, ingredient.id);
    
    // Add common aliases
    ingredient.commonAliases?.forEach((alias: string) => {
      const normalizedAlias = normalizeIngredientName(alias);
      aliasMap.set(normalizedAlias, ingredient.id);
    });
  });

  // Add explicit aliases
  aliases?.forEach(alias => {
    aliasMap.set(alias.normalizedForm, alias.canonicalId);
  });

  // Analyze each recipe
  const unmappedIngredients: UnmappedIngredient[] = [];
  let totalIngredients = 0;
  let mappedIngredients = 0;

  for (const recipe of recipes || []) {
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) continue;

    for (const ingredient of recipe.ingredients) {
      totalIngredients++;
      const normalizedName = normalizeIngredientName(ingredient.nom);
      const canonicalId = aliasMap.get(normalizedName);

      if (canonicalId) {
        mappedIngredients++;
      } else {
        // Ingredient not found - analyze and suggest
        const suggestion = suggestIngredientMapping(ingredient.nom);
        
        unmappedIngredients.push({
          id: `${recipe.id}-${ingredient.nom}`,
          recipeId: recipe.id,
          recipeName: recipe.titleFr,
          originalName: ingredient.nom,
          quantity: ingredient.quantite || 0,
          unit: ingredient.unite || 'g',
          suggestedCategory: suggestion.category,
          suggestedSectionCode: suggestion.sectionCode,
          suggestedCanonicalName: suggestion.canonicalName,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning
        });
      }
    }
  }

  // Generate summary statistics
  const byCategory: Record<string, number> = {};
  const byConfidence: Record<string, number> = {};

  unmappedIngredients.forEach(ingredient => {
    byCategory[ingredient.suggestedCategory] = (byCategory[ingredient.suggestedCategory] || 0) + 1;
    byConfidence[ingredient.confidence] = (byConfidence[ingredient.confidence] || 0) + 1;
  });

  const result: AnalysisResult = {
    totalRecipes: recipes?.length || 0,
    totalIngredients,
    mappedIngredients,
    unmappedIngredients,
    summary: {
      byCategory,
      byConfidence
    }
  };

  logger.info('Ingredient analysis completed', {
    totalRecipes: result.totalRecipes,
    totalIngredients: result.totalIngredients,
    mappedIngredients: result.mappedIngredients,
    unmappedCount: result.unmappedIngredients.length
  });

  return result;
}

/**
 * Save analysis results to JSON file for review
 */
export async function saveAnalysisForReview(
  analysis: AnalysisResult, 
  outputPath: string = 'database/unmapped-ingredients-review.json'
): Promise<void> {
  const reviewData = {
    generatedAt: new Date().toISOString(),
    summary: analysis.summary,
    totalUnmapped: analysis.unmappedIngredients.length,
    instructions: {
      message: "Review each ingredient below. Set 'action' to 'approve', 'reject', or 'modify'",
      actions: {
        approve: "Create ingredient exactly as suggested",
        reject: "Skip this ingredient (will remain unmapped)",
        modify: "Use the 'modifications' field to change suggestions"
      }
    },
    ingredients: analysis.unmappedIngredients.map(ingredient => ({
      ...ingredient,
      // Add review fields
      action: 'approve' as const, // default
      modifications: {},
      reviewNotes: ''
    }))
  };

  const fullPath = path.resolve(outputPath);
  fs.writeFileSync(fullPath, JSON.stringify(reviewData, null, 2));
  
  logger.info('Analysis saved for review', { 
    outputPath: fullPath,
    unmappedCount: analysis.unmappedIngredients.length 
  });
}

/**
 * Apply approved ingredient creations from review file
 */
export async function applyApprovedIngredients(
  reviewFilePath: string = 'database/unmapped-ingredients-review.json'
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  
  if (!fs.existsSync(reviewFilePath)) {
    throw new Error(`Review file not found: ${reviewFilePath}`);
  }

  const reviewData = JSON.parse(fs.readFileSync(reviewFilePath, 'utf-8'));
  const ingredients = reviewData.ingredients;

  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[]
  };

  logger.info('Applying approved ingredient creations', { 
    totalIngredients: ingredients.length 
  });

  for (const ingredient of ingredients) {
    if (ingredient.action === 'reject') {
      results.skipped++;
      continue;
    }

    try {
      // Handle custom modifications in review notes
      const modifications = typeof ingredient.modifications === 'string' 
        ? ingredient.modifications 
        : JSON.stringify(ingredient.modifications || {});

      // Check if this is a "map as alias" instruction
      if (modifications.toLowerCase().includes('map it as alias')) {
        await handleAliasMapping(supabase, ingredient, modifications, results);
        continue;
      }

      // Determine final values (use modifications if provided)
      let finalName: string, finalCategory: string, finalSection: string;
      
      if (modifications.toLowerCase().includes('create new ingredient')) {
        // Extract custom name from modifications
        const nameMatch = modifications.match(/['"]([^'"]+)['"]/);
        finalName = nameMatch ? nameMatch[1] : ingredient.suggestedCanonicalName;
        finalCategory = ingredient.modifications?.category || ingredient.suggestedCategory;
        finalSection = ingredient.modifications?.sectionCode || ingredient.suggestedSectionCode;
      } else {
        finalName = ingredient.modifications?.canonicalName || ingredient.suggestedCanonicalName;
        finalCategory = ingredient.modifications?.category || ingredient.suggestedCategory;
        finalSection = ingredient.modifications?.sectionCode || ingredient.suggestedSectionCode;
      }

      // Check for duplicate canonical names
      const { data: existingIngredient } = await supabase
        .from('ingredientCanonical')
        .select('id, nameFr')
        .ilike('nameFr', finalName)
        .single();

      if (existingIngredient) {
        logger.info(`Duplicate found - using existing ingredient: ${finalName}`);
        
        // Create alias and update recipe mapping using existing ingredient
        if (ingredient.originalName.toLowerCase() !== finalName.toLowerCase()) {
          await supabase
            .from('ingredientAlias')
            .insert({
              canonicalId: existingIngredient.id,
              aliasName: ingredient.originalName,
              confidence: 0.9,
              source: 'auto_mapper'
            });
        }

        // Update recipe ingredient mapping
        await supabase
          .from('recipeIngredient')
          .upsert({
            recipeId: ingredient.recipeId,
            canonicalIngredientId: existingIngredient.id,
            originalName: ingredient.originalName,
            quantity: ingredient.quantity,
            unit: ingredient.unit
          });

        results.created++;
        logger.info('Used existing ingredient', {
          canonicalName: finalName,
          originalName: ingredient.originalName,
          existingId: existingIngredient.id
        });
        continue;
      }

      // Create new canonical ingredient
  const defaultUnit = getDefaultUnit(finalCategory);
      const { data: newCanonical, error: canonicalError } = await supabase
        .from('ingredientCanonical')
        .insert({
          nameFr: finalName,
          category: finalCategory,
          sectionCode: finalSection,
          defaultUnit,
          commonAliases: [ingredient.originalName]
        })
        .select()
        .single();

      if (canonicalError) {
        results.errors.push(`Failed to create ${finalName}: ${canonicalError.message}`);
        continue;
      }

      // Create alias for original name if different from canonical
      if (ingredient.originalName.toLowerCase() !== finalName.toLowerCase()) {
        await supabase
          .from('ingredientAlias')
          .insert({
            canonicalId: newCanonical.id,
            aliasName: ingredient.originalName,
            confidence: 0.9,
            source: 'auto_mapper'
          });
      }

      // Update recipe ingredient mapping
      await supabase
        .from('recipeIngredient')
        .upsert({
          recipeId: ingredient.recipeId,
          canonicalIngredientId: newCanonical.id,
          originalName: ingredient.originalName,
          quantity: ingredient.quantity,
          unit: ingredient.unit
        });

      results.created++;
      
      logger.info('Created ingredient', {
        canonicalName: finalName,
        originalName: ingredient.originalName,
        category: finalCategory,
        recipe: ingredient.recipeName
      });

    } catch (error) {
      const errorMsg = `Error processing ${ingredient.originalName}: ${error}`;
      results.errors.push(errorMsg);
      logger.error(errorMsg);
    }
  }

  logger.info('Ingredient creation completed', results);
  return results;
}

// Helper functions

async function handleAliasMapping(
  supabase: any, 
  ingredient: any, 
  modifications: string, 
  results: { created: number; skipped: number; errors: string[] }
) {
  try {
    // Extract target ingredient name from modifications
    const nameMatch = modifications.match(/['"]([^'"]+)['"]/);
    if (!nameMatch) {
      results.errors.push(`Could not extract target ingredient name from: ${modifications}`);
      return;
    }
    
    const targetName = nameMatch[1];
    
    // Find existing canonical ingredient
    const { data: existingIngredientRaw } = await supabase
      .from('ingredientCanonical')
      .select('id, nameFr')
      .ilike('nameFr', targetName)
      .single();

    let targetCanonical = existingIngredientRaw;

    if (!targetCanonical) {
      // Create the target ingredient if it doesn't exist and modifications mention "create"
      if (modifications.toLowerCase().includes('create it if')) {
        const suggestion = suggestIngredientMapping(targetName);
        const { data: newCanonical, error } = await supabase
          .from('ingredientCanonical')
          .insert({
            nameFr: targetName,
            category: suggestion.category,
            sectionCode: suggestion.sectionCode,
            defaultUnit: getDefaultUnit(suggestion.category),
            commonAliases: [ingredient.originalName]
          })
          .select()
          .single();

        if (error) {
          results.errors.push(`Failed to create ${targetName}: ${error.message}`);
          return;
        }
        targetCanonical = newCanonical;
        logger.info(`Created new canonical ingredient: ${targetName}`);
      } else {
        results.errors.push(`Target ingredient "${targetName}" not found and not set to create`);
        return;
      }
    }

    // Create alias
    await supabase
      .from('ingredientAlias')
      .insert({
        canonicalId: targetCanonical.id,
        aliasName: ingredient.originalName,
        confidence: 0.9,
        source: 'auto_mapper'
      });

    // Update recipe ingredient mapping
    await supabase
      .from('recipeIngredient')
      .upsert({
        recipeId: ingredient.recipeId,
        canonicalIngredientId: targetCanonical.id,
        originalName: ingredient.originalName,
        quantity: ingredient.quantity,
        unit: ingredient.unit
      });

    results.created++;
    logger.info('Mapped as alias', {
      originalName: ingredient.originalName,
      canonicalName: targetCanonical.nameFr,
      canonicalId: targetCanonical.id
    });

  } catch (error) {
    const errorMsg = `Error mapping alias ${ingredient.originalName}: ${error}`;
    results.errors.push(errorMsg);
    logger.error(errorMsg);
  }
}

function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function suggestIngredientMapping(originalName: string): {
  category: string;
  sectionCode: string; 
  canonicalName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
} {
  const normalized = originalName.toLowerCase();
  
  // Try to match against category keywords
  let bestCategory = 'Condiments'; // default
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let matchedKeywords: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(keyword => normalized.includes(keyword.toLowerCase()));
    if (matches.length > 0) {
      bestCategory = category;
      matchedKeywords = matches;
      confidence = matches.length > 1 ? 'high' : 'medium';
      break;
    }
  }

  // Generate canonical name (capitalize first letter of each word)
  const canonicalName = originalName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const sectionCode = SECTION_MAPPING[bestCategory] || 'epicerie';
  
  const reasoning = matchedKeywords.length > 0 
    ? `Matched keywords: ${matchedKeywords.join(', ')}`
    : 'No keyword matches, defaulting to Condiments/epicerie';

  return {
    category: bestCategory,
    sectionCode,
    canonicalName,
    confidence,
    reasoning
  };
}