/**
 * Menu Sharing Page - /menu/{shareId}
 * Public page displaying personalized recipes and shopping lists
 * IMPORTANT: Must send X-Robots-Tag: noindex and be PII-free per specs
 */

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { getServiceClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

interface MenuPageProps {
  shareId: string;
  resultBundle: {
    version: string;
    generatedAt: string;
    meta: {
      primaryGoal: string;
      numRecipes: number;
      numServings: number;
      selectionStrategy: string;
    };
    recipes: Array<{
      id: string;
      title_fr: string;
      prep_time_minutes: number;
      calories_per_serving: number;
      protein_g_per_serving: number;
      carbs_g_per_serving: number;
      fat_g_per_serving: number;
      cooking_level: string;
      ingredients: Array<{
        nom: string;
        quantite: number;
        unite: string;
        canonical_name?: string;
      }>;
      instructions: string[];
      cooking_tip?: string;
      cuisine_type?: string;
      tags: string[];
    }>;
    shoppingList: {
      items: Array<{
        canonical_ingredient_id: string;
        name_fr: string;
        total_amount: number;
        unit: string;
        category: string;
        sources: Array<{
          recipe_title: string;
          amount: number;
          original_name: string;
        }>;
      }>;
      organizedByCategory: Array<{
        category: string;
        section_code: string;
        items: Array<{
          name_fr: string;
          total_amount: number;
          unit: string;
          sources: { recipe_title: string }[];
        }>;
      }>;
      summary: {
        totalItems: number;
        totalCategories: number;
        totalRecipes: number;
      };
    };
    nutritionSummary: {
      avgCaloriesPerRecipe: number;
      avgProteinPerRecipe: number;
    };
  };
  error?: string;
}

export default function MenuPage({ shareId, resultBundle, error }: MenuPageProps) {
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Menu non disponible</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!resultBundle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const { recipes, shoppingList, nutritionSummary, meta } = resultBundle;

  return (
    <>
      <Head>
        <title>Menu personnalisé Quinoïa</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Menu de recettes personnalisé généré par Quinoïa" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-green-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🍽️ Ton menu personnalisé
                </h1>
                <p className="text-gray-600 mt-1">
                  {meta.numRecipes} recettes pour {meta.numServings} personne{meta.numServings > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  Généré le {new Date(resultBundle.generatedAt).toLocaleDateString('fr-FR')}
                </div>
                <div className="text-sm font-medium text-yellow-600">
                  v{resultBundle.version}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          
          {/* Nutrition Summary */}
          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Résumé nutritionnel</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {nutritionSummary.avgCaloriesPerRecipe}
                </div>
                <div className="text-sm text-gray-600">kcal par recette</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {nutritionSummary.avgProteinPerRecipe}g
                </div>
                <div className="text-sm text-gray-600">protéines par recette</div>
              </div>
            </div>
          </section>

          {/* Shopping List */}
          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              🛒 Liste de courses intelligente
            </h2>
            <div className="text-sm text-gray-600 mb-4">
              {shoppingList.summary.totalItems} ingrédients • {shoppingList.summary.totalCategories} rayons
            </div>
            
            <div className="space-y-6">
              {shoppingList.organizedByCategory.map((category, idx) => (
                <div key={idx} className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    {category.category}
                    <span className="text-xs text-gray-500 ml-2">({category.section_code})</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{item.name_fr}</span>
                          {item.sources.length > 1 && (
                            <span className="text-xs text-blue-600 ml-2">
                              ({item.sources.length} recettes)
                            </span>
                          )}
                        </div>
                        <div className="text-right text-sm font-medium text-gray-700">
                          {Math.round(item.total_amount * 10) / 10} {item.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recipes */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">📋 Tes recettes détaillées</h2>
            
            {recipes.map((recipe, idx) => (
              <div key={recipe.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Recipe Header */}
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {idx + 1}. {recipe.title_fr}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-white text-sm">
                    <span>⏱️ {recipe.prep_time_minutes} min</span>
                    <span>🔥 {recipe.calories_per_serving} kcal</span>
                    <span>💪 {recipe.protein_g_per_serving}g protéines</span>
                    <span>👨‍🍳 {recipe.cooking_level}</span>
                  </div>
                  {recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {recipe.tags.map((tag, tagIdx) => (
                        <span 
                          key={tagIdx}
                          className="bg-white bg-opacity-20 text-white text-xs px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Ingredients */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">🥕 Ingrédients</h4>
                      <ul className="space-y-2">
                        {recipe.ingredients.map((ingredient, ingIdx) => (
                          <li key={ingIdx} className="flex justify-between text-sm">
                            <span className="text-gray-700">{ingredient.nom}</span>
                            <span className="font-medium text-gray-900">
                              {ingredient.quantite} {ingredient.unite}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Instructions */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">👩‍🍳 Instructions</h4>
                      <ol className="space-y-3">
                        {recipe.instructions.map((instruction, instIdx) => (
                          <li key={instIdx} className="text-sm text-gray-700">
                            <span className="inline-block w-6 h-6 bg-yellow-400 text-white text-xs font-bold rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                              {instIdx + 1}
                            </span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Cooking Tip */}
                  {recipe.cooking_tip && (
                    <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <h5 className="font-medium text-blue-900 mb-1">💡 Conseil du chef</h5>
                      <p className="text-blue-800 text-sm">{recipe.cooking_tip}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Footer */}
          <footer className="text-center py-8 text-gray-500">
            <p className="text-sm">
              Menu généré par{' '}
              <Link 
                href="/" 
                className="text-yellow-600 hover:text-yellow-700 font-medium"
              >
                Quinoïa
              </Link>
              {' '}• IA nutritionnelle française
            </p>
          </footer>

        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<MenuPageProps> = async (context) => {
  const { shareId } = context.params!;
  
  // Set noindex header (per MVP specs)
  context.res.setHeader('X-Robots-Tag', 'noindex');
  
  if (!shareId || typeof shareId !== 'string') {
    return {
      props: {
        shareId: '',
        error: 'ID de menu invalide',
        resultBundle: null
      }
    };
  }

  const supabase = getServiceClient();
  
  try {
    // Fetch menu result by shareId
    const { data: menuResult, error } = await supabase
      .from('menuResult')
      .select('id, resultBundle, numRecipes, numServings, shareActive, createdAt')
      .eq('shareId', shareId)
      .eq('shareActive', true)
      .single();

    if (error || !menuResult) {
      logger.warn('Menu not found or inactive', { shareId, error });
      return {
        props: {
          shareId,
          error: 'Menu non trouvé ou expiré',
          resultBundle: null
        }
      };
    }

    // Check if menu is too old (optional: expire after 30 days)
    const menuAge = Date.now() - new Date(menuResult.createdAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    if (menuAge > thirtyDaysMs) {
      logger.warn('Menu expired', { shareId, ageMs: menuAge });
      return {
        props: {
          shareId,
          error: 'Ce menu a expiré',
          resultBundle: null
        }
      };
    }

    logger.info('Menu accessed successfully', { 
      shareId, 
      menuId: menuResult.id,
      recipeCount: menuResult.numRecipes
    });

    return {
      props: {
        shareId,
        resultBundle: menuResult.resultBundle,
        error: null
      }
    };

  } catch (error) {
    logger.error('Menu fetch failed', { shareId, error });
    
    return {
      props: {
        shareId,
        error: 'Erreur lors du chargement du menu',
        resultBundle: null
      }
    };
  }
};