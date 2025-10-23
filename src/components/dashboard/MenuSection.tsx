/**
 * Menu Section - Main screen with recipes carousel and shopping list
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ShoppingCart, Lock, Trash2, ClipboardList } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Badge } from '@/components/ui/badge';
import { RecipeModal } from '@/components/ui/RecipeModal';
import { PremiumUpgradeModal } from '@/components/ui/PremiumUpgradeModal';
import { SwapPanel } from './SwapPanel';
import { useMenuSwap } from '@/hooks/useMenuSwap';
import { generateShoppingList } from '@/utils/shoppingList/generator';
import type { DashboardMenu } from '@/types/dashboard';
import type { CanonicalIngredientInfo } from '@/lib/supabase/repositories/ingredients';
import type { Recipe } from '@/lib/recipes/types';

interface MenuSectionProps {
  menu: DashboardMenu;
  ingredientsCatalog: Record<string, CanonicalIngredientInfo>;
  isPremium: boolean;
  swapQuota: { used: number; limit: number | null };
  onError: (error: string) => void;
  onSwapQuotaExceeded: () => void;
  onOpenShoppingList: () => void;
  onActiveRecipesChange?: (activeRecipes: Recipe[]) => void;
  historique?: any[];
  onUpgradeHistory?: () => void;
  userFirstName?: string | null;
}

const fallbackImageUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZGlzaHxlbnwxfHx8fDE3NTY4Mjg0MjF8MA&ixlib=rb-4.1.0&q=80&w=1080`;

export function MenuSection({
  menu,
  ingredientsCatalog,
  isPremium,
  swapQuota,
  onError,
  onSwapQuotaExceeded,
  onOpenShoppingList,
  onActiveRecipesChange,
  historique = [],
  onUpgradeHistory,
  userFirstName,
}: MenuSectionProps) {
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [swapPanelOpen, setSwapPanelOpen] = useState(false);
  const [recipeToSwap, setRecipeToSwap] = useState<Recipe | null>(null);

  // Filter swap pool to remove recipes already in active recipes
  const cleanedSwapPool = useMemo(() => {
    const activeIds = new Set(menu.activeRecipes.map((r: any) => r.id));
    const filtered = menu.swapPool.filter((r: any) => !activeIds.has(r.id));
    return filtered;
  }, [menu.activeRecipes, menu.swapPool]);

  const {
    activeRecipes,
    swapPool,
    swapsCount,
    swapRecipe,
    removeRecipe,
    addRecipe,
    isSwapping,
    isSaving,
    availableForSwap,
  } = useMenuSwap({
    initialActiveRecipes: menu.activeRecipes,
    initialSwapPool: cleanedSwapPool,
    initialSwapsCount: menu.swapsCount,
    menuId: menu.id,
    numServings: menu.numServings,
    isPremium,
    onError,
  });

  // Notify parent when activeRecipes change (for shopping list update)
  useEffect(() => {
    if (onActiveRecipesChange) {
      onActiveRecipesChange(activeRecipes);
    }
  }, [activeRecipes, onActiveRecipesChange]);

  const transformedRecipes = useMemo(
    () =>
      activeRecipes.map((recipe: any) => ({
        ...recipe,
        title: recipe.titleFr,
        image: recipe.imageUrl || fallbackImageUrl,
        meta: { icon: '⏱', text: `${recipe.prepTimeMinutes} min` },
      })),
    [activeRecipes]
  );

  const canSwap = isPremium || swapsCount < (swapQuota.limit || 1);
  const canAddRecipe = isPremium || activeRecipes.length < 3;
  const maxRecipesReached = !canAddRecipe;

  const handleSwapPremium = (recipe: any) => {
    if (swapPool.length > 0) {
      swapRecipe(recipe, swapPool[0]);
    }
  };

  const handleSwapFree = (recipe: any) => {
    setRecipeToSwap(recipe);
    setSwapPanelOpen(true);
  };

  const handleSwapConfirm = (chosenRecipe: any) => {
    if (!recipeToSwap) return;

    swapRecipe(recipeToSwap, chosenRecipe);

    setSwapPanelOpen(false);
    setRecipeToSwap(null);
  };

  const handleAddRecipe = () => {
    // If max recipes reached for free users, show premium modal
    if (maxRecipesReached) {
      setShowPremiumModal(true);
      return;
    }

    // Premium: Pool auto-refetches, wait if currently loading
    // Free: Only add if pool has recipes
    if (swapPool.length > 0 && !isSaving) {
      addRecipe();
    }
  };

  const maxPrepTime = Math.max(...activeRecipes.map((r: any) => r.prepTimeMinutes));

  return (
    <div className="px-4 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-6 bg-[#FCFAF7] -mx-4 px-4 py-4 rounded-lg">
        <div>
          <h2 className="text-2xl font-bold text-[#414535]">
            {userFirstName ? `${userFirstName}, ta` : 'Ta'} semaine est prête 🍽️
          </h2>
          <p className="text-[#8A8A8A] mt-1">
            <span className="font-semibold text-[#F4C95D]">{activeRecipes.length} recettes</span>
            <span className="font-semibold text-[#7D9476]"> équilibrées</span>
            , {maxPrepTime} min max chacune
          </p>
        </div>
      </div>

      {/* Recipes Grid (Mobile) - Max 3 columns */}
      <div className="lg:hidden mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {transformedRecipes.map((recipe: any, index: number) => (
            <div
              key={recipe.id}
              className="bg-white rounded-2xl p-3 shadow-lg flex flex-col"
            >
              {/* Photo Container */}
              <div
                className="aspect-square rounded-xl overflow-hidden relative cursor-pointer"
                onClick={() => setSelectedRecipeIndex(index)}
              >
                <ImageWithFallback
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />

                {/* Time Badge on Photo */}
                <Badge className="absolute top-2 right-2 bg-[#F4C95D] text-[#414535] text-xs">
                  {recipe.meta.icon} {recipe.meta.text}
                </Badge>
              </div>

              {/* Title */}
              <h3 className="text-[#414535] font-medium text-sm leading-tight mt-2 line-clamp-2 flex-grow">
                {recipe.title}
              </h3>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto pt-2 justify-end">
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecipe(recipe);
                  }}
                  disabled={isSwapping}
                  className="bg-white border border-red-600 text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Swap Button */}
                {swapPool.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      isPremium ? handleSwapPremium(recipe) : handleSwapFree(recipe);
                    }}
                    disabled={isSwapping}
                    className="bg-[#F4C95D] text-white px-3 py-2 rounded-lg hover:bg-[#E5B84A] transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    title="Swap"
                  >
                    <span className="text-base leading-none">🔄</span>
                    <span className="text-xs font-medium">Swap</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Recipe Card - Always visible for premium (pool auto-refetches), for free only if pool > 0 */}
          {(isPremium || swapPool.length > 0) && (
            <div
              className={`rounded-2xl overflow-hidden shadow-lg relative aspect-square transition-all duration-300 ${
                maxRecipesReached || (swapPool.length === 0 && !isPremium)
                  ? 'bg-gradient-to-br from-gray-300 to-gray-400 opacity-60 cursor-not-allowed'
                  : 'bg-gradient-to-br from-[#F4C95D] to-[#E5B84A] hover:scale-105 cursor-pointer'
              }`}
              onClick={handleAddRecipe}
            >
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                  maxRecipesReached ? 'bg-white/50' : 'bg-white/30 backdrop-blur-sm'
                }`}>
                  {isSaving && swapPool.length === 0 ? (
                    <div className="animate-spin text-2xl">⏳</div>
                  ) : (
                    <span className={`text-4xl ${maxRecipesReached ? 'text-gray-600' : 'text-white'}`}>+</span>
                  )}
                </div>
                <p className={`font-medium text-center text-sm ${maxRecipesReached ? 'text-gray-600' : 'text-white'}`}>
                  {isSaving && swapPool.length === 0 ? 'Chargement...' : 'Ajouter une recette'}
                </p>
                <p className={`text-xs text-center mt-1 ${maxRecipesReached ? 'text-gray-500' : 'text-white/80'}`}>
                  {maxRecipesReached ? 'Premium 💎' : isPremium ? 'Illimité' : `${3 - activeRecipes.length} restantes`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recipes Grid (Desktop) */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-6 mb-8">
        {transformedRecipes.map((recipe: any, index: number) => (
          <div key={recipe.id} className="group bg-white rounded-2xl p-3 shadow-lg flex flex-col">
            {/* Photo Container */}
            <div
              className="aspect-square rounded-xl overflow-hidden relative cursor-pointer"
              onClick={() => setSelectedRecipeIndex(index)}
            >
              <ImageWithFallback
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Time Badge on Photo */}
              <Badge className="absolute top-2 right-2 bg-[#F4C95D] text-[#414535] text-xs">
                {recipe.meta.icon} {recipe.meta.text}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="text-[#414535] font-medium text-sm leading-tight mt-3 line-clamp-2 flex-grow">
              {recipe.title}
            </h3>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-auto pt-3 justify-end">
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeRecipe(recipe);
                }}
                disabled={isSwapping}
                className="bg-white border border-red-600 text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Swap Button */}
              {swapPool.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    isPremium ? handleSwapPremium(recipe) : handleSwapFree(recipe);
                  }}
                  disabled={isSwapping}
                  className="bg-[#F4C95D] text-white px-3 py-2 rounded-lg hover:bg-[#E5B84A] transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                  title="Swap"
                >
                  <span className="text-base leading-none">🔄</span>
                  <span className="text-xs font-medium">Swap</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add Recipe Card - Always visible for premium (pool auto-refetches), for free only if pool > 0 */}
        {(isPremium || swapPool.length > 0) && (
          <div
            className={`aspect-square rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
              maxRecipesReached || (swapPool.length === 0 && !isPremium)
                ? 'bg-gradient-to-br from-gray-300 to-gray-400 opacity-60 cursor-not-allowed'
                : 'bg-gradient-to-br from-[#F4C95D] to-[#E5B84A] hover:bg-[#F5D476] hover:scale-105 cursor-pointer'
            }`}
            onClick={handleAddRecipe}
          >
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                maxRecipesReached ? 'bg-white/50' : 'bg-white/30 backdrop-blur-sm'
              }`}>
                {isSaving && swapPool.length === 0 ? (
                  <div className="animate-spin text-3xl">⏳</div>
                ) : (
                  <span className={`text-5xl ${maxRecipesReached ? 'text-gray-600' : 'text-white'}`}>+</span>
                )}
              </div>
              <p className={`font-bold text-center ${maxRecipesReached ? 'text-gray-600' : 'text-white'}`}>
                {isSaving && swapPool.length === 0 ? 'Chargement...' : 'Ajouter une recette'}
              </p>
              <p className={`text-xs text-center mt-2 opacity-80 ${maxRecipesReached ? 'text-gray-500' : 'text-white/70'}`}>
                {maxRecipesReached ? 'Premium 💎' : isPremium ? 'Illimité' : `${3 - activeRecipes.length} restantes`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Historique Section */}
      {historique && historique.length > 0 && (
        <div className="mt-12 -mx-4 px-4 py-6 bg-[#FCFAF7] border-t border-[#EAEAEA]">
          <h2 className="text-2xl font-bold text-[#414535] mb-6">Historique</h2>

          {/* Historique Carousel */}
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
            {historique.map((item: any) => (
              <div
                key={item.id}
                className="flex-shrink-0 rounded-xl overflow-hidden shadow-lg relative aspect-square cursor-pointer group"
                style={{ width: '42.5vw', maxWidth: '175px' }}
              >
                <ImageWithFallback
                  src={item.firstRecipeImage || fallbackImageUrl}
                  alt={item.firstRecipeTitle}
                  className="w-full h-full object-cover"
                />

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white text-xs font-medium">
                    Semaine {item.weekNumber}, {item.year}
                  </p>
                  <p className="text-white/80 text-xs">{item.recipeCount} recettes</p>
                </div>

                {/* Lock Overlay for Free Users */}
                {!isPremium && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Lock className="w-6 h-6 text-white mb-1" />
                    <p className="text-white text-xs text-center font-medium mb-2">
                      Premium 💎
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpgradeHistory?.();
                      }}
                      className="bg-[#F4C95D] text-[#414535] px-2 py-1 rounded text-xs font-medium hover:bg-[#E5B84A]"
                    >
                      Débloquer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Centered Shopping List Button at Bottom */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 max-w-6xl w-full px-4">
        <button
          onClick={onOpenShoppingList}
          className="bg-[#F4C95D] text-white px-9 py-4 rounded-full shadow-lg hover:shadow-2xl hover:bg-[#E5B84A] transition-all hover:scale-110 hover:ring-4 hover:ring-[#F4C95D]/30 flex items-center gap-4 mx-auto"
          aria-label="Voir ma liste de courses"
        >
          <ClipboardList className="w-9 h-9" />
          <span className="text-lg font-semibold">Voir ma liste</span>
        </button>
      </div>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />

      {/* Swap Panel - Gratuit only */}
      {!isPremium && (
        <SwapPanel
          isOpen={swapPanelOpen}
          onClose={() => {
            setSwapPanelOpen(false);
            setRecipeToSwap(null);
          }}
          availableRecipes={availableForSwap}
          targetRecipe={recipeToSwap}
          onSwapConfirm={handleSwapConfirm}
          hasSwappedThisWeek={swapsCount > 0}
          numServings={menu.numServings}
          quotaExceeded={!canSwap}
        />
      )}

      {/* Recipe Modal */}
      {selectedRecipeIndex !== null && (
        <RecipeModal
          recipes={transformedRecipes}
          initialRecipeIndex={selectedRecipeIndex}
          isOpen={selectedRecipeIndex !== null}
          onClose={() => setSelectedRecipeIndex(null)}
          onRecipeChange={setSelectedRecipeIndex}
          numServings={menu.numServings}
        />
      )}

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
