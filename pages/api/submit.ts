import type { NextApiRequest, NextApiResponse } from "next";
import { setZodErrorMapFR, formatZodErrors } from "@/schemas/zodErrorMap.fr";
import { submitRequestSchema } from "@/schemas/submitRequest.schema";
import { normalizeFormInput } from "@/schemas/normalizeFormInput";
import { normalizedInputSchema } from "@/schemas/normalizedInput.schema";
import { verifyAndExtractRecaptcha } from "@/lib/auth";
import { detectClientIP } from "@/lib/auth";
import { upsertUserAndSubmission } from "@/lib/supabase";
import { createLogger, redact } from "@/lib/logger";
import { selectRecipes } from "@/lib/recipes/recipeSelector";
import { generateShoppingList } from "@/lib/recipes/shoppingListGenerator";
import { saveMenuResult } from "@/lib/supabase/menuResults";
import { sendWelcomeMenuEmail } from "@/lib/email";
import type { RecaptchaMetadata } from "@/schemas/api.types";

setZodErrorMapFR();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  const logger = createLogger();
  // Secure IP detection with confidence assessment
  const ipDetection = detectClientIP(req);
  logger.info("API request started", { 
    method: req.method,
    path: req.url,
    userAgent: req.headers['user-agent'],
    ip: redact(ipDetection.ip),
    ipSource: ipDetection.source,
    ipConfidence: ipDetection.confidence,
    ipCandidateCount: ipDetection.allCandidates.length
  });
  
  // Log security warning for low confidence IP detection
  if (ipDetection.confidence === 'low') {
    logger.warn("Low confidence IP detection - potential spoofing", {
      ip: redact(ipDetection.ip),
      source: ipDetection.source,
      allCandidates: ipDetection.allCandidates.map(c => ({ 
        ip: redact(c.ip), 
        source: c.source 
      }))
    });
  }

  // Ajouter le runId aux headers de réponse pour le tracing
  res.setHeader('X-Run-ID', logger.getRunId());
  
  if (req.method !== "POST") {
    logger.warn("Invalid method", { method: req.method });
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  let raw: any;
  try {
    raw = req.body;
    if (typeof raw === "string") raw = JSON.parse(raw);
  } catch (e) {
    logger.error('Invalid request body', { error: e });
    return res.status(400).json({ error: "Corps de requête invalide" });
  }

  const parsed = submitRequestSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('Submit request validation failed', { 
      errors: formatZodErrors(parsed.error),
      rawDataKeys: Object.keys(raw || {})
    });
    return res.status(400).json({ errors: formatZodErrors(parsed.error) });
  }

  const candidate = normalizeFormInput(parsed.data.form);
  const norm = normalizedInputSchema.safeParse(candidate);
  if (!norm.success) {
    logger.error('Normalized input validation failed', { 
      errors: formatZodErrors(norm.error),
      candidateKeys: Object.keys(candidate || {})
    });
    return res.status(400).json({ errors: formatZodErrors(norm.error) });
  }

  logger.info('Form data validated successfully', {
    email: redact(norm.data.email),
    diet: norm.data.diet
  });

  // Vérification reCAPTCHA serveur
  let recaptchaMeta: RecaptchaMetadata;
  try {
    // Use the secure IP detection result instead of raw header
    const recaptcha = await verifyAndExtractRecaptcha(
      parsed.data.recaptchaToken, 
      ipDetection.confidence !== 'low' ? ipDetection.ip : undefined
    );
    if (!recaptcha.ok) {
      logger.error('reCAPTCHA verification failed', { 
        error: recaptcha.error,
        ip: redact(ipDetection.ip),
        ipConfidence: ipDetection.confidence
      });
      return res.status(403).json({ error: recaptcha.error });
    }
    recaptchaMeta = recaptcha.meta!;
    logger.info('reCAPTCHA verification successful', { 
      score: recaptcha.meta?.score,
      ipConfidence: ipDetection.confidence
    });
  } catch (err) {
    logger.error('reCAPTCHA verification error', { error: err });
    return res.status(500).json({ error: "Erreur lors de la vérification reCAPTCHA." });
  }

  // Upsert user and submission
  let submissionResult;
  try {
    submissionResult = await upsertUserAndSubmission({
      email: norm.data.email,
      normalizedInput: norm.data,
      recaptchaMeta,
      rawFormData: parsed.data.form,
    });
    logger.info('Database upsert successful', { 
      submissionId: submissionResult.submissionId,
      userId: submissionResult.userId,
      email: redact(norm.data.email)
    });
  } catch (err) {
    logger.error('Database upsert failed', { error: err });
    return res.status(500).json({ error: "Erreur lors de l'enregistrement en base de données." });
  }

  // Native recipe selection and shopping list generation
  let recipeResults;
  try {
    // Default protein floor (no longer based on goals)
    const proteinFloorG = 25; // 25g minimum par défaut

    const selectionContext = {
      userId: submissionResult.userId,
      diet: norm.data.diet,
      proteinPreferences: norm.data.proteinPreferences || [],
      equipmentAvailable: norm.data.equipmentAvailable || [],
      cookingLevel: norm.data.cookingLevel,
      numRecipes: norm.data.numRecipes,
      numServings: norm.data.numServings,
      batchMode: norm.data.batchMode,
      favoriteFoods: norm.data.favoriteFoods,
      dislikedFoods: norm.data.dislikedFoods,
      proteinFloorG,
      primaryGoal: "eatHealthier", // Default goal since no longer collected
    };

    // Native recipe selection
    recipeResults = await selectRecipes(selectionContext, {
      userEmail: norm.data.email,
      submissionId: submissionResult.submissionId
    });
    
    logger.info('Native recipe selection completed', { 
      submissionId: submissionResult.submissionId,
      userId: submissionResult.userId,
      selectedCount: recipeResults.selectedRecipes.length,
      fallbacksUsed: recipeResults.scoringDetails.fallbacksUsed
    });
  } catch (err) {
    logger.error('Recipe selection failed', { 
      error: err, 
      submissionId: submissionResult.submissionId 
    });
    return res.status(500).json({ error: "Erreur lors de la sélection des recettes." });
  }

  // Generate intelligent shopping list
  let shoppingList;
  try {
    // Add servingsBase property expected by shopping list service
    const recipesWithServingsBase = recipeResults.selectedRecipes.map(recipe => ({
      ...recipe,
      servingsBase: 2 // All recipes in database serve 2 portions by default
    }));

    shoppingList = await generateShoppingList(
      recipesWithServingsBase,
      norm.data.numServings
    );
    
    logger.info('Shopping list generated successfully', { 
      submissionId: submissionResult.submissionId,
      totalItems: shoppingList.summary.totalItems,
      aggregationRatio: `${Math.round((recipeResults.selectedRecipes.reduce((sum, r) => sum + r.ingredients.length, 0) - shoppingList.summary.totalItems) / recipeResults.selectedRecipes.reduce((sum, r) => sum + r.ingredients.length, 0) * 100)}%`,
      unmappedIngredients: shoppingList.summary.unmappedIngredients
    });
  } catch (err) {
    logger.error('Shopping list generation failed', { 
      error: err, 
      submissionId: submissionResult.submissionId 
    });
    return res.status(500).json({ error: "Erreur lors de la génération de la liste de courses." });
  }

  // Generate AI tips
  let aiTips;
  try {
    const { generatePersonalizedTips } = await import('@/lib/ai/tipsGenerator');

    aiTips = await generatePersonalizedTips({
      recipes: recipeResults.selectedRecipes,
      userProfile: {
        firstName: norm.data.firstName || 'Utilisateur',
        gender: norm.data.gender,
        age: String(norm.data.age),
        cookingLevel: norm.data.cookingLevel
      },
      dietContext: {
        diet: norm.data.diet,
        proteinPreferences: norm.data.proteinPreferences || []
      },
      nutritionSummary: recipeResults.nutritionSummary
    });

    logger.info('AI tips generated successfully', {
      submissionId: submissionResult.submissionId,
      generalTipsCount: aiTips.generalTips.length,
      recipeTipsCount: Object.keys(aiTips.recipeTips).length
    });
  } catch (err) {
    logger.error('AI tips generation failed', {
      error: err,
      submissionId: submissionResult.submissionId
    });

    // Use fallback tips
    const { FALLBACK_GENERAL_TIPS } = await import('@/lib/ai/types');
    aiTips = {
      generalTips: FALLBACK_GENERAL_TIPS,
      recipeTips: {}
    };
  }

  // Scale recipe ingredients to user-selected servings (base servings = 2)
  const scaledRecipes = recipeResults.selectedRecipes.map(recipe => ({
    ...recipe,
    ingredients: recipe.ingredients.map(ingredient => ({
      ...ingredient,
      quantite: (ingredient.quantite || 0) * (norm.data.numServings / 2) // Scale from base 2 servings
    }))
  }));

  // Create result bundle
  const resultBundle = {
    version: "v3.0_native",
    generatedAt: new Date().toISOString(),
    meta: {
      numRecipes: norm.data.numRecipes,
      numServings: norm.data.numServings,
      selectionStrategy: recipeResults.scoringDetails.diversityStrategy,
      processingTimeMs: Date.now() - startTime
    },
    userProfile: {
      firstName: norm.data.firstName || 'Utilisateur'
    },
    recipes: scaledRecipes,
    shoppingList: shoppingList,
    nutritionSummary: recipeResults.nutritionSummary,
    scoringDetails: recipeResults.scoringDetails,
    aiTips: aiTips
  };

  // Save menu result with shareId generation
  let menuResult;
  try {
    const saveResult = await saveMenuResult({
      submissionId: submissionResult.submissionId,
      userId: submissionResult.userId,
      resultBundle,
      numRecipes: norm.data.numRecipes,
      numServings: norm.data.numServings
    });

    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save menu result');
    }

    menuResult = saveResult.menuResult!;
    
    logger.info('Menu result saved successfully', {
      submissionId: submissionResult.submissionId,
      shareId: menuResult.shareId,
      menuResultId: menuResult.id
    });
  } catch (err) {
    logger.error('Menu result save failed', { 
      error: err, 
      submissionId: submissionResult.submissionId 
    });
    return res.status(500).json({ error: "Erreur lors de la sauvegarde du menu." });
  }

  // Send welcome email with menu
  try {
    await sendWelcomeMenuEmail({
      user: {
        id: submissionResult.userId,
        email: norm.data.email,
        firstName: norm.data.firstName
      },
      menu: {
        shareId: menuResult.shareId,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://quinoia.fr'}/menu/${menuResult.shareId}`,
        recipes: recipeResults.selectedRecipes,
        numServings: norm.data.numServings,
        numRecipes: norm.data.numRecipes,
        shoppingList: shoppingList,
        nutritionSummary: recipeResults.nutritionSummary
      }
    });

    logger.info('Welcome email sent successfully', {
      submissionId: submissionResult.submissionId,
      shareId: menuResult.shareId
    });
  } catch (emailError) {
    // Log email error but don't fail the API request
    logger.error('Welcome email failed (non-blocking)', {
      submissionId: submissionResult.submissionId,
      shareId: menuResult.shareId,
      error: emailError
    });
  }

  const totalTime = Date.now() - startTime;

  logger.info('API request completed successfully (native)', {
    submissionId: submissionResult.submissionId,
    duration: totalTime,
    email: redact(norm.data.email),
    recipesSelected: recipeResults.selectedRecipes.length,
    shoppingItemsGenerated: shoppingList.summary.totalItems,
    version: "v3.0_native"
  });

  return res.status(200).json({
    ok: true,
    submissionId: submissionResult.submissionId,
    shareId: menuResult.shareId,
    shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://quinoia.fr'}/menu/${menuResult.shareId}`,
    resultBundle: resultBundle
  });
}
