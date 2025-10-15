/**
 * Email Template Loader
 * Loads HTML templates and injects common CSS
 */

import fs from 'fs';
import path from 'path';

// Read common CSS once at module load
const cssPath = path.join(process.cwd(), 'src/lib/email/templates/common.css');
const commonCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';

/**
 * Build email HTML with common CSS and custom footer
 */
export function buildEmailHtml(params: {
  title: string;
  content: string;
  footerText?: string;
}): string {
  const { title, content, footerText } = params;

  const defaultFooter = `
    <div class="footer">
      <p>Tu reçois cet email suite à une demande sur Quinoïa.</p>
      <p style="margin-top: 8px;">Besoin d'aide ? Réponds à cet email.</p>
      <p style="margin-top: 12px; font-size: 12px;">L'équipe Quinoïa 🥗</p>
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    ${commonCss}
  </style>
</head>
<body>
  <div class="container">
    <!-- Navbar -->
    <div class="navbar">
      <img src="https://quinoia.fr/quinoia_logo.png" alt="Quinoïa Logo" />
    </div>

    <!-- Content -->
    <div class="content">
      ${content}
    </div>

    <!-- Footer -->
    ${footerText || defaultFooter}
  </div>
</body>
</html>`;
}
