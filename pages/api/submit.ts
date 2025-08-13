import type { NextApiRequest, NextApiResponse } from "next";
import { setZodErrorMapFR, formatZodErrors } from "@/schemas/zodErrorMap.fr";
import { submitRequestSchema } from "@/schemas/submitRequest.schema";
import { normalizeFormInput } from "@/schemas/normalizeFormInput";
import { normalizedInputSchema } from "@/schemas/normalizedInput.schema";
import { verifyAndExtractRecaptcha } from "@/lib/auth";
import { detectClientIP } from "@/lib/auth";
import { upsertUserAndSubmission } from "@/lib/database";
import { triggerN8n } from "@/lib/integrations";
import { createLogger, redact } from "@/lib/logger";

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
    hasProteinPreferences: Boolean(norm.data.proteinPreferences?.length),
    primaryGoal: norm.data.primaryGoal,
    diet: norm.data.diet
  });

  // Vérification reCAPTCHA serveur
  let recaptchaMeta;
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
    recaptchaMeta = recaptcha.meta;
    logger.info('reCAPTCHA verification successful', { 
      score: recaptcha.meta?.score,
      ipConfidence: ipDetection.confidence
    });
  } catch (err) {
    logger.error('reCAPTCHA verification error', { error: err });
    return res.status(500).json({ error: "Erreur lors de la vérification reCAPTCHA." });
  }

  // Upsert user and submission
  let submissionId;
  try {
    submissionId = await upsertUserAndSubmission({
      email: norm.data.email,
      normalizedInput: norm.data,
      recaptchaMeta,
      rawFormData: parsed.data.form,
    });
    logger.info('Database upsert successful', { 
      submissionId,
      email: redact(norm.data.email)
    });
  } catch (err) {
    logger.error('Database upsert failed', { error: err });
    return res.status(500).json({ error: "Erreur lors de l'enregistrement en base de données.", details: String(err) });
  }

  // Trigger n8n workflow
  let n8nResult;
  try {
    n8nResult = await triggerN8n({
      submissionId,
      input: norm.data,
    });
    logger.info('n8n workflow triggered successfully', { 
      submissionId,
      n8nExecutionId: n8nResult?.executionId 
    });
  } catch (err) {
    logger.error('n8n workflow failed', { error: err, submissionId });
    return res.status(502).json({ error: "Erreur lors du traitement n8n.", details: String(err) });
  }

  const totalTime = Date.now() - startTime;
  
  logger.info('API request completed successfully', {
    submissionId,
    duration: totalTime,
    email: redact(norm.data.email)
  });
  
  return res.status(200).json({ ok: true, submissionId, resultBundle: n8nResult });
}
