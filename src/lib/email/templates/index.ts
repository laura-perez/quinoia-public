/**
 * Email Templates
 * Clean architecture: HTML templates + CSS + rendering logic
 */

import fs from 'fs';
import path from 'path';
import { buildEmailHtml } from './templateLoader';

// Template cache
const templateCache = new Map<string, string>();

/**
 * Load HTML template from file
 */
function loadTemplate(templateName: string): string {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const templatePath = path.join(process.cwd(), 'src/lib/email/templates', `${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');
  templateCache.set(templateName, template);

  return template;
}

/**
 * Replace placeholders in template
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(placeholder, value);
  }

  return rendered;
}

// ============================================================================
// MAGIC LINK EMAIL
// ============================================================================

export interface MagicLinkEmailParams {
  magicLinkUrl: string;
  firstName?: string | null;
}

export function getMagicLinkSubject(firstName?: string | null): string {
  if (firstName) {
    return `${firstName}, ton lien de connexion Quinoïa 🔐`;
  }
  return 'Ton lien de connexion Quinoïa 🔐';
}

export function getMagicLinkHtml(params: MagicLinkEmailParams): string {
  const { magicLinkUrl, firstName } = params;
  const greeting = firstName || 'Salut';

  const template = loadTemplate('magic-link');
  const content = renderTemplate(template, {
    greeting,
    magicLinkUrl
  });

  return buildEmailHtml({
    title: 'Ton lien de connexion Quinoïa',
    content
  });
}

// ============================================================================
// WELCOME MENU WITH ACTIVATION EMAIL
// ============================================================================

export interface WelcomeMenuWithActivationParams {
  firstName: string | null;
  shareUrl: string;
  magicLinkUrl: string;
}

export function getWelcomeMenuWithActivationSubject(firstName?: string | null): string {
  if (firstName) {
    return `${firstName}, ton menu est prêt ! 🍽️`;
  }
  return 'Ton menu est prêt ! 🍽️';
}

export function getWelcomeMenuWithActivationHtml(params: WelcomeMenuWithActivationParams): string {
  const { firstName, shareUrl, magicLinkUrl } = params;
  const greeting = firstName || 'Salut';

  const template = loadTemplate('welcome-menu-with-activation');
  const content = renderTemplate(template, {
    greeting,
    shareUrl,
    magicLinkUrl
  });

  const customFooter = `
    <div class="footer">
      <p>Tu reçois cet email suite à ta demande de menu personnalisé sur Quinoïa.</p>
      <p style="margin-top: 8px;">Besoin d'aide ? Réponds à cet email.</p>
      <p style="margin-top: 12px; font-size: 12px;">À tout de suite,<br /><strong>L'équipe Quinoïa</strong> 🥗</p>
    </div>
  `;

  return buildEmailHtml({
    title: 'Ton menu est prêt !',
    content,
    footerText: customFooter
  });
}
