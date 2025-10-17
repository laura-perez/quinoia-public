/**
 * Modern Menu Display for Dashboard
 * Inspired by /menu/[shareId] UI with carousel, images, and smooth navigation
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Lightbulb, CheckSquare, List } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RecipeModal } from '@/components/ui/RecipeModal';
import { generateShoppingList } from '@/utils/shoppingList/generator';
import { useMenuSwap } from '@/hooks/useMenuSwap';
import { getSectionDisplayNameWithContext } from '@/lib/constants';
import type { DashboardMenu } from '@/types/dashboard';
import type { CanonicalIngredientInfo } from '@/lib/supabase/repositories/ingredients';

interface MenuDisplayModernProps {
  menu: DashboardMenu;
  ingredientsCatalog: Record<string, CanonicalIngredientInfo>;
  onError: (error: string) => void;
}

// Fallback image URL for recipes without pictures
const fallbackImageUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZGlzaHxlbnwxfHx8fDE3NTY4Mjg0MjF8MA&ixlib=rb-4.1.0&q=80&w=1080`;

export function MenuDisplayModern({ menu, ingredientsCatalog, onError }: MenuDisplayModernProps) {
  const [currentRecipe, setCurrentRecipe] = useState(0);
  const [activeSection, setActiveSection] = useState('recettes');
  const [shoppingData, setShoppingData] = useState<any>({});
  const [checkedItems, setCheckedItems] = useState<any[]>([]);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Refs for scrolling
  const recettesRef = useRef<HTMLDivElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  const astucesRef = useRef<HTMLDivElement>(null);

  // Use menu swap hook - always call hooks before any early returns
  const {
    activeRecipes,
    swapPool,
    swapsCount,
    swapRecipe,
    isSwapping,
    isSaving,
  } = useMenuSwap({
    initialActiveRecipes: menu?.activeRecipes || [],
    initialSwapPool: menu?.swapPool || [],
    initialSwapsCount: menu?.swapsCount || 0,
    menuId: menu?.id || '',
    numServings: menu?.numServings || 2,
    onError,
  });

  // Calculate shopping list - moved before early return with safe defaults
  const shoppingList = useMemo(
    () =>
      menu && ingredientsCatalog
        ? generateShoppingList({
            recipes: activeRecipes,
            numServings: menu.numServings,
            ingredientsCatalog,
          })
        : null,
    [activeRecipes, menu?.numServings, ingredientsCatalog, menu]
  );

  // Transform recipes with image URLs - moved before early return with safe defaults
  const transformedRecipes = useMemo(() =>
    activeRecipes.map((recipe: any) => ({
      ...recipe,
      title: recipe.titleFr,
      image: recipe.imageUrl || fallbackImageUrl,
      meta: { icon: "⏱", text: `${recipe.prepTimeMinutes} min` }
    })),
    [activeRecipes]
  );

  // Initialize shopping data - moved before early return
  React.useEffect(() => {
    if (shoppingList?.organizedByCategory && menu && ingredientsCatalog) {
      const transformedData: any = {};

      shoppingList.organizedByCategory.forEach((categoryGroup: any) => {
        const sectionName = getSectionDisplayNameWithContext(
          categoryGroup.section_code,
          categoryGroup.category
        );

        if (!transformedData[sectionName]) {
          transformedData[sectionName] = [];
        }

        categoryGroup.items.forEach((item: any, index: number) => {
          transformedData[sectionName].push({
            id: `${categoryGroup.section_code}-${categoryGroup.category}-${index}`,
            name: item.name_fr,
            quantity: `${Math.round(item.total_amount * 10) / 10} ${item.unit}`,
            checked: false,
            category: categoryGroup.category
          });
        });
      });

      setShoppingData(transformedData);
    }
  }, [shoppingList]);

  // Scroll observer
  React.useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { key: 'recettes', ref: recettesRef },
        { key: 'liste', ref: listeRef },
        { key: 'astuces', ref: astucesRef }
      ];

      let currentSection = 'recettes';

      for (const section of sections) {
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect();
          if (rect.top <= 100) {
            currentSection = section.key;
          }
        }
      }

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const refs = {
      recettes: recettesRef,
      liste: listeRef,
      astuces: astucesRef
    };

    const targetRef = refs[section as keyof typeof refs];
    if (targetRef?.current) {
      const elementTop = targetRef.current.offsetTop;
      const offset = 20;

      window.scrollTo({
        top: elementTop - offset,
        behavior: 'smooth'
      });
    }
  };

  const toggleItem = (rayonName: string, itemId: string) => {
    setShoppingData((prev: any) => {
      const newData = { ...prev };
      const rayon = newData[rayonName];
      const itemIndex = rayon.findIndex((item: any) => item.id === itemId);

      if (itemIndex !== -1) {
        const item = { ...rayon[itemIndex] };
        item.checked = !item.checked;

        if (item.checked) {
          setCheckedItems(prevChecked => [...prevChecked, { ...item, rayon: rayonName }]);
          rayon.splice(itemIndex, 1);
        } else {
          rayon[itemIndex] = item;
        }
      }

      return newData;
    });
  };

  const toggleCheckedItem = (itemId: string) => {
    setCheckedItems(prev => {
      const itemIndex = prev.findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        const item = prev[itemIndex];
        setShoppingData((prevData: any) => {
          const newData = { ...prevData };
          const rayon = newData[item.rayon];
          rayon.push({ ...item, checked: false });
          return newData;
        });
        return prev.filter(item => item.id !== itemId);
      }
      return prev;
    });
  };

  const getTotalItems = () => {
    const uncheckedCount = Object.values(shoppingData).reduce((total: number, rayon: any) => total + rayon.length, 0);
    const checkedCount = checkedItems.length;
    return { remaining: uncheckedCount, total: uncheckedCount + checkedCount };
  };

  const openRecipeModal = (recipeIndex: number) => {
    setSelectedRecipeIndex(recipeIndex);
    setCurrentRecipe(recipeIndex);
  };

  const closeRecipeModal = () => {
    setSelectedRecipeIndex(null);
  };

  const handleRecipeChange = (newIndex: number) => {
    setCurrentRecipe(newIndex);
  };

  const handleCarouselScroll = useCallback(() => {
    if (carouselRef.current && transformedRecipes) {
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
    }
  }, [currentRecipe, transformedRecipes]);

  const { remaining, total } = getTotalItems();

  // Mock tips (could come from API later)
  const displayTips = [
    { id: "1", type: "organization", icon: "⚡", text: "Réalise en avance des découpes de légumes → 10 min de gagné" },
    { id: "2", type: "batch", icon: "🔥", text: "Préchauffage four pendant que tu prépares → temps optimisé" },
    { id: "3", type: "nutrition", icon: "💡", text: "Double les portions et congèle → repas rapide demain" },
    { id: "4", type: "planning", icon: "⏰", text: "Utilise la cuisson vapeur pour garder les nutriments" }
  ];

  // Safety check - moved after all hooks
  if (!menu || !menu.activeRecipes || !ingredientsCatalog) {
    return (
      <div className="text-center py-8">
        <p className="text-[#8A8A8A]">Erreur de chargement du menu</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Menu Info Banner */}
      <div className="w-full py-4 mb-6">
        <div className="text-left space-y-2">
          <p className="font-medium leading-relaxed text-[#414535] text-2xl">
            Voici ton menu de la semaine 🍽️
          </p>
          <p className="text-sm font-medium leading-relaxed text-[#414535]">
            <span className="font-semibold text-[#F4C95D]">
              {activeRecipes.length} repas équilibrés
            </span>
            , prêts en{' '}
            <span className="font-semibold text-[#F4C95D]">
              {Math.max(...activeRecipes.map((r: any) => r.prepTimeMinutes))} min max
            </span>
            , avec ta liste de courses incluse.
          </p>
          {isSaving && (
            <p className="text-sm text-[#8A8A8A] flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[#F4C95D] border-t-transparent rounded-full animate-spin"></div>
              Sauvegarde en cours...
            </p>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden w-full">
        <div className="py-4 pb-20 space-y-4 w-full max-w-full">
          {/* Recettes Section */}
          <div ref={recettesRef} id="recettes" className="space-y-4 w-full pt-2">
            <div className="relative w-full">
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
                style={{
                  scrollSnapType: 'x mandatory',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  paddingLeft: '7.5vw',
                  paddingRight: '7.5vw',
                  marginLeft: '-7.5vw',
                  marginRight: '-7.5vw'
                }}
                onScroll={handleCarouselScroll}
              >
                {transformedRecipes.map((recipe: any, index: number) => (
                  <div
                    key={recipe.id}
                    className={`flex-shrink-0 rounded-2xl overflow-hidden shadow-quinoia relative aspect-square snap-center transition-opacity duration-300 cursor-pointer ${
                      index === currentRecipe ? 'opacity-100' : 'opacity-40'
                    }`}
                    style={{
                      width: '85vw',
                      maxWidth: '350px',
                      scrollSnapAlign: 'center'
                    }}
                    onClick={() => openRecipeModal(index)}
                  >
                    <ImageWithFallback
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Bottom Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <h3 className="text-white mb-2 font-medium leading-tight text-sm">
                        {recipe.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-foreground hover:bg-primary/90 text-xs px-2 py-1"
                          style={{ backgroundColor: '#F4C95D', color: '#414535' }}
                        >
                          {recipe.meta.icon} {recipe.meta.text}
                        </Badge>
                      </div>
                      {swapPool.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (swapPool.length > 0) {
                              swapRecipe(recipe, swapPool[0]);
                            }
                          }}
                          disabled={isSwapping}
                          className="mt-2 text-sm text-white hover:text-[#F4C95D] font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          🔄 Swapper
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Liste de courses Section */}
          <div ref={listeRef} id="liste" className="space-y-6 w-full pt-6">
            <div className="w-full">
              <div className="flex items-start justify-between w-full mb-2">
                <div>
                  <h2 className="text-[#414535] text-xl">🛒 Liste de courses complète</h2>
                  <p className="text-[#414535] text-base mt-0.5">✓ Pour mes {activeRecipes.length} recettes</p>
                </div>
                <Badge variant="secondary" style={{ backgroundColor: '#FFF6DC', color: '#414535' }}>
                  {remaining}/{total} restants
                </Badge>
              </div>
              <p className="text-[#8A8A8A] text-sm">
                {menu.numServings} portions • Organisée par rayon
              </p>
            </div>

            <Accordion type="multiple" className="space-y-2 w-full">
              {Object.entries(shoppingData).map(([rayonName, items]: [string, any]) => (
                <AccordionItem
                  key={rayonName}
                  value={rayonName}
                  className="border rounded-lg w-full"
                  style={{ borderColor: '#EAEAEA' }}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[#414535] truncate pr-2">
                        {rayonName} ({items.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 w-full">
                    <div className="space-y-3 w-full">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 w-full">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => toggleItem(rayonName, item.id)}
                            className="flex-shrink-0"
                          />
                          <span className="flex-1 text-sm leading-tight min-w-0 text-[#414535]">
                            <span className="truncate block">{item.name}</span>
                            <span className="text-xs opacity-75">{item.quantity}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}

              {/* Checked Items */}
              {checkedItems.length > 0 && (
                <AccordionItem
                  value="checked-items"
                  className="border rounded-lg opacity-60 w-full"
                  style={{ borderColor: '#EAEAEA' }}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[#8A8A8A] truncate pr-2">
                        Articles cochés ({checkedItems.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 w-full">
                    <div className="space-y-3 w-full">
                      {checkedItems.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 w-full">
                          <Checkbox
                            checked={true}
                            onCheckedChange={() => toggleCheckedItem(item.id)}
                            className="flex-shrink-0"
                          />
                          <span className="flex-1 text-sm leading-tight line-through min-w-0 text-[#8A8A8A]">
                            <span className="truncate block">{item.name}</span>
                            <span className="text-xs opacity-75">{item.quantity}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>

          {/* Astuces Section */}
          <div ref={astucesRef} id="astuces" className="space-y-6 w-full pt-6">
            <h2 className="text-[#414535] text-xl">Astuces personnalisées</h2>

            <div className="space-y-4 w-full">
              {displayTips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-start gap-3 p-4 rounded-lg w-full"
                  style={{ backgroundColor: '#FFF6DC' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#F4C95D' }}
                  >
                    <span className="text-sm">{tip.icon}</span>
                  </div>
                  <p className="text-sm flex-1 leading-relaxed text-[#414535]">
                    {tip.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div
          className="fixed bottom-4 left-10 right-10 bg-white/60 backdrop-blur-md border rounded-2xl px-2 py-1 w-auto z-50 lg:hidden shadow-xl"
          style={{
            borderColor: 'rgba(234, 234, 234, 0.3)',
            borderWidth: '1px'
          }}
        >
          <div className="flex justify-around items-center w-full max-w-xs mx-auto">
            {[
              { key: 'recettes', label: 'Recettes', icon: CheckSquare },
              { key: 'liste', label: 'Liste', icon: List },
              { key: 'astuces', label: 'Astuces', icon: Lightbulb }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => scrollToSection(key)}
                className={`flex flex-col items-center gap-1 py-2 px-3 min-h-[45px] justify-center flex-1 rounded-xl transition-all duration-200 ${
                  activeSection === key ? 'transform scale-105' : 'hover:bg-white/20'
                }`}
                style={{
                  backgroundColor: activeSection === key ? 'rgba(244, 201, 93, 0.2)' : 'transparent'
                }}
              >
                <Icon
                  className="w-5 h-5 transition-colors duration-200"
                  style={{
                    color: activeSection === key ? '#F4C95D' : '#8A8A8A'
                  }}
                />
                <span
                  className={`text-xs font-medium truncate transition-colors duration-200 ${
                    activeSection === key ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: activeSection === key ? '#F4C95D' : '#8A8A8A',
                    fontSize: '10px'
                  }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipe Modal */}
      {selectedRecipeIndex !== null && (
        <RecipeModal
          recipes={transformedRecipes}
          initialRecipeIndex={selectedRecipeIndex}
          isOpen={selectedRecipeIndex !== null}
          onClose={closeRecipeModal}
          onRecipeChange={handleRecipeChange}
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
