import type { NextApiRequest, NextApiResponse } from "next";
import { setZodErrorMapFR, formatZodErrors } from "@/schemas/zodErrorMap.fr";
import { submitRequestSchema } from "@/schemas/submitRequest.schema";
import { normalizeFormInput } from "@/schemas/normalizeFormInput";
import { normalizedInputSchema } from "@/schemas/normalizedInput.schema";
import { verifyAndExtractRecaptcha } from "@/lib/auth";
import { detectClientIP } from "@/lib/auth";
import { upsertUserAndSubmission, usersRepository } from "@/lib/supabase";
import { checkUserAccess, shouldUpdateUserStatus } from "@/lib/supabase/userAccess";
import { createLogger, redact } from "@/lib/logger";
import type { RecaptchaMetadata } from "@/schemas/api.types";

setZodErrorMapFR();

/**
 * Quick access check endpoint - validates user access without heavy processing
 * Returns 403 if access denied, 200 if access granted
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  const logger = createLogger();

  // Secure IP detection with confidence assessment
  const ipDetection = detectClientIP(req);
  logger.info("Access check request started", {
    method: req.method,
    path: req.url,
    userAgent: req.headers['user-agent'],
    ip: redact(ipDetection.ip),
    ipSource: ipDetection.source,
    ipConfidence: ipDetection.confidence
  });

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
    logger.error('Request validation failed', {
      errors: formatZodErrors(parsed.error),
      rawDataKeys: Object.keys(raw || {})
    });
    return res.status(400).json({ errors: formatZodErrors(parsed.error) });
  }

  const candidate = normalizeFormInput(parsed.data.form);
  const norm = normalizedInputSchema.safeParse(candidate);
  if (!norm.success) {
    logger.error('Input normalization failed', {
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

  // Create user and submission record for tracking
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

  // Get user details for access check
  let user;
  try {
    user = await usersRepository.findById(submissionResult.userId);
    if (!user) {
      logger.error('User not found after upsert', { userId: submissionResult.userId });
      return res.status(500).json({ error: "Erreur utilisateur." });
    }
  } catch (err) {
    logger.error('User lookup failed', { error: err, userId: submissionResult.userId });
    return res.status(500).json({ error: "Erreur lors de la récupération des données utilisateur." });
  }

  // Update expired subscriptions
  const statusCheck = shouldUpdateUserStatus(user);
  if (statusCheck.needsUpdate && statusCheck.newStatus) {
    try {
      await usersRepository.updateStatus(user.id, statusCheck.newStatus);
      user.status = statusCheck.newStatus;
      logger.info('User status updated', {
        userId: user.id,
        oldStatus: user.status,
        newStatus: statusCheck.newStatus
      });
    } catch (err) {
      logger.warn('User status update failed (non-blocking)', { error: err });
    }
  }

  // CRITICAL ACCESS CHECK
  const accessCheck = checkUserAccess(user);
  if (!accessCheck.canAccess) {
    logger.info('User access denied', {
      userId: user.id,
      reason: accessCheck.reason,
      nextAction: accessCheck.nextAction
    });

    return res.status(403).json({
      error: accessCheck.reason || "Accès non autorisé",
      nextAction: accessCheck.nextAction,
      needsPayment: accessCheck.nextAction === 'redirect_to_payment'
    });
  }

  // Access granted - return success immediately
  const totalTime = Date.now() - startTime;
  logger.info('Access check completed successfully', {
    submissionId: submissionResult.submissionId,
    userId: user.id,
    status: user.status,
    duration: totalTime
  });

  return res.status(200).json({
    ok: true,
    submissionId: submissionResult.submissionId,
    userId: user.id,
    canProceed: true
  });
}