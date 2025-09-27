/**
 * Template Email - Premier Menu Gratuit
 * Email de bienvenue moderne et clean
 */

import type { MenuData, User } from '../types';

export function getWelcomeMenuSubject(user: User): string {
  return `${user.firstName ? `${user.firstName}, ` : ''}ton menu Quinoïa est prêt ! 🍽️`;
}

export function getWelcomeMenuHtml(user: User, menu: MenuData): string {
  const firstName = user.firstName || 'Laura';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ton menu Quinoïa est prêt !</title>
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
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .header {
      background: linear-gradient(135deg, #F4C95D 0%, #F5D76A 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #414535;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .header p {
      color: #414535;
      font-size: 18px;
      margin: 12px 0 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .intro {
      text-align: center;
      margin-bottom: 40px;
    }
    .intro h2 {
      color: #414535;
      font-size: 24px;
      margin: 0 0 16px 0;
      font-weight: 600;
    }
    .intro p {
      color: #666666;
      font-size: 16px;
      margin: 0;
      line-height: 1.7;
    }
    .highlight {
      color: #F4C95D;
      font-weight: 600;
    }
    .stats {
      background: #FFFDF8;
      border-radius: 12px;
      padding: 24px 16px;
      margin: 32px 0;
      border: 1px solid #F4F4F4;
    }
    .stats-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
    }
    .stat {
      display: table-cell;
      text-align: center;
      vertical-align: top;
      width: 25%;
    }
    .stat-number {
      color: #F4C95D;
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 4px 0;
      display: block;
    }
    .stat-label {
      color: #8A8A8A;
      font-size: 11px;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      line-height: 1.2;
      display: block;
    }
    .recipe-preview {
      margin: 32px 0;
    }
    .recipe-preview h3 {
      color: #414535;
      font-size: 18px;
      margin: 0 0 20px 0;
      font-weight: 600;
    }
    .recipe {
      background: #FFFDF8;
      border-radius: 8px;
      padding: 20px;
      margin: 12px 0;
      border-left: 4px solid #F4C95D;
    }
    .recipe-title {
      color: #414535;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
    .recipe-meta {
      color: #8A8A8A;
      font-size: 14px;
      margin: 0;
    }
    .cta {
      text-align: center;
      margin: 40px 0;
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
    .explanation {
      background: #F8F9FA;
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
    }
    .explanation h3 {
      color: #414535;
      font-size: 18px;
      margin: 0 0 16px 0;
      font-weight: 600;
    }
    .explanation p {
      color: #666666;
      font-size: 15px;
      margin: 0 0 12px 0;
      line-height: 1.6;
    }
    .explanation p:last-child {
      margin-bottom: 0;
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
      .header { padding: 30px 20px; }
      .content { padding: 30px 20px; }
      .stats { padding: 20px 12px; }
      .stats-grid { display: table; }
      .stat { width: 25%; }
      .stat-number { font-size: 20px; }
      .stat-label { font-size: 10px; }
      .cta-button { padding: 16px 28px; font-size: 15px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Salut ${firstName} ! 👋</h1>
      <p>Ton menu personnalisé est prêt</p>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Introduction -->
      <div class="intro">
        <h2>Tu viens de déverrouiller ta semaine sans prise de tête</h2>
        <p>
          <span class="highlight">${menu.numRecipes} repas équilibrés</span>,
          prêts en <span class="highlight">${Math.max(...menu.recipes.map(r => r.prepTimeMinutes))} min max</span>,
          avec ta liste de courses incluse.
        </p>
      </div>

      <!-- Stats -->
      <div class="stats">
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-number">${menu.numRecipes}</span>
            <span class="stat-label">Recettes</span>
          </div>
          <div class="stat">
            <span class="stat-number">${menu.numServings}</span>
            <span class="stat-label">${menu.numServings > 1 ? 'Portions' : 'Portion'}</span>
          </div>
          <div class="stat">
            <span class="stat-number">${menu.shoppingList.summary.totalItems}</span>
            <span class="stat-label">Ingrédients</span>
          </div>
          <div class="stat">
            <span class="stat-number">${Math.round(menu.recipes.reduce((sum, r) => sum + r.caloriesPerServing, 0) / menu.recipes.length)}</span>
            <span class="stat-label">Kcal/repas</span>
          </div>
        </div>
      </div>

      <!-- Recipe Preview -->
      <div class="recipe-preview">
        <h3>🍽️ Aperçu de tes recettes</h3>
        ${menu.recipes.slice(0, 3).map(recipe => `
          <div class="recipe">
            <div class="recipe-title">${recipe.titleFr}</div>
            <div class="recipe-meta">
              ⏱️ ${recipe.prepTimeMinutes} min •
              🔥 ${Math.round(recipe.caloriesPerServing)} kcal •
              💪 ${Math.round(recipe.proteinGPerServing)}g protéines
            </div>
          </div>
        `).join('')}
      </div>

      <!-- CTA -->
      <div class="cta">
        <a href="${menu.shareUrl}" class="cta-button">
          Voir mon menu complet 🍽️
        </a>
      </div>

      <!-- Explanation about Quinoïa -->
      <div class="explanation">
        <h3>✨ Comment Quinoïa révolutionne tes repas</h3>
        <p><strong>Personnalisation intelligente :</strong> Tes recettes sont sélectionnées selon tes goûts, ton niveau de cuisine et tes objectifs nutritionnels.</p>
        <p><strong>Liste de courses optimisée :</strong> Tous les ingrédients organisés par rayon de supermarché, avec les quantités exactes.</p>
        <p><strong>Simplicité garantie :</strong> Recettes rapides, ingrédients faciles à trouver, instructions claires étape par étape.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Tu reçois cet email suite à ta demande de menu personnalisé sur Quinoïa.</p>
      <p style="margin-top: 8px;">Bon appétit ! 🥗 — L'équipe Quinoïa</p>
    </div>
  </div>
</body>
</html>`;
}