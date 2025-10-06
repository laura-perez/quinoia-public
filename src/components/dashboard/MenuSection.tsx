/**
 * Menu Section - Main screen with recipes carousel and shopping list
 */

import React, { useState, useRef, useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Badge } from '@/components/ui/badge';
import { RecipeModal } from '@/components/ui/RecipeModal';
import { useMenuSwap } from '@/hooks/useMenuSwap';
import { generateShoppingList } from '@/utils/shoppingList/generator';
import type { DashboardMenu } from '@/types/dashboard';
import type { CanonicalIngredientInfo } from '@/lib/supabase/repositories/ingredients';

interface MenuSectionProps {
  menu: DashboardMenu;
  ingredientsCatalog: Record<string, CanonicalIngredientInfo>;
  isPremium: boolean;
  swapQuota: { used: number; limit: number | null };
  onError: (error: string) => void;
  onSwapQuotaExceeded: () => void;
  onOpenShoppingList: () => void;
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
}: MenuSectionProps) {
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const {
    activeRecipes,
    swapPool,
    swapsCount,
    swapRecipe,
    isSwapping,
    isSaving,
  } = useMenuSwap({
    initialActiveRecipes: menu.activeRecipes,
    initialSwapPool: menu.swapPool,
    menuId: menu.id,
    numServings: menu.numServings,
    onError,
  });

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

  const canSwap = isPremium || swapQuota.used < (swapQuota.limit || 0);

  const handleSwap = (recipe: any) => {
    if (!canSwap) {
      onSwapQuotaExceeded();
      return;
    }

    if (swapPool.length > 0) {
      swapRecipe(recipe, swapPool[0]);
    }
  };

  const handleCarouselScroll = () => {
    if (!carouselRef.current || !transformedRecipes) return;

    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const scrollCenter = scrollLeft + containerWidth / 2;

    const recipeElements = container.children;
    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < recipeElements.length; i++) {
      const element = recipeElements[i] as HTMLElement;
      const elementCenter = element.offsetLeft + element.offsetWidth / 2;
      const distance = Math.abs(scrollCenter - elementCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    if (closestIndex !== currentRecipe) {
      setCurrentRecipe(closestIndex);
    }
  };

  const maxPrepTime = Math.max(...activeRecipes.map((r: any) => r.prepTimeMinutes));

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-[#414535]">Ta semaine est prête 🍽️</h2>
            <p className="text-[#8A8A8A] mt-1">
              <span className="font-semibold text-[#F4C95D]">{activeRecipes.length} recettes équilibrées</span>
              , {maxPrepTime} min max chacune
            </p>
          </div>

          {/* Premium/Free Badge */}
          {!isPremium && (
            <button
              onClick={() => onSwapQuotaExceeded()} // Reuse the upgrade callback
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all bg-[#FFF6DC] text-[#414535] hover:bg-[#F4C95D] border border-[#F4C95D]"
            >
              Gratuit — découvrir Premium 💎
            </button>
          )}
        </div>

        {isSaving && (
          <p className="text-sm text-[#8A8A8A] flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[#F4C95D] border-t-transparent rounded-full animate-spin"></div>
            Sauvegarde...
          </p>
        )}
      </div>

      {/* Recipes Carousel (Mobile) */}
      <div className="lg:hidden mb-8">
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
          style={{
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
          onScroll={handleCarouselScroll}
        >
          {transformedRecipes.map((recipe: any, index: number) => (
            <div
              key={recipe.id}
              className={`flex-shrink-0 rounded-2xl overflow-hidden shadow-lg relative aspect-square snap-center transition-all duration-300 ${
                index === currentRecipe ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
              }`}
              style={{ width: '85vw', maxWidth: '350px' }}
            >
              <div
                className="w-full h-full cursor-pointer"
                onClick={() => setSelectedRecipeIndex(index)}
              >
                <ImageWithFallback
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />

                {/* Bottom Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <h3 className="text-white mb-2 font-medium text-sm leading-tight">
                    {recipe.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#F4C95D] text-[#414535] text-xs">
                      {recipe.meta.icon} {recipe.meta.text}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              {swapPool.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwap(recipe);
                  }}
                  disabled={isSwapping}
                  className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-[#414535] px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white transition-all disabled:opacity-50"
                >
                  Swap
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recipes Grid (Desktop) */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 mb-8">
        {transformedRecipes.map((recipe: any, index: number) => (
          <div
            key={recipe.id}
            className="rounded-2xl overflow-hidden shadow-lg relative aspect-[4/5] cursor-pointer group"
            onClick={() => setSelectedRecipeIndex(index)}
          >
            <ImageWithFallback
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Bottom Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h3 className="text-white mb-2 font-medium text-sm leading-tight">
                {recipe.title}
              </h3>
              <Badge className="bg-[#F4C95D] text-[#414535] text-xs">
                {recipe.meta.icon} {recipe.meta.text}
              </Badge>
            </div>

            {/* Swap Button */}
            {swapPool.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwap(recipe);
                }}
                disabled={isSwapping}
                className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-[#414535] px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100"
              >
                Swap
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Floating Shopping List Button */}
      <button
        onClick={onOpenShoppingList}
        className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 bg-[#F4C95D] text-[#414535] p-4 rounded-full shadow-xl hover:bg-[#E5B84A] transition-all hover:scale-110 z-40"
      >
        <ShoppingCart className="w-6 h-6" />
      </button>

      {/* Recipe Modal */}
      {selectedRecipeIndex !== null && (
        <RecipeModal
          recipes={transformedRecipes}
          initialRecipeIndex={selectedRecipeIndex}
          isOpen={selectedRecipeIndex !== null}
          onClose={() => setSelectedRecipeIndex(null)}
          onRecipeChange={setCurrentRecipe}
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
