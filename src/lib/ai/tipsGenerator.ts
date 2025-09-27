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

  return `Bonjour ! Je m'appelle ${userProfile.firstName}, j'ai ${userProfile.age} ans et je suis ${userProfile.gender.toLowerCase()}.
Mon niveau de cuisine est ${userProfile.cookingLevel} et je suis ${dietContext.diet}.
Mes préférences protéines : ${dietContext.proteinPreferences.join(', ')}.

Voici mon menu de la semaine avec ${recipes.length} recettes :

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

Peux-tu me donner :
1. Exactement 4 astuces générales pour optimiser ma semaine de cuisine
2. Maximum 4 astuces spécifiques par recette (préparation, technique, variation, conservation)

Format de réponse requis : JSON strict avec cette structure exacte.`;
}

/**
 * System prompt defining the AI's role and output format
 */
const SYSTEM_PROMPT = `Tu es un chef cuisinier expert et nutritionniste qui donne des conseils personnalisés.

Tes conseils doivent être :
- Personnalisés selon l'âge, genre, niveau de cuisine et régime alimentaire
- Pratiques et réalisables
- Courts (50-80 caractères maximum par astuce)
- Avec un émoji approprié
- En français familier et bienveillant

Types d'astuces par recette :
- preparation : techniques de préparation, découpe, organisation
- technique : méthodes de cuisson, températures, timing
- variation : substitutions d'ingrédients, adaptations
- conservation : stockage, réchauffage, durée de vie

Types d'astuces générales :
- organization : planification, mise en place, rangement
- batch : préparation en avance, batch cooking
- nutrition : équilibre, associations d'aliments
- planning : organisation des courses et de la semaine

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