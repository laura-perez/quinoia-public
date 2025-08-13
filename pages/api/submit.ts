import type { NextApiRequest, NextApiResponse } from "next";
import { setZodErrorMapFR, formatZodErrors } from "@/schemas/zodErrorMap.fr";
import { submitRequestSchema } from "@/schemas/submitRequest.schema";
import { normalizeFormInput } from "@/schemas/normalizeFormInput";
import { normalizedInputSchema } from "@/schemas/normalizedInput.schema";
import { verifyAndExtractRecaptcha } from "@/lib/recaptcha";
import { upsertUserAndSubmission } from "@/lib/supabaseServer";
import { triggerN8n } from "@/lib/n8n";
import { createLogger, redact } from "@/lib/logger";

setZodErrorMapFR();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  const logger = createLogger();
  logger.info("API request started", { 
    method: req.method,
    path: req.url,
    userAgent: req.headers['user-agent'],
    ip: redact(req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || "unknown"),
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
    const recaptcha = await verifyAndExtractRecaptcha(parsed.data.recaptchaToken, req.headers["x-forwarded-for"] as string | undefined);
    if (!recaptcha.ok) {
      logger.error('reCAPTCHA verification failed', { error: recaptcha.error });
      return res.status(403).json({ error: recaptcha.error });
    }
    recaptchaMeta = recaptcha.meta;
    logger.info('reCAPTCHA verification successful', { score: recaptcha.meta?.score });
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
