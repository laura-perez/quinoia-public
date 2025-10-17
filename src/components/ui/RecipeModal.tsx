/**
 * RecipeModal - Modal de détail des recettes avec container coulissant
 * Design inspiré de l'image fournie avec navigation horizontale entre recettes
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { Badge } from './badge';

interface RecipeModalProps {
  recipes: Array<{
    id: string;
    title: string;
    titleFr: string;
    prepTimeMinutes: number;
    caloriesPerServing: number;
    proteinGPerServing: number;
    carbsGPerServing: number;
    fatGPerServing: number;
    cookingLevel: string;
    ingredients: Array<{
      nom: string;
      quantite: number;
      unite: string;
      canonical_name?: string;
    }>;
    instructions: string[];
    cookingTip?: string;
    cuisineType?: string;
    tags: string[];
    image: string;
  }>;
  initialRecipeIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onRecipeChange?: (index: number) => void;
  numServings: number;
  recipeTips?: { [recipeId: string]: Array<{
    id: string;
    type: string;
    icon: string;
    text: string;
  }> };
}

// Interface for parsed cooking tips
interface CookingTip {
  id: string;
  text: string;
  category: string;
  icon: string;
}

// Helper function to parse cooking tips JSON and add icons
function parseCookingTips(cookingTip?: string | any): CookingTip[] {
  if (!cookingTip) {
    return [];
  }

  try {
    // If cookingTip is already an object, use it directly
    // If it's a string, parse it as JSON
    let parsed: any;
    if (typeof cookingTip === 'string') {
      parsed = JSON.parse(cookingTip);
    } else {
      parsed = cookingTip;
    }

    if (!parsed.tips || !Array.isArray(parsed.tips)) {
      return [];
    }

    return parsed.tips.map((tip: any) => ({
      id: tip.id || 'unknown',
      text: tip.text || '',
      category: tip.category || 'general',
      icon: getCategoryIcon(tip.category || 'general')
    }));
  } catch (error) {
    return [];
  }
}

// Helper function to get icon based on tip category
function getCategoryIcon(category: string): string {
  const iconMap: { [key: string]: string } = {
    general: '👨‍🍳',
    ingredient: '🥬',
    technique: '🔥',
    efficiency: '⚡',
    time_saver: '⏰',
    nutrition: '💪'
  };
  return iconMap[category] || '💡';
}

export function RecipeModal({
  recipes,
  initialRecipeIndex,
  isOpen,
  onClose,
  onRecipeChange,
  numServings,
  recipeTips
}: RecipeModalProps) {
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(initialRecipeIndex);
  const [isExtended, setIsExtended] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentRecipe = recipes[currentRecipeIndex];

  // Reset extension state when recipe changes
  useEffect(() => {
    setIsExtended(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentRecipeIndex]);

  // Handle scroll to extend/collapse container
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop } = scrollRef.current;

    if (scrollTop > 20 && !isExtended) {
      setIsExtended(true);
    } else if (scrollTop === 0 && isExtended) {
      setIsExtended(false);
    }
  }, [isExtended]);

  // Handle touch gestures for navigation and pull-to-extend
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !scrollRef.current) return;

    const touch = e.touches[0];
    const deltaY = touchStart.y - touch.clientY;
    const deltaX = touchStart.x - touch.clientX;

    // Horizontal gesture for recipe navigation (only if more than one recipe)
    if (recipes.length > 1 && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe left → next recipe
        goToNext();
      } else {
        // Swipe right → previous recipe
        goToPrevious();
      }
      setTouchStart(null); // Reset to prevent multiple triggers
      return;
    }

    // Vertical gesture for extend/collapse
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 50 && !isExtended) {
        setIsExtended(true);
      } else if (deltaY < -50 && isExtended && scrollRef.current.scrollTop === 0) {
        setIsExtended(false);
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  // Navigation between recipes
  const goToPrevious = useCallback(() => {
    const newIndex = currentRecipeIndex > 0 ? currentRecipeIndex - 1 : recipes.length - 1;
    setCurrentRecipeIndex(newIndex);
    onRecipeChange?.(newIndex);
  }, [currentRecipeIndex, recipes.length, onRecipeChange]);

  const goToNext = useCallback(() => {
    const newIndex = currentRecipeIndex < recipes.length - 1 ? currentRecipeIndex + 1 : 0;
    setCurrentRecipeIndex(newIndex);
    onRecipeChange?.(newIndex);
  }, [currentRecipeIndex, recipes.length, onRecipeChange]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentRecipeIndex, onClose, goToPrevious, goToNext]);

  // Format ingredients (no scaling needed - already scaled in API)
  const formatIngredient = (ingredient: typeof currentRecipe.ingredients[0]) => {
    // Ingredients in resultBundle are already scaled to user-selected servings
    const quantity = Math.round((ingredient.quantite || 0) * 10) / 10;
    return `${quantity} ${ingredient.unite} ${ingredient.nom}`;
  };


  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Centered container for desktop (max-w-6xl like MenuSection) */}
      <div className="relative h-full max-w-6xl mx-auto">
        {/* Recipe image background */}
        <div className="relative h-full">
          <ImageWithFallback
            src={currentRecipe.image}
            alt={currentRecipe.title}
            className="w-full h-[50vh] object-cover object-top md:object-center"
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors hover:bg-white/90"
          >
            <X className="w-5 h-5" style={{ color: '#414535' }} />
          </button>


          {/* Sliding white container */}
          <div
            ref={containerRef}
            className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl transition-all duration-500 ease-out ${
              isExtended ? 'h-full' : 'h-[60%]'
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
          {/* Handle indicator */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />

          {/* Recipe indicators */}
          {recipes.length > 1 && (
            <div className="flex justify-center gap-2 mb-4">
              {recipes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentRecipeIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentRecipeIndex
                      ? 'bg-amber-400'
                      : 'bg-gray-300'
                  }`}
                  style={{
                    backgroundColor: index === currentRecipeIndex ? '#F4C95D' : '#E5E5E5'
                  }}
                />
              ))}
            </div>
          )}

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto px-6 pb-24"
            onScroll={handleScroll}
          >
            {/* Recipe header - Always visible */}
            <div className="pb-4">
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#414535' }}>
                {currentRecipe.titleFr}
              </h2>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: '#414535' }}>
                    {numServings}
                  </p>
                  <p className="text-xs" style={{ color: '#8A8A8A' }}>
                    {numServings > 1 ? 'Portions' : 'Portion'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: '#414535' }}>
                    {currentRecipe.ingredients.length}
                  </p>
                  <p className="text-xs" style={{ color: '#8A8A8A' }}>Ingrédients</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: '#414535' }}>
                    {currentRecipe.prepTimeMinutes} min
                  </p>
                  <p className="text-xs" style={{ color: '#8A8A8A' }}>Total Time</p>
                </div>
              </div>
            </div>

            {/* Scrollable detailed content */}
            <div className="space-y-6">
              {/* Nutrition info */}
              <div className="space-y-2">
                <p className="text-xs text-left" style={{ color: '#8A8A8A' }}>Par portion :</p>
                <div className="grid grid-cols-4 gap-4 p-4 rounded-lg" style={{ backgroundColor: '#FFF6DC' }}>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: '#414535' }}>
                      {Math.round(currentRecipe.caloriesPerServing)}
                    </p>
                    <p className="text-xs" style={{ color: '#8A8A8A' }}>Calories</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: '#414535' }}>
                      {Math.round(currentRecipe.proteinGPerServing)}g
                    </p>
                    <p className="text-xs" style={{ color: '#8A8A8A' }}>Protéines</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: '#414535' }}>
                      {Math.round(currentRecipe.carbsGPerServing)}g
                    </p>
                    <p className="text-xs" style={{ color: '#8A8A8A' }}>Glucides</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: '#414535' }}>
                      {Math.round(currentRecipe.fatGPerServing)}g
                    </p>
                    <p className="text-xs" style={{ color: '#8A8A8A' }}>Lipides</p>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="text-lg font-medium mb-3" style={{ color: '#414535' }}>
                  Ingrédients
                </h3>
                <div className="space-y-2">
                  {currentRecipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: '#FFFDF8' }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F4C95D' }} />
                      <span className="text-sm" style={{ color: '#414535' }}>
                        {formatIngredient(ingredient)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="text-lg font-medium mb-3" style={{ color: '#414535' }}>
                  Instructions
                </h3>
                <div className="space-y-4">
                  {currentRecipe.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#F4C95D' }}
                      >
                        {index + 1}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#414535' }}>
                        {instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {currentRecipe.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3" style={{ color: '#414535' }}>
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentRecipe.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        style={{ backgroundColor: '#FFF6DC', color: '#414535' }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Cooking Tips from Database */}
              {(() => {
                const cookingTips = parseCookingTips(currentRecipe.cookingTip);
                return cookingTips.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3" style={{ color: '#414535' }}>
                      💡 Astuces pour cette recette
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cookingTips.map((tip: CookingTip) => (
                        <div
                          key={tip.id}
                          className="flex items-start gap-3 p-4 rounded-lg"
                          style={{ backgroundColor: '#FFF6DC' }}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#F4C95D' }}
                          >
                            <span className="text-sm">{tip.icon}</span>
                          </div>
                          <p className="text-sm" style={{ color: '#414535' }}>
                            {tip.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}