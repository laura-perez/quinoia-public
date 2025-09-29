import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getServiceClient, usersRepository } from "@/lib/supabase";
import { createLogger, redact } from "@/lib/logger";
import { detectClientIP } from "@/lib/auth";

// Validation schema
const marketStudySchema = z.object({
  galeres: z.array(z.string()).max(2),
  autreGalere: z.string().max(120).optional(),
  solutionsActuelles: z.enum(['oui', 'non']),
  solutionActuelleName: z.string().optional(),
  valeurPercue: z.enum(['oui', 'non', 'peut-etre']),
  prixAcceptable: z.enum(['<5', '5-10', '10-20', '>20']),
  veutTester: z.enum(['oui', 'non']),
  email: z.string().email().optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createLogger();
  const ipDetection = detectClientIP(req);

  logger.info("Market study submission started", {
    method: req.method,
    ip: redact(ipDetection.ip),
    userAgent: req.headers['user-agent']?.substring(0, 100)
  });

  if (req.method !== "POST") {
    logger.warn("Invalid method", { method: req.method });
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  // Parse and validate data
  let parsedData;
  try {
    parsedData = marketStudySchema.parse(req.body);
  } catch (error) {
    logger.error('Validation failed', { error });
    return res.status(400).json({ error: "Données invalides" });
  }

  const supabase = getServiceClient();
  let userId: string | null = null;

  try {
    // If user wants to test and provided email, create/find user
    if (parsedData.veutTester === 'oui' && parsedData.email) {
      try {
        const user = await usersRepository.upsert({
          email: parsedData.email.toLowerCase().trim(),
          firstName: undefined // Will be filled later if they complete onboarding
        });
        userId = user.id;

        logger.info('User created/found for market study', {
          userId: user.id,
          email: redact(parsedData.email)
        });
      } catch (userError) {
        logger.warn('User creation failed (non-blocking)', { error: userError });
        // Continue without userId - the survey data is still valuable
      }
    }

    // Save market study response
    const { data: marketStudyResponse, error } = await supabase
      .from('marketStudy')
      .insert({
        galeres: parsedData.galeres,
        autreGalere: parsedData.autreGalere || null,
        solutionsActuelles: parsedData.solutionsActuelles,
        solutionActuelleName: parsedData.solutionActuelleName || null,
        valeurPercue: parsedData.valeurPercue,
        prixAcceptable: parsedData.prixAcceptable,
        veutTester: parsedData.veutTester,
        email: parsedData.email ? parsedData.email.toLowerCase().trim() : null,
        userId: userId,
        ipAddress: ipDetection.ip,
        userAgent: req.headers['user-agent'] || null,
        submittedAt: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Market study save failed', { error });
      return res.status(500).json({ error: "Erreur lors de la sauvegarde" });
    }

    logger.info('Market study submitted successfully', {
      marketStudyId: marketStudyResponse.id,
      userId: userId,
      email: parsedData.email ? redact(parsedData.email) : null,
      veutTester: parsedData.veutTester,
      valeurPercue: parsedData.valeurPercue,
      prixAcceptable: parsedData.prixAcceptable,
      nbGaleres: parsedData.galeres.length
    });

    return res.status(200).json({
      success: true,
      marketStudyId: marketStudyResponse.id
    });

  } catch (error) {
    logger.error('Market study submission failed', { error });
    return res.status(500).json({ error: "Erreur lors de la soumission" });
  }
}