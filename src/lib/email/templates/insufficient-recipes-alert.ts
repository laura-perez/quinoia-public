/**
 * Email template - insufficient recipe catalogue alert
 * Alert sent to the admin when a user profile does not match enough recipes
 */

import type { SelectionContext } from '@/types/recipes';

interface InsufficientRecipesData {
  context: SelectionContext;
  availableCount: number;
  requestedCount: number;
  userEmail: string;
  submissionId: string;
  timestamp: string;
}

export function getInsufficientRecipesSubject(data: InsufficientRecipesData): string {
  return `🚨 Quinoïa Alert: Catalogue insuffisant (${data.availableCount}/${data.requestedCount} recettes)`;
}

export function getInsufficientRecipesHtml(data: InsufficientRecipesData): string {
  const { context, availableCount, requestedCount, userEmail, submissionId, timestamp } = data;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Alerte Catalogue Quinoïa</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #F5F5F5;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #FF6B6B 0%, #EE5A52 100%);
      color: white;
      padding: 20px 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 8px 0 0 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 30px;
    }
    .alert-box {
      background: #FFF5F5;
      border: 2px solid #FEB2B2;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .alert-box h2 {
      color: #C53030;
      margin: 0 0 12px 0;
      font-size: 18px;
    }
    .alert-box p {
      color: #742A2A;
      margin: 0;
      font-size: 15px;
    }
    .highlight {
      font-weight: 600;
      color: #C53030;
    }
    .profile-section {
      margin: 30px 0;
    }
    .profile-section h3 {
      color: #2D3748;
      margin: 0 0 20px 0;
      font-size: 18px;
      border-bottom: 2px solid #F4C95D;
      padding-bottom: 8px;
    }
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .profile-item {
      background: #F8F9FA;
      padding: 15px;
      border-radius: 6px;
      border-left: 3px solid #F4C95D;
    }
    .profile-item label {
      font-weight: 600;
      color: #4A5568;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 4px;
    }
    .profile-item value {
      color: #2D3748;
      font-size: 15px;
      display: block;
    }
    .preferences-box {
      background: #F0FFF4;
      border: 1px solid #C6F6D5;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
    }
    .preferences-box h4 {
      color: #22543D;
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    .preferences-box p {
      color: #2F855A;
      margin: 0;
      font-size: 14px;
      font-style: italic;
    }
    .action-section {
      background: #EDF2F7;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }
    .action-section h3 {
      color: #2D3748;
      margin: 0 0 15px 0;
      font-size: 16px;
    }
    .action-list {
      color: #4A5568;
      font-size: 14px;
      margin: 0;
      padding-left: 20px;
    }
    .action-list li {
      margin: 8px 0;
    }
    .metadata {
      background: #F7FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 20px 30px;
      font-size: 13px;
      color: #718096;
    }
    .metadata p {
      margin: 4px 0;
    }

    @media (max-width: 600px) {
      .profile-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }
      .container {
        margin: 0;
        border-radius: 0;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🚨 Alerte Catalogue Quinoïa</h1>
      <p>Profil utilisateur sans recettes disponibles détecté</p>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Alert Summary -->
      <div class="alert-box">
        <h2>Catalogue insuffisant</h2>
        <p>
          Un utilisateur vient de demander <span class="highlight">${requestedCount} recettes</span>
          mais seulement <span class="highlight">${availableCount} recettes</span> correspondent à son profil.
        </p>
      </div>

      <!-- User Profile -->
      <div class="profile-section">
        <h3>👤 Profil Utilisateur</h3>

        <div class="profile-grid">
          <div class="profile-item">
            <label>Régime alimentaire</label>
            <value>${context.diet}</value>
          </div>
          <div class="profile-item">
            <label>Niveau de cuisine</label>
            <value>${context.cookingLevel}</value>
          </div>
          <div class="profile-item">
            <label>Protéines préférées</label>
            <value>${context.proteinPreferences.join(', ') || 'Aucune'}</value>
          </div>
          <div class="profile-item">
            <label>Équipements disponibles</label>
            <value>${context.equipmentAvailable.join(', ') || 'Standard'}</value>
          </div>
          <div class="profile-item">
            <label>Nombre de recettes demandées</label>
            <value>${context.numRecipes}</value>
          </div>
          <div class="profile-item">
            <label>Portions par recette</label>
            <value>${context.numServings}</value>
          </div>
        </div>

        ${context.favoriteFoods ? `
          <div class="preferences-box">
            <h4>💚 Aliments favoris</h4>
            <p>"${context.favoriteFoods}"</p>
          </div>
        ` : ''}

        ${context.dislikedFoods ? `
          <div class="preferences-box">
            <h4>❌ Aliments détestés</h4>
            <p>"${context.dislikedFoods}"</p>
          </div>
        ` : ''}
      </div>

      <!-- Action Items -->
      <div class="action-section">
        <h3>🎯 Actions recommandées</h3>
        <ul class="action-list">
          <li><strong>Ajouter des recettes ${context.diet}</strong> avec les protéines : ${context.proteinPreferences.join(', ')}</li>
          <li><strong>Niveau ${context.cookingLevel}</strong> : privilégier la simplicité selon le niveau</li>
          ${context.equipmentAvailable.length > 0 ? `<li><strong>Équipements spécifiques</strong> : ${context.equipmentAvailable.join(', ')}</li>` : ''}
          ${context.favoriteFoods ? `<li><strong>Incorporer les favoris</strong> : "${context.favoriteFoods}"</li>` : ''}
          ${context.dislikedFoods ? `<li><strong>Éviter absolument</strong> : "${context.dislikedFoods}"</li>` : ''}
          <li><strong>Minimum protéique</strong> : ${context.proteinFloorG}g par portion</li>
        </ul>
      </div>
    </div>

    <!-- Metadata -->
    <div class="metadata">
      <p><strong>Email utilisateur :</strong> ${userEmail}</p>
      <p><strong>Submission ID :</strong> ${submissionId}</p>
      <p><strong>Timestamp :</strong> ${timestamp}</p>
      <p><strong>User ID :</strong> ${context.userId}</p>
    </div>
  </div>
</body>
</html>`;
}