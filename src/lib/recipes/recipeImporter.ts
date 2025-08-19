/**
 * Recipe Import System - Transform recipes.json to v2.0 database schema
 * Critical: Maps ingredients to canonical taxonomy for shopping list aggregation
 */

import { getServiceClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const logger = createLogger();

// CamelCase internal representation (DB schema v2)
interface GPTRecipe {
  titleFr: string;
  diet: 'omnivore' | 'flexitarian' | 'vegetarian' | 'vegan';
  proteinCategory: 'Beef' | 'Poultry' | 'Fish' | 'Eggs' | 'Dairy' | 'Tofu' | 'Legumes' | 'Meat alternatives';
  cookingLevel: 'beginner' | 'intermediate' | 'advanced';
  prepTimeMinutes: number;
  caloriesPerServing: number;
  proteinGPerServing: number;
  carbsGPerServing: number;
  fatGPerServing: number;
  equipmentRequired: string[];
  batchFriendly: boolean;
  allergens?: string[];
  tags: string[];
  ingredients: Array<{
    nom: string;
    quantite: number;
    unite: string;
  }>;
  instructions: string[];
  imageFilename?: string;
  cuisineType?: string;
  servingsBase: number;
  cookingTip?: string;
}

interface CanonicalIngredient {
  id: string;
  nameFr: string;
  category: string;
  sectionCode: string;
  defaultUnit: string;
}

interface MappedIngredient {
  nom: string;
  quantite: number;
  unite: string;
  canonicalId?: string;
  canonicalName?: string;
  confidence: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  reviewRequired: string[];
  ingredientMappings: Map<string, CanonicalIngredient>;
  successfulRecipes: GPTRecipe[];
  failedRecipes: GPTRecipe[];
}

// ---------------- Raw (snake_case) recipe validation & mapping ---------------
const RawRecipeSchema = z.object({
  title_fr: z.string(),
  diet: z.enum(['omnivore', 'flexitarian', 'vegetarian', 'vegan']),
  protein_category: z.string(),
  cooking_level: z.string(),
  prep_time_minutes: z.number().int().positive(),
  calories_per_serving: z.number().int().positive(),
  protein_g_per_serving: z.number().nonnegative(),
  carbs_g_per_serving: z.number().nonnegative(),
  fat_g_per_serving: z.number().nonnegative(),
  equipment_required: z.array(z.string()).default([]),
  batch_friendly: z.boolean(),
  allergens: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(z.object({
    nom: z.string(),
    quantite: z.number(),
    unite: z.string()
  })).default([]),
  instructions: z.array(z.string()).default([]),
  image_filename: z.string().optional(),
  cuisine_type: z.string().optional(),
  servings_base: z.number().int().positive(),
  cooking_tip: z.string().optional()
});

type RawRecipe = z.infer<typeof RawRecipeSchema>;

const RAW_TO_CAMEL_FIELD_MAP: Record<string, keyof GPTRecipe> = {
  title_fr: 'titleFr',
  protein_category: 'proteinCategory',
  cooking_level: 'cookingLevel',
  prep_time_minutes: 'prepTimeMinutes',
  calories_per_serving: 'caloriesPerServing',
  protein_g_per_serving: 'proteinGPerServing',
  carbs_g_per_serving: 'carbsGPerServing',
  fat_g_per_serving: 'fatGPerServing',
  equipment_required: 'equipmentRequired',
  batch_friendly: 'batchFriendly',
  image_filename: 'imageFilename',
  cuisine_type: 'cuisineType',
  servings_base: 'servingsBase',
  cooking_tip: 'cookingTip'
};

function transformRawRecipe(raw: unknown): GPTRecipe {
  const parsed = RawRecipeSchema.parse(raw) as RawRecipe;
  const base: any = {
    diet: parsed.diet,
    tags: parsed.tags || [],
    allergens: parsed.allergens || [],
    ingredients: parsed.ingredients,
    instructions: parsed.instructions
  };
  for (const [snake, camel] of Object.entries(RAW_TO_CAMEL_FIELD_MAP)) {
    base[camel] = (parsed as any)[snake];
  }
  return base as GPTRecipe;
}

/**
 * Intelligent ingredient matcher with confidence scoring
 * Maps recipe ingredients to canonical taxonomy
 */
export async function matchIngredient(ingredientName: string): Promise<{
  canonicalId?: string;
  canonicalName?: string;
  confidence: number;
  needsReview: boolean;
}> {
  const supabase = getServiceClient();
  
  try {
    // Step 1: Try exact alias match (highest confidence)
    const { data: exactMatch } = await supabase
      .from('ingredientAlias')
      .select(`
        canonicalId:canonicalId,
        confidence,
        ingredientCanonical:ingredientCanonical!inner(nameFr:nameFr, category)
      `)
      .eq('aliasName', ingredientName)
      .order('confidence', { ascending: false })
      .limit(1);

    if (exactMatch && exactMatch.length > 0) {
      const match = exactMatch[0];
      const canonical = (match as any).ingredientCanonical;
      return {
        canonicalId: (match as any).canonicalId,
        canonicalName: canonical?.nameFr,
        confidence: (match as any).confidence,
        needsReview: false
      };
    }

    // Step 2: Try normalized fuzzy match
    const normalized = normalizeIngredientName(ingredientName);
    const { data: fuzzyMatch } = await supabase
      .from('ingredientAlias')
      .select(`
        canonicalId:canonicalId,
        confidence,
        ingredientCanonical:ingredientCanonical!inner(nameFr:nameFr, category)
      `)
      .eq('normalizedForm', normalized)
      .order('confidence', { ascending: false })
      .limit(1);

    if (fuzzyMatch && fuzzyMatch.length > 0) {
      const match = fuzzyMatch[0];
      const canonical = (match as any).ingredientCanonical;
      return {
        canonicalId: (match as any).canonicalId,
        canonicalName: canonical?.nameFr,
        confidence: Math.max(0.8, (match as any).confidence), // Fuzzy match penalty
        needsReview: (match as any).confidence < 0.9
      };
    }

    // Step 3: Partial text matching for complex ingredient names
    const { data: partialMatches } = await supabase
      .from('ingredientCanonical')
      .select('id, nameFr:nameFr, category')
      .or(`nameFr.ilike.%${ingredientName}%,nameFr.ilike.%${ingredientName.split(' ')[0]}%`);

    if (partialMatches && partialMatches.length > 0) {
      // Score by text similarity (simple heuristic)
      const bestMatch = partialMatches.reduce((best, current) => {
        const currentScore = calculateSimilarity(ingredientName, current.nameFr);
        const bestScore = calculateSimilarity(ingredientName, best.nameFr);
        return currentScore > bestScore ? current : best;
      });

      const confidence = Math.min(0.7, calculateSimilarity(ingredientName, bestMatch.nameFr));
      
      return {
        canonicalId: bestMatch.id,
        canonicalName: bestMatch.nameFr,
        confidence,
        needsReview: true
      };
    }

    // No match found
    return {
      confidence: 0,
      needsReview: true
    };

  } catch (error) {
    logger.error('Ingredient matching failed', { ingredientName, error });
    return {
      confidence: 0,
      needsReview: true
    };
  }
}

/**
 * Normalize ingredient names for fuzzy matching
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Simple text similarity calculation (Levenshtein-like)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

/**
 * Map recipe ingredients to canonical taxonomy
 */
async function mapIngredientsToCanonical(
  ingredients: GPTRecipe['ingredients']
): Promise<MappedIngredient[]> {
  const results: MappedIngredient[] = [];

  for (const ingredient of ingredients) {
    const match = await matchIngredient(ingredient.nom);
    
    results.push({
      ...ingredient,
      canonicalId: match.canonicalId,
      canonicalName: match.canonicalName,
      confidence: match.confidence
    });

    if (match.needsReview) {
      logger.warn('Ingredient mapping needs review', {
        original: ingredient.nom,
  canonical: match.canonicalName,
        confidence: match.confidence
      });
    }
  }

  return results;
}

/**
 * Validate nutrition plausibility (±15% tolerance per MVP specs)
 */
function isNutritionPlausible(recipe: GPTRecipe): boolean {
  const {
    caloriesPerServing,
    proteinGPerServing,
    carbsGPerServing,
    fatGPerServing,
    titleFr
  } = recipe as any;

  // Paramètres alignés partout (GPT + code). Pas d’options magiques.
  const KCAL_DELTA_MAX_PCT = 0.15; // 15% comme ton implémentation actuelle
  const MIN_PROTEIN_G = 20;        // minimum réglementaire par portion

  // 1) Guard clauses basiques pour éviter les bêtises silencieuses
  const p = Number(proteinGPerServing);
  const c = Number(carbsGPerServing);
  const f = Number(fatGPerServing);
  const declared = Number(caloriesPerServing);

  if (![p, c, f, declared].every(Number.isFinite)) {
    logger?.warn?.('Recipe nutrition invalid numbers', { title: titleFr, p, c, f, declared });
    return false;
  }
  if (p < 0 || c < 0 || f < 0 || declared <= 0) {
    logger?.warn?.('Recipe nutrition negative or zero values', { title: titleFr, p, c, f, declared });
    return false;
  }

  // 2) Calories attendues depuis les macros
  const calculated = Math.round(p * 4 + c * 4 + f * 9);
  if (calculated <= 0) {
    logger?.warn?.('Recipe nutrition calculated calories <= 0', { title: titleFr, calculated });
    return false;
  }

  // 3) Ecart relatif entre déclaré et calculé
  const variance = Math.abs(declared - calculated) / calculated;
  if (variance > KCAL_DELTA_MAX_PCT) {
    logger?.warn?.('Recipe nutrition implausible (delta kcal)', {
      title: titleFr,
      declared,
      calculated,
      variance: Math.round(variance * 100) + '%'
    });
    return false;
  }

  // 4) Seuil protéique minimal
  if (p < MIN_PROTEIN_G) {
    logger?.warn?.('Recipe nutrition protein under minimum', { title: titleFr, proteinGPerServing: p });
    return false;
  }

  return true;
}


/**
 * Import GPT-generated recipes with canonical ingredient mapping
 */
export async function importGPTRecipes(gptRecipes: GPTRecipe[]): Promise<ImportResult> {
  const supabase = getServiceClient();
  const results: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    reviewRequired: [],
    ingredientMappings: new Map(),
    successfulRecipes: [],
    failedRecipes: []
  };

  logger.info('Starting recipe import', { totalRecipes: gptRecipes.length });

  for (const [index, gptRecipe] of gptRecipes.entries()) {
    try {
  logger.info('Processing recipe', { index: index + 1, title: gptRecipe.titleFr });

      // 1. Validate nutrition plausibility
      if (!isNutritionPlausible(gptRecipe)) {
        results.errors.push(`Implausible nutrition for "${gptRecipe.titleFr}"`);
        results.skipped++;
        continue;
      }

      // 2. Map ingredients to canonical taxonomy
      const mappedIngredients = await mapIngredientsToCanonical(gptRecipe.ingredients);
      
      // Check if too many ingredients need review
      const lowConfidenceCount = mappedIngredients.filter(ing => ing.confidence < 0.7).length;
      if (lowConfidenceCount > 2) {
        results.reviewRequired.push(`Recipe "${gptRecipe.titleFr}" has ${lowConfidenceCount} unmapped ingredients`);
        // Don't mark as failed just for low confidence ingredients - still import but flag for review
      }

      // 3. Prepare ingredients JSONB with canonical references
      const ingredientsWithCanonical = mappedIngredients.map(ing => ({
        nom: ing.nom,
        quantite: ing.quantite,
        unite: ing.unite,
        canonicalId: ing.canonicalId || null,
        canonicalName: ing.canonicalName || null
      }));

      // 4. Insert recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipe')
        .insert({
          titleFr: gptRecipe.titleFr,
            servingsBase: gptRecipe.servingsBase,
          prepTimeMinutes: gptRecipe.prepTimeMinutes,
          caloriesPerServing: gptRecipe.caloriesPerServing,
          proteinGPerServing: gptRecipe.proteinGPerServing,
          carbsGPerServing: gptRecipe.carbsGPerServing,
          fatGPerServing: gptRecipe.fatGPerServing,
          diet: gptRecipe.diet,
          proteinCategory: gptRecipe.proteinCategory,
          cookingLevel: gptRecipe.cookingLevel,
          equipmentRequired: gptRecipe.equipmentRequired,
          batchFriendly: gptRecipe.batchFriendly,
          allergens: gptRecipe.allergens || [],
          ingredients: ingredientsWithCanonical,
          instructions: gptRecipe.instructions,
          tags: gptRecipe.tags,
          cuisineType: gptRecipe.cuisineType,
          imageFilename: gptRecipe.imageFilename,
          cookingTip: gptRecipe.cookingTip,
          status: lowConfidenceCount > 2 ? 'review_needed' : 'active'
        })
        .select('id')
        .single();

      if (recipeError) {
  results.errors.push(`Failed to insert recipe "${gptRecipe.titleFr}": ${recipeError.message}`);
        results.skipped++;
        continue;
      }

      // 5. Insert recipe_ingredient junction records
      const junctionRecords = mappedIngredients
        .filter(ing => ing.canonicalId)
        .map(ing => ({
          recipeId: recipe.id,
          canonicalIngredientId: ing.canonicalId!,
          originalName: ing.nom,
          quantity: ing.quantite,
          unit: ing.unite,
          isOptional: ing.nom.toLowerCase().includes('optionnel')
        }));

      if (junctionRecords.length > 0) {
        const { error: junctionError } = await supabase
          .from('recipeIngredient')
          .insert(junctionRecords);

        if (junctionError) {
          logger.error('Failed to insert recipe ingredients', { 
            recipeId: recipe.id, 
            error: junctionError 
          });
        }
      }

      results.imported++;
      results.successfulRecipes.push(gptRecipe);
      logger.info('Recipe imported successfully', { 
        title: gptRecipe.titleFr,
        mappedIngredients: mappedIngredients.length,
        canonicalMatches: junctionRecords.length
      });

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Check if it's a duplicate recipe error
      if (errorMessage.includes('duplicate key value') && errorMessage.includes('recipe_titleFr_unique')) {
        logger.warn('Recipe already exists, skipping', { title: gptRecipe.titleFr });
        results.errors.push(`Recipe "${gptRecipe.titleFr}" already exists in database`);
      } else {
        results.errors.push(`Failed to import "${gptRecipe.titleFr}": ${errorMessage}`);
        results.failedRecipes.push(gptRecipe);
        logger.error('Recipe import failed', { title: gptRecipe.titleFr, error });
      }
      results.skipped++;
    }
  }

  logger.info('Recipe import completed', {
    imported: results.imported,
    skipped: results.skipped,
    errors: results.errors.length,
    reviewRequired: results.reviewRequired.length
  });

  return results;
}

/**
 * Move successfully imported recipes from source to destination file
 */
export async function moveSuccessfulRecipes(
  sourceFile: string,
  destinationFile: string,
  successfulRecipes: GPTRecipe[],
  failedRecipes: GPTRecipe[]
): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Read destination file (recipes.json) to append successful recipes
    let destinationData: { recipes: unknown[] } = { recipes: [] };
    if (fs.existsSync(destinationFile)) {
      const destinationContent = fs.readFileSync(destinationFile, 'utf8');
      destinationData = JSON.parse(destinationContent);
      if (!destinationData.recipes || !Array.isArray(destinationData.recipes)) {
        destinationData = { recipes: [] };
      }
    }

    // Convert successful recipes back to raw format for storage
    const rawSuccessfulRecipes = successfulRecipes.map(recipe => convertToRawRecipe(recipe));
    
    // Add successful recipes to destination
    destinationData.recipes.push(...rawSuccessfulRecipes);
    
    // Write updated destination file
    fs.writeFileSync(destinationFile, JSON.stringify(destinationData, null, 2), 'utf8');
    logger.info('Moved successful recipes to recipes.json', { 
      count: successfulRecipes.length,
      destinationFile 
    });

    // Update source file with only failed recipes
    const sourceData = {
      recipes: failedRecipes.map(recipe => convertToRawRecipe(recipe))
    };
    
    fs.writeFileSync(sourceFile, JSON.stringify(sourceData, null, 2), 'utf8');
    logger.info('Updated source file with failed recipes only', { 
      failedCount: failedRecipes.length,
      sourceFile 
    });
    
  } catch (error) {
    logger.error('Failed to move recipes between files', { 
      sourceFile, 
      destinationFile, 
      error 
    });
    throw error;
  }
}

/**
 * Convert GPTRecipe back to raw format for JSON storage
 */
function convertToRawRecipe(recipe: GPTRecipe): unknown {
  const raw: any = {
    title_fr: recipe.titleFr,
    diet: recipe.diet,
    protein_category: recipe.proteinCategory,
    cooking_level: recipe.cookingLevel,
    prep_time_minutes: recipe.prepTimeMinutes,
    calories_per_serving: recipe.caloriesPerServing,
    protein_g_per_serving: recipe.proteinGPerServing,
    carbs_g_per_serving: recipe.carbsGPerServing,
    fat_g_per_serving: recipe.fatGPerServing,
    equipment_required: recipe.equipmentRequired,
    batch_friendly: recipe.batchFriendly,
    allergens: recipe.allergens,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    servings_base: recipe.servingsBase
  };
  
  // Add optional fields if they exist
  if (recipe.imageFilename) raw.image_filename = recipe.imageFilename;
  if (recipe.cuisineType) raw.cuisine_type = recipe.cuisineType;
  if (recipe.cookingTip) raw.cooking_tip = recipe.cookingTip;
  
  return raw;
}

/**
 * Load and import recipes from recipes.json with automatic recipe file management
 */
export async function importRecipesFromJson(jsonPath: string): Promise<ImportResult> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(fileContent);
    if (!data.recipes || !Array.isArray(data.recipes)) {
      throw new Error('Invalid recipes.json format: missing recipes array');
    }
    
    const transformed: GPTRecipe[] = data.recipes.map((r: unknown, i: number) => {
      try {
        return transformRawRecipe(r);
      } catch (e) {
        logger.error('Recipe validation failed', { index: i, error: e });
        throw e;
      }
    });
    
    const results = await importGPTRecipes(transformed);
    
    // If we have successful recipes and this is the new_recipes_to_import file, move recipes
    const isNewRecipesFile = path.basename(jsonPath) === 'new_recipes_to_import.json';
    if (isNewRecipesFile && (results.successfulRecipes.length > 0 || results.failedRecipes.length > 0)) {
      const recipesJsonPath = path.join(path.dirname(jsonPath), 'recipes.json');
      await moveSuccessfulRecipes(jsonPath, recipesJsonPath, results.successfulRecipes, results.failedRecipes);
    }
    
    return results;
  } catch (error) {
    logger.error('Failed to load recipes from JSON', { jsonPath, error });
    throw error;
  }
}