import type { NextApiRequest, NextApiResponse } from "next";
import { setZodErrorMapFR, formatZodErrors } from "@/schemas/zodErrorMap.fr";
import { submitRequestSchema } from "@/schemas/submitRequest.schema";
import { normalizeFormInput } from "@/schemas/normalizeFormInput";
import { normalizedInputSchema } from "@/schemas/normalizedInput.schema";
import { verifyAndExtractRecaptcha } from "@/lib/recaptcha";
import { upsertUserAndSubmission } from "@/lib/supabaseServer";
import { triggerN8n } from "@/lib/n8n";


setZodErrorMapFR();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  let raw: any;
  try {
    raw = req.body;
    if (typeof raw === "string") raw = JSON.parse(raw);
  } catch (e) {
    console.error('❌ [API] Invalid request body:', e);
    return res.status(400).json({ error: "Corps de requête invalide" });
  }

  const parsed = submitRequestSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('❌ [API] Submit request validation failed:', formatZodErrors(parsed.error));
    return res.status(400).json({ errors: formatZodErrors(parsed.error) });
  }

  const candidate = normalizeFormInput(parsed.data.form);
  const norm = normalizedInputSchema.safeParse(candidate);
  if (!norm.success) {
    console.error('❌ [API] Normalized input validation failed:', formatZodErrors(norm.error));
    return res.status(400).json({ errors: formatZodErrors(norm.error) });
  }

  // Vérification reCAPTCHA serveur
  let recaptchaMeta;
  try {
    const recaptcha = await verifyAndExtractRecaptcha(parsed.data.recaptchaToken, req.headers["x-forwarded-for"] as string | undefined);
    if (!recaptcha.ok) {
      console.error('❌ [API] reCAPTCHA verification failed:', recaptcha.error);
      return res.status(403).json({ error: recaptcha.error });
    }
    recaptchaMeta = recaptcha.meta;
  } catch (err) {
    console.error('❌ [API] reCAPTCHA verification error:', err);
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
  } catch (err) {
    console.error('❌ [API] Database upsert failed:', err);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement en base de données.", details: String(err) });
  }

  // Trigger n8n workflow
  let n8nResult;
  try {
    n8nResult = await triggerN8n({
      submissionId,
      input: norm.data,
    });
  } catch (err) {
    console.error('❌ [API] n8n workflow failed:', err);
    return res.status(502).json({ error: "Erreur lors du traitement n8n.", details: String(err) });
  }

  const totalTime = Date.now() - startTime;
  return res.status(200).json({ ok: true, submissionId, resultBundle: n8nResult });
}
