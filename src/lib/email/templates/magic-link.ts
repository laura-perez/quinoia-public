/**
 * Template Email - Magic Link Authentication
 * Email de connexion simple et sécurisé
 */

export function getMagicLinkSubject(firstName?: string | null): string {
  if (firstName) {
    return `${firstName}, ton lien de connexion Quinoïa 🔐`;
  }
  return 'Ton lien de connexion Quinoïa 🔐';
}

export function getMagicLinkHtml(magicLinkUrl: string, firstName?: string | null): string {
  const greeting = firstName || 'Salut';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ton lien de connexion Quinoïa</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #FFFDF8;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .navbar {
      background-color: #FDFBF8;
      border-bottom: 1px solid #EAEAEA;
      padding: 16px 30px;
      text-align: center;
    }
    .navbar img {
      height: 42px;
      width: auto;
    }
    .content {
      padding: 40px 30px;
    }
    .intro {
      text-align: center;
      margin-bottom: 32px;
    }
    .intro h1 {
      color: #414535;
      font-size: 28px;
      margin: 0 0 12px 0;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .intro p {
      color: #666666;
      font-size: 16px;
      margin: 0;
      line-height: 1.7;
    }
    .cta {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      background: linear-gradient(135deg, #F4C95D 0%, #F5D76A 100%);
      color: #414535;
      padding: 18px 36px;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      font-size: 16px;
      display: inline-block;
      box-shadow: 0 4px 12px rgba(244, 201, 93, 0.3);
      transition: transform 0.2s ease;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .security-info {
      background: #F8F9FA;
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
    }
    .security-info h3 {
      color: #414535;
      font-size: 16px;
      margin: 0 0 12px 0;
      font-weight: 600;
    }
    .security-info p {
      color: #666666;
      font-size: 14px;
      margin: 0 0 8px 0;
      line-height: 1.6;
    }
    .security-info p:last-child {
      margin-bottom: 0;
    }
    .security-warning {
      background: #FFF9E6;
      border-left: 4px solid #F4C95D;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .security-warning p {
      color: #666666;
      font-size: 14px;
      margin: 0;
      line-height: 1.6;
    }
    .security-warning strong {
      color: #414535;
    }
    .footer {
      background: #F8F9FA;
      padding: 24px 30px;
      text-align: center;
      color: #8A8A8A;
      font-size: 13px;
    }
    .footer p {
      margin: 0;
      line-height: 1.5;
    }

    @media (max-width: 600px) {
      .container { margin: 10px; }
      .navbar { padding: 12px 20px; }
      .navbar img { height: 36px; }
      .content { padding: 30px 20px; }
      .intro h1 { font-size: 24px; }
      .intro p { font-size: 15px; }
      .cta-button { padding: 16px 28px; font-size: 15px; }
      .security-info { padding: 20px; }
      .security-warning { padding: 14px 16px; }
    }
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
      <!-- Introduction -->
      <div class="intro">
        <h1>${greeting} ! 👋</h1>
        <p>
          Clique sur le bouton ci-dessous pour te connecter à ton compte Quinoïa.<br />
          Pas besoin de mot de passe, c'est simple et sécurisé.
        </p>
      </div>

      <!-- CTA -->
      <div class="cta">
        <a href="${magicLinkUrl}" class="cta-button">
          Me connecter à Quinoïa 🔐
        </a>
      </div>

      <!-- Security Warning -->
      <div class="security-warning">
        <p><strong>⏱️ Ce lien expire dans 15 minutes</strong> pour ta sécurité.</p>
      </div>

      <!-- Security Info -->
      <div class="security-info">
        <h3>🔒 Pourquoi cette méthode est sûre ?</h3>
        <p>✓ <strong>Pas de mot de passe :</strong> Impossible de le voler ou de l'oublier.</p>
        <p>✓ <strong>Lien unique :</strong> Ce lien ne fonctionne qu'une seule fois.</p>
        <p>✓ <strong>Expiration rapide :</strong> Après 15 minutes, ce lien devient inutile.</p>
        <p style="margin-top: 12px; color: #8A8A8A; font-size: 13px;">
          Si tu n'as pas demandé cette connexion, ignore simplement cet email.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Tu reçois cet email suite à une demande de connexion sur Quinoïa.</p>
      <p style="margin-top: 8px;">Besoin d'aide ? Réponds à cet email.</p>
      <p style="margin-top: 12px; font-size: 12px;">L'équipe Quinoïa 🥗</p>
    </div>
  </div>
</body>
</html>`;
}
