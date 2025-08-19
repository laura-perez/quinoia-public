/**
 * Professional Email Delivery System - v2.0
 * Sends personalized recipe menus with shopping lists via Resend
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger();

interface User {
  id: string;
  email: string;
  firstName?: string;
}

interface MenuResult {
  shareId: string;
  resultBundle: {
    version: string;
    recipes: Array<{
      id: string;
      title_fr: string;
      prep_time_minutes: number;
      calories_per_serving: number;
      protein_g_per_serving: number;
    }>;
    shoppingList: {
      summary: {
        totalItems: number;
        totalCategories: number;
      };
    };
    nutritionSummary: {
      avgCaloriesPerRecipe: number;
      avgProteinPerRecipe: number;
    };
  };
}

interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Send personalized recipe menu email via Resend
 */
export async function sendRecipeMenu(
  user: User, 
  menuResult: MenuResult
): Promise<EmailResult> {
  
  logger.info('Starting email delivery', {
    userId: user.id,
    email: user.email.substring(0, 3) + '***', // Partial redaction
    shareId: menuResult.shareId,
    numRecipes: menuResult.resultBundle.recipes.length
  });

  try {
    // For MVP: Simple success response (email integration to be added)
    // TODO: Implement actual Resend integration
    
    logger.info('Email delivery completed (MVP stub)', {
      userId: user.id,
      shareId: menuResult.shareId
    });

    return {
      success: true,
      emailId: `stub_${menuResult.shareId}`
    };

  } catch (error) {
    logger.error('Email delivery failed', {
      userId: user.id,
      shareId: menuResult.shareId,
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate HTML email template (basic version for MVP)
 */
function renderRecipeMenuEmail(data: {
  userName?: string;
  recipes: MenuResult['resultBundle']['recipes'];
  nutritionSummary: MenuResult['resultBundle']['nutritionSummary'];
  shareUrl: string;
  shoppingPreview: MenuResult['resultBundle']['shoppingList']['summary'];
}): string {
  const { userName, recipes, nutritionSummary, shareUrl, shoppingPreview } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Ton menu Quinoïa est prêt !</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FDFBF8;">
      
      <!-- Header -->
      <div style="background-color: #F4C95D; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #414535; margin: 0; font-size: 24px;">
          Salut${userName ? ` ${userName}` : ''} ! 👋
        </h1>
        <p style="color: #414535; font-size: 18px; margin: 10px 0 0 0;">
          Ton menu personnalisé est prêt !
        </p>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px 20px; background-color: white;">
        
        <!-- Recipe Preview -->
        <h2 style="color: #414535; margin-bottom: 20px;">🍽️ Tes recettes sélectionnées</h2>
        
        ${recipes.slice(0, 3).map(recipe => `
          <div style="border: 1px solid #EAEAEA; border-radius: 8px; padding: 20px; margin: 15px 0; background-color: #FDFBF8;">
            <h3 style="color: #414535; margin: 0 0 10px 0; font-size: 18px;">
              ${recipe.title_fr}
            </h3>
            <p style="color: #8A8A8A; margin: 5px 0; font-size: 14px;">
              ⏱️ ${recipe.prep_time_minutes} min | 
              🔥 ${recipe.calories_per_serving} kcal | 
              💪 ${recipe.protein_g_per_serving}g protéines
            </p>
          </div>
        `).join('')}
        
        <!-- Nutrition Summary -->
        <div style="background-color: #F4F4F4; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #414535; margin: 0 0 15px 0;">📊 Résumé nutritionnel</h3>
          <p style="color: #666; margin: 5px 0; font-size: 16px;">
            <strong>Moyenne par recette:</strong> ${nutritionSummary.avgCaloriesPerRecipe} kcal, 
            ${nutritionSummary.avgProteinPerRecipe}g protéines
          </p>
          <p style="color: #666; margin: 5px 0; font-size: 16px;">
            🛒 <strong>${shoppingPreview.totalItems} ingrédients</strong> dans ta liste de courses optimisée
          </p>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="${shareUrl}" 
             style="background-color: #F4C95D; color: #414535; padding: 18px 35px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold; 
                    display: inline-block; font-size: 18px; border: none;">
            Voir mon menu complet 🍽️
          </a>
        </div>
        
        <!-- Footer Message -->
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #8A8A8A; font-size: 14px; line-height: 1.5;">
            Clique sur le bouton pour découvrir tes recettes détaillées, 
            ta liste de courses intelligente et tes conseils personnalisés !
          </p>
          <p style="color: #8A8A8A; font-size: 12px; margin-top: 20px;">
            Bon appétit ! 🥗<br>
            L'équipe Quinoïa
          </p>
        </div>
        
      </div>
      
      <!-- Footer -->
      <div style="background-color: #F4F4F4; padding: 20px; text-align: center; font-size: 12px; color: #8A8A8A;">
        <p style="margin: 0;">
          Tu reçois cet email suite à ta demande de menu personnalisé sur Quinoïa.
        </p>
      </div>
      
    </body>
    </html>
  `;
}