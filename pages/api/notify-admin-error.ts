import type { NextApiRequest, NextApiResponse } from "next";
import { sendEmail } from "@/lib/email/client";
import { env } from '@/lib/config/env';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { error, stack, formData, timestamp } = req.body;

    const adminEmail = env.ADMIN_EMAIL || 'laura@quinoia.fr';

    const subject = `🚨 Erreur de soumission formulaire Quinoïa`;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Erreur de soumission formulaire</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #FFF6DC; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #B91C1C; margin: 0;">🚨 Erreur de soumission formulaire</h1>
    <p style="color: #7C2D12; margin: 10px 0 0 0;">Une erreur s'est produite lors de la soumission d'un formulaire utilisateur.</p>
  </div>

  <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #414535; margin-top: 0;">📋 Détails de l'erreur</h3>
    <p><strong>Message d'erreur :</strong></p>
    <pre style="background-color: #FEE2E2; padding: 10px; border-radius: 4px; color: #B91C1C; white-space: pre-wrap;">${error}</pre>

    ${stack ? `
    <p><strong>Stack trace :</strong></p>
    <pre style="background-color: #FEE2E2; padding: 10px; border-radius: 4px; color: #B91C1C; font-size: 11px; white-space: pre-wrap;">${stack}</pre>
    ` : ''}
  </div>

  <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #414535; margin-top: 0;">👤 Données utilisateur</h3>
    <p><strong>Email :</strong> ${formData?.email || 'Non fourni'}</p>
    <p><strong>Prénom :</strong> ${formData?.name || 'Non fourni'}</p>
    <p><strong>Âge :</strong> ${formData?.age || 'Non fourni'}</p>
    <p><strong>Régime :</strong> ${formData?.diet || 'Non fourni'}</p>
    <p><strong>Niveau cuisine :</strong> ${formData?.cookingLevel || 'Non fourni'}</p>
    <p><strong>Nombre de recettes :</strong> ${formData?.numRecipes || 'Non fourni'}</p>
    <p><strong>Nombre de portions :</strong> ${formData?.numServings || 'Non fourni'}</p>
  </div>

  <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #414535; margin-top: 0;">🕐 Métadonnées</h3>
    <p><strong>Timestamp :</strong> ${timestamp}</p>
    <p><strong>User Agent :</strong> ${req.headers['user-agent'] || 'Non fourni'}</p>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
    <p style="color: #8A8A8A; font-size: 12px; margin: 0;">
      Email automatique - Système Quinoïa
    </p>
  </div>
</body>
</html>
    `;

    await sendEmail({
      to: adminEmail,
      subject,
      html,
      from: 'Quinoïa Error System <alerts@rs.quinoia.fr>',
      replyTo: 'hello@rs.quinoia.fr'
    });

    logger.info('Admin error notification sent', {
      adminEmail: adminEmail.substring(0, 3) + '***',
      userEmail: formData?.email?.substring(0, 3) + '***' || 'unknown',
      error: error?.substring(0, 100) + '...'
    });

    res.status(200).json({ success: true });
  } catch (emailError) {
    logger.error('Failed to send admin error notification', {
      error: emailError,
      originalError: req.body.error
    });

    // Don't fail the response as this is non-critical
    res.status(200).json({ success: false, error: 'Email failed' });
  }
}