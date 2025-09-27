/**
 * AI Tips Generator using GPT-4o-mini
 * Generates personalized cooking tips for recipes and menu planning
 */

import OpenAI from 'openai';
import { env } from '@/lib/config/env';
import { createLogger } from '@/lib/logger';
import type {
  AITipsResult,
  TipsGenerationParams
} from './types';
import { FALLBACK_GENERAL_TIPS } from './types';

const logger = createLogger();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Generate personalized tips using GPT-4o-mini
 */
export async function generatePersonalizedTips(params: TipsGenerationParams): Promise<AITipsResult> {
  logger.info('Starting AI tips generation', {
    firstName: params.userProfile.firstName,
    numRecipes: params.recipes.length,
    diet: params.dietContext.diet,
    cookingLevel: params.userProfile.cookingLevel
  });

  try {
    const prompt = buildPrompt(params);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const result = JSON.parse(content) as AITipsResult;

    // Validate the response structure
    if (!result.generalTips || !result.recipeTips) {
      throw new Error('Invalid response structure from AI');
    }

    logger.info('AI tips generation successful', {
      firstName: params.userProfile.firstName,
      generalTipsCount: result.generalTips.length,
      recipeTipsCount: Object.keys(result.recipeTips).length,
      tokensUsed: response.usage?.total_tokens
    });

    return result;

  } catch (error) {
    logger.error('AI tips generation failed', {
      firstName: params.userProfile.firstName,
      error: error
    });

    // Return fallback tips
    return {
      generalTips: FALLBACK_GENERAL_TIPS,
      recipeTips: {}
    };
  }
}

/**
 * Build the personalized prompt for GPT-4o-mini
 */
function buildPrompt(params: TipsGenerationParams): string {
  const { userProfile, dietContext, recipes, nutritionSummary } = params;

  // Format recipes for the prompt
  const recipesText = recipes.map(recipe => ({
    id: recipe.id,
    title: recipe.titleFr,
    ingredients: recipe.ingredients.map((ing: any) => `${ing.quantite} ${ing.unite} ${ing.nom}`).join(', '),
    instructions: recipe.instructions.join(' '),
    cookingLevel: recipe.cookingLevel,
    prepTime: recipe.prepTimeMinutes,
    protein: recipe.proteinGPerServing,
    calories: recipe.caloriesPerServing
  }));

  return `Profil utilisateur : ${userProfile.firstName}, age : ${userProfile.age} ans, genre : ${userProfile.gender.toLowerCase()}.
Niveau de cuisine : ${userProfile.cookingLevel} , régime : ${dietContext.diet}.
Mes préférences protéines : ${dietContext.proteinPreferences.join(', ')}.

Voici le menu de la semaine avec ${recipes.length} recettes :

${recipesText.map((recipe, index) => `
RECETTE ${index + 1} (ID: ${recipe.id}) - ${recipe.title}
- Ingrédients : ${recipe.ingredients}
- Instructions : ${recipe.instructions.substring(0, 200)}...
- Niveau : ${recipe.cookingLevel}
- Temps : ${recipe.prepTime}min
- Protéines : ${recipe.protein}g/portion
- Calories : ${recipe.calories} kcal/portion
`).join('\n')}

Résumé nutritionnel total : ${nutritionSummary.totalProtein}g de protéines, moyenne ${nutritionSummary.avgProtein}g par recette.

Instructions :
1. Génère EXACTEMENT 4 astuces ultra pertinenantes par recette (substitution, conseils de cuisson, préparation simplifiée ...)
   ➝ Chaque astuce doit être VRAIMENT utile : gestes, enchaînement, gestion des temps, substitutions intelligentes, conservation sans perte de goût.
2. Génère EXACTEMENT 4 astuces générales pour la semaine selon le menu (organisation, astuces de batch cooking, achats malins ...)
   ➝ Exemples : comment organiser son plan de travail, préparer en avance, équilibrer les repas, s’y retrouver avec la liste de courses, sois créatif mais surtout ultra pertinent et personnalisé.
   ➝ Tu peux écrire 2 phrases si nécessaire.
3. Personnalise selon le profil utilisateur (niveau, équipement, allergènes).

Format de réponse requis : JSON strict avec cette structure exacte.`;
}

/**
 * System prompt defining the AI's role and output format
 */
const SYSTEM_PROMPT = `Tu es un chef cuisinier pédagogue ET un coach culinaire.
Tu donnes des astuces pratiques, claires et motivantes pour Quinoïa, une application de génération de menus hebdomadaires sains et simples, et de liste de courses.
Tu aides l’utilisateur à cuisiner simplement et sans stress.

Contraintes :
- Format JSON strict (recipeTips + generalTips).
- 4 astuces par recette, pertinentes à chaque recette
- 4 astuces générales pertinentes au menu de la semaine
- Chaque astuce peut contenir UNE ou DEUX phrases si c’est utile.
- Texte concis, clair, en français naturel.
- Ton chaleureux et motivant (style “copain qui t’explique la combine”).
- Adapter au niveau de cuisine (débutant = simplification, avancé = détails de pro).
- Éviter les banalités (“ajoute de l’avocat”) et donner des conseils qui améliorent l'expérience utilisateur avec le menu ou la recette.
- Toujours inclure un emoji pertinent au début du texte.

IMPORTANT : Réponds UNIQUEMENT en JSON avec cette structure exacte :
{
  "generalTips": [
    {
      "id": "1",
      "type": "organization",
      "icon": "⚡",
      "text": "Texte de l'astuce"
    }
  ],
  "recipeTips": {
    "recipe_id": [
      {
        "id": "1",
        "type": "preparation",
        "icon": "🔪",
        "text": "Texte de l'astuce"
      }
    ]
  }
}`;