/**
 * RecipeModal - Modal de détail des recettes avec carousel horizontal
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
  const [isClosing, setIsClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Reset extension state when recipe changes
  useEffect(() => {
    setIsExtended(false);
    const scrollRef = scrollRefs.current[currentRecipeIndex];
    if (scrollRef) {
      scrollRef.scrollTop = 0;
    }
  }, [currentRecipeIndex]);

  // Handle scroll to extend/collapse container
  const handleScroll = useCallback((recipeIndex: number) => {
    const scrollRef = scrollRefs.current[recipeIndex];
    if (!scrollRef || recipeIndex !== currentRecipeIndex) return;

    const { scrollTop } = scrollRef;

    if (scrollTop > 20 && !isExtended) {
      setIsExtended(true);
    } else if (scrollTop === 0 && isExtended) {
      setIsExtended(false);
    }
  }, [isExtended, currentRecipeIndex]);

  // Handle touch gestures for navigation and pull-to-extend
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const scrollRef = scrollRefs.current[currentRecipeIndex];
    if (!scrollRef) return;

    const touch = e.touches[0];
    const deltaY = touchStart.y - touch.clientY;
    const deltaX = touchStart.x - touch.clientX;

    // Horizontal gesture for recipe navigation (only if more than one recipe)
    if (recipes.length > 1 && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsDragging(true);

      // Calculate drag offset with bounds resistance
      let offset = -deltaX;

      // Add resistance at bounds
      if (currentRecipeIndex === 0 && offset > 0) {
        // At first recipe, swiping right - add resistance
        offset = offset * 0.3;
      } else if (currentRecipeIndex === recipes.length - 1 && offset < 0) {
        // At last recipe, swiping left - add resistance
        offset = offset * 0.3;
      }

      setDragOffset(offset);
      return;
    }

    // Vertical gesture - pull down to close when at top
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Pull down from top to close
      if (deltaY < -50 && scrollRef.scrollTop === 0) {
        handleClose();
        return;
      }

      // Pull up to extend
      if (deltaY > 50 && !isExtended) {
        setIsExtended(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;

    // Handle horizontal swipe completion
    if (isDragging && recipes.length > 1) {
      const swipeThreshold = 100; // pixels needed to trigger navigation

      if (dragOffset < -swipeThreshold && currentRecipeIndex < recipes.length - 1) {
        // Swipe left → next recipe
        goToNext();
      } else if (dragOffset > swipeThreshold && currentRecipeIndex > 0) {
        // Swipe right → previous recipe
        goToPrevious();
      }
    }

    setTouchStart(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  // Navigation between recipes (bounded - no loop)
  const goToPrevious = useCallback(() => {
    if (currentRecipeIndex > 0) {
      const newIndex = currentRecipeIndex - 1;
      setCurrentRecipeIndex(newIndex);
      onRecipeChange?.(newIndex);
    }
  }, [currentRecipeIndex, onRecipeChange]);

  const goToNext = useCallback(() => {
    if (currentRecipeIndex < recipes.length - 1) {
      const newIndex = currentRecipeIndex + 1;
      setCurrentRecipeIndex(newIndex);
      onRecipeChange?.(newIndex);
    }
  }, [currentRecipeIndex, recipes.length, onRecipeChange]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          handleClose();
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
  }, [isOpen, goToPrevious, goToNext]);

  // Format ingredients (no scaling needed - already scaled in API)
  const formatIngredient = (ingredient: any) => {
    // Ingredients in resultBundle are already scaled to user-selected servings
    const quantity = Math.round((ingredient.quantite || 0) * 10) / 10;
    return `${quantity} ${ingredient.unite} ${ingredient.nom}`;
  };


  if (!isOpen && !isClosing) return null;

  // Calculate carousel transform based on current index and drag offset
  // Each recipe takes up 100% of the viewport width, so we translate by (index * 100vw)
  const percentPerRecipe = 100 / recipes.length; // Each recipe is this % of the carousel
  const carouselTransform = `translateX(calc(-${currentRecipeIndex * percentPerRecipe}% + ${dragOffset}px))`;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Background overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Close button - Fixed position */}
      <button
        onClick={handleClose}
        className="fixed top-4 right-4 z-[60] w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors hover:bg-white/90"
      >
        <X className="w-5 h-5" style={{ color: '#414535' }} />
      </button>

      {/* Centered container for desktop (max-w-6xl like MenuSection) */}
      <div className={`relative h-full max-w-6xl mx-auto transition-all duration-300 overflow-hidden ${
        isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}>
        {/* Carousel container - all recipes side by side */}
        <div
          className="relative h-full flex"
          style={{
            transform: carouselTransform,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            width: `${recipes.length * 100}%`
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {recipes.map((recipe, recipeIndex) => (
            <div
              key={recipe.id}
              className="relative h-full"
              style={{ width: `${100 / recipes.length}%`, flexShrink: 0 }}
            >
              {/* Recipe image background */}
              <ImageWithFallback
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-[50vh] object-cover object-top md:object-center"
              />

              {/* Sliding white container */}
              <div
                ref={containerRef}
                className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl transition-all duration-500 ease-out ${
                  isExtended ? 'h-full' : 'h-[60%]'
                }`}
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
                  ref={(el) => { scrollRefs.current[recipeIndex] = el; }}
                  className="h-full overflow-y-auto px-6 pb-24"
                  onScroll={() => handleScroll(recipeIndex)}
                >
                  {/* Recipe header - Always visible */}
                  <div className="pb-4">
                    <h2 className="text-xl font-semibold mb-2" style={{ color: '#414535' }}>
                      {recipe.titleFr}
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
                          {recipe.ingredients.length}
                        </p>
                        <p className="text-xs" style={{ color: '#8A8A8A' }}>Ingrédients</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium" style={{ color: '#414535' }}>
                          {recipe.prepTimeMinutes} min
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
                            {Math.round(recipe.caloriesPerServing)}
                          </p>
                          <p className="text-xs" style={{ color: '#8A8A8A' }}>Calories</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium" style={{ color: '#414535' }}>
                            {Math.round(recipe.proteinGPerServing)}g
                          </p>
                          <p className="text-xs" style={{ color: '#8A8A8A' }}>Protéines</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium" style={{ color: '#414535' }}>
                            {Math.round(recipe.carbsGPerServing)}g
                          </p>
                          <p className="text-xs" style={{ color: '#8A8A8A' }}>Glucides</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium" style={{ color: '#414535' }}>
                            {Math.round(recipe.fatGPerServing)}g
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
                        {recipe.ingredients.map((ingredient, index) => (
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
                        {recipe.instructions.map((instruction, index) => (
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
                    {recipe.tags.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3" style={{ color: '#414535' }}>
                          Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {recipe.tags.map((tag, index) => (
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
                      const cookingTips = parseCookingTips(recipe.cookingTip);
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
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
