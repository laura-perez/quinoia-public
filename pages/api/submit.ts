import type { NextApiRequest, NextApiResponse } from 'next'
import { setZodErrorMapFR, formatZodErrors } from '@/schemas/zodErrorMap.fr'
import { submitRequestSchema } from '@/schemas/submitRequest.schema'
import { normalizeFormInput } from '@/schemas/normalizeFormInput'
import { normalizedInputSchema } from '@/schemas/normalizedInput.schema'
import { verifyAndExtractRecaptcha } from '@/lib/auth'
import { detectClientIP } from '@/lib/auth'
import { upsertUserAndSubmission, usersRepository } from '@/lib/supabase'
import { USER_STATUS } from '@/lib/supabase/types/user.types'
import { saveMenuResult } from '@/lib/supabase/menuResults'
import { createLogger } from '@/lib/logger'
import { selectRecipes } from '@/lib/recipes/recipeSelector'
import { generateShoppingList } from '@/lib/recipes/shoppingListGenerator'
import { createAndSendMagicLinkForWelcome } from '@/lib/auth/magicLinkHelper'
import type { RecaptchaMetadata } from '@/schemas/api.types'
import { env } from '@/lib/config'

setZodErrorMapFR()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now()
  const logger = createLogger()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  let raw: any
  try {
    raw = req.body
    if (typeof raw === 'string') raw = JSON.parse(raw)
  } catch (err) {
    logger.error('Invalid submit body', { error: err })
    return res.status(400).json({ error: 'Corps de requête invalide' })
  }

  const parsed = submitRequestSchema.safeParse(raw)
  if (!parsed.success) return res.status(400).json({ errors: formatZodErrors(parsed.error) })

  const candidate = normalizeFormInput(parsed.data.form)
  const norm = normalizedInputSchema.safeParse(candidate)
  if (!norm.success) return res.status(400).json({ errors: formatZodErrors(norm.error) })

  const ipDetection = detectClientIP(req)

  // Verify reCAPTCHA
  let recaptchaMeta: RecaptchaMetadata | undefined
  try {
    const recaptcha = await verifyAndExtractRecaptcha(parsed.data.recaptchaToken, ipDetection.confidence !== 'low' ? ipDetection.ip : undefined)
    if (!recaptcha.ok) return res.status(403).json({ error: recaptcha.error })
    recaptchaMeta = recaptcha.meta!
  } catch (err) {
    logger.error('reCAPTCHA failure', { error: err })
    return res.status(500).json({ error: 'Erreur reCAPTCHA' })
  }

  // Lookup existing user
  let existingUser: any | null = null
  try {
    // Normalize email for lookups and persistence to avoid duplicates
    const normalizedEmailForLookup = (norm.data.email || '').toLowerCase().trim()
    existingUser = await usersRepository.findByEmail(normalizedEmailForLookup)
  } catch (err) {
    logger.error('User lookup failed', { error: err })
    return res.status(500).json({ error: 'Erreur interne' })
  }

  // Helper to build and save menu (selection + shopping list + save)
  const buildAndSaveMenu = async (userId: string) => {
    // Defensive: ensure we have the submission id required by downstream funcs
    if (!submissionIdGlobal) {
      const msg = 'Missing submissionIdGlobal when building menu'
      logger.error(msg, { userId, email: norm.data.email })
      throw new Error(msg)
    }

    const selectionContext = {
      userId,
      diet: norm.data.diet,
      proteinPreferences: norm.data.proteinPreferences || [],
      equipmentAvailable: norm.data.equipmentAvailable || [],
      cookingLevel: norm.data.cookingLevel,
      numRecipes: norm.data.numRecipes + 3, // Generate N active + 3 pool recipes
      numServings: norm.data.numServings,
      batchMode: norm.data.batchMode,
      favoriteFoods: norm.data.favoriteFoods,
      dislikedFoods: norm.data.dislikedFoods,
      proteinFloorG: 20,
      primaryGoal: 'eatHealthier',
    }

    let recipeResults: any
    try {
      recipeResults = await selectRecipes(selectionContext, { userEmail: norm.data.email, submissionId: submissionIdGlobal })
    } catch (err) {
      logger.error('selectRecipes failed', {
        error: err instanceof Error ? err.stack || err.message : String(err),
        selectionContext,
        submissionId: submissionIdGlobal,
        userId,
        email: norm.data.email
      })
      throw err
    }

    // Scale ingredients for all recipes first
    const scaledRecipes = recipeResults.selectedRecipes.map((recipe: any) => ({ ...recipe, ingredients: recipe.ingredients.map((ing: any) => ({ ...ing, quantite: (ing.quantite || 0) * (norm.data.numServings / 2) })) }))

    // Split recipes: first N = active (visible), last 3 = swap pool (hidden until login)
    const activeRecipes = scaledRecipes.slice(0, norm.data.numRecipes)
    const swapPoolRecipes = scaledRecipes.slice(norm.data.numRecipes, norm.data.numRecipes + 3)
    const activeRecipeIds = activeRecipes.map((r: any) => r.id)
    const swapPoolRecipeIds = swapPoolRecipes.map((r: any) => r.id)

    // Generate shopping list ONLY for active recipes (user doesn't see swap pool yet)
    let shoppingList: any
    try {
      const recipesWithServingsBase = activeRecipes.map((r: any) => ({ ...r, servingsBase: 2 }))
      shoppingList = await generateShoppingList(recipesWithServingsBase, norm.data.numServings)
    } catch (err) {
      logger.error('generateShoppingList failed', {
        error: err instanceof Error ? err.stack || err.message : String(err),
        numServings: norm.data.numServings,
        submissionId: submissionIdGlobal,
        email: norm.data.email
      })
      throw err
    }

    const resultBundle = {
      version: 'v3.0_native',
      generatedAt: new Date().toISOString(),
      meta: { numRecipes: norm.data.numRecipes, numServings: norm.data.numServings, selectionStrategy: recipeResults.scoringDetails?.diversityStrategy, processingTimeMs: Date.now() - startTime },
      userProfile: { firstName: norm.data.firstName || 'Utilisateur' },
      recipes: activeRecipes, // Only active recipes visible to trial user (swap pool hidden)
      shoppingList,
      nutritionSummary: recipeResults.nutritionSummary,
      scoringDetails: recipeResults.scoringDetails,
      aiTips: null,
    }

    let saveResult: any
    try {
      saveResult = await saveMenuResult({
        submissionId: submissionIdGlobal,
        userId,
        resultBundle,
        numRecipes: norm.data.numRecipes,
        numServings: norm.data.numServings,
        activeRecipeIds,
        swapPoolRecipeIds
      })
    } catch (err) {
      logger.error('saveMenuResult threw', {
        error: err instanceof Error ? err.stack || err.message : String(err),
        submissionId: submissionIdGlobal,
        userId,
        email: norm.data.email
      })
      throw err
    }

    if (!saveResult || !saveResult.success || !saveResult.menuResult) {
      const errMsg = saveResult?.error || 'Failed to save menu'
      logger.error('saveMenuResult returned failure', { error: errMsg, submissionId: submissionIdGlobal, userId, email: norm.data.email })
      throw new Error(errMsg)
    }

    return { menuResult: saveResult.menuResult, resultBundle, shoppingList, recipeResults }
  }

  // We'll need submissionId for saveMenuResult; create submission regardless for allowed flows
  let submissionIdGlobal: string | null = null

  // No existing user -> create trial user and proceed
  if (!existingUser) {
    try {
      const normalizedEmail = (norm.data.email || '').toLowerCase().trim()
  const user = await usersRepository.upsert({ email: normalizedEmail, firstName: norm.data.firstName || undefined, status: USER_STATUS.TRIAL_AVAILABLE })
      const submission = await upsertUserAndSubmission({ email: normalizedEmail, normalizedInput: norm.data, recaptchaMeta, rawFormData: parsed.data.form })
      submissionIdGlobal = submission.submissionId

  const { menuResult, resultBundle, shoppingList, recipeResults } = await buildAndSaveMenu(submission.userId)

  try { await usersRepository.updateLastSubmission(submission.userId, menuResult.id) } catch (err) { logger.error('updateLastSubmission failed', { error: err }) }
  try { await usersRepository.markTrialAsUsed(submission.userId) } catch (err) { logger.error('markTrialAsUsed failed', { error: err }) }

  // Generate magic link and send welcome email
  await createAndSendMagicLinkForWelcome({
    email: normalizedEmail,
    firstName: norm.data.firstName || null,
    shareId: menuResult.shareId,
    ipAddress: ipDetection.ip,
    userAgent: req.headers['user-agent'] || null
  });

  const baseUrl = env.APP_BASE_URL;
  return res.status(200).json({ ok: true, submissionId: submission.submissionId, shareId: menuResult.shareId, shareUrl: `${baseUrl}/menu/${menuResult.shareId}`, resultBundle })
    } catch (err) {
      logger.error('Public submit create user flow failed', { error: err })
      return res.status(500).json({ error: 'Erreur interne' })
    }
  }

  // Existing user flows
  const status = existingUser.status
  if (status === USER_STATUS.PAID_ACTIVE) {
    return res.status(403).json({ error: 'Account exists', redirectTo: '/dashboard' })
  }

  if (status === USER_STATUS.TRIAL_USED || status === USER_STATUS.PAID_EXPIRED) {
    return res.status(403).json({ error: 'Essai déjà utilisé', redirectTo: `/tarifs?reason=trial-expired` })
  }

  if (status === USER_STATUS.TRIAL_AVAILABLE) {
    // Allow generation for existing trial_available user
    try {
      const normalizedEmail = (norm.data.email || '').toLowerCase().trim()
      const submission = await upsertUserAndSubmission({ email: normalizedEmail, normalizedInput: norm.data, recaptchaMeta, rawFormData: parsed.data.form })
      submissionIdGlobal = submission.submissionId

  const { menuResult, resultBundle, shoppingList, recipeResults } = await buildAndSaveMenu(submission.userId)

  try { await usersRepository.updateLastSubmission(submission.userId, menuResult.id) } catch (err) { logger.error('updateLastSubmission failed', { error: err }) }
  try { await usersRepository.markTrialAsUsed(submission.userId) } catch (err) { logger.error('markTrialAsUsed failed', { error: err }) }

  // Generate magic link and send welcome email
  await createAndSendMagicLinkForWelcome({
    email: normalizedEmail,
    firstName: norm.data.firstName || null,
    shareId: menuResult.shareId,
    ipAddress: ipDetection.ip,
    userAgent: req.headers['user-agent'] || null
  });

  const baseUrl = env.APP_BASE_URL;
  return res.status(200).json({ ok: true, submissionId: submission.submissionId, shareId: menuResult.shareId, shareUrl: `${baseUrl}/menu/${menuResult.shareId}`, resultBundle })
    } catch (err) {
      logger.error('Existing trial_available submit failed', { error: err })
      return res.status(500).json({ error: 'Erreur interne' })
    }
  }

  // Default reject for any other known statuses
  return res.status(403).json({ error: 'Account exists', redirectTo: '/dashboard' })
}
