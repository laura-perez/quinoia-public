/**
 * Menu Sharing Page - /menu/{shareId}
 * Public page displaying personalized recipes and shopping lists
 * IMPORTANT: Must send X-Robots-Tag: noindex and be PII-free per specs
 */

import React, { useState, useRef } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getServiceClient } from '@/lib/supabase/client';
import { getRecipeImageUrls } from '@/lib/supabase/storage';
import { createLogger } from '@/lib/logger';
import { getSectionDisplayNameWithContext } from '@/lib/constants';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/ui/Navbar';
import { RecipeModal } from '@/components/ui/RecipeModal';
import { ShoppingListDrawer } from '@/components/dashboard/ShoppingListDrawer';
import { ClipboardList } from 'lucide-react';

const logger = createLogger();

// Interface for transformed recipes with image URLs
interface TransformedRecipe {
  id: string;
  title: string;
  titleFr: string;
  prepTimeMinutes: number;
  caloriesPerServing: number;
  proteinGPerServing: number;
  carbsGPerServing: number;
  fatGPerServing: number;
  cookingLevel: string;
  picture_file?: string;
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
  image: string; // The actual image URL (Supabase or fallback)
  meta: { icon: string; text: string };
}

interface MenuPageProps {
  shareId: string;
  resultBundle?: {
    version: string;
    generatedAt: string;
    meta: {
      primaryGoal: string;
      numRecipes: number;
      numServings: number;
      selectionStrategy: string;
    };
    userProfile?: {
      firstName: string;
    };
    aiTips?: {
      generalTips: Array<{
        id: string;
        type: string;
        icon: string;
        text: string;
      }>;
      recipeTips: { [recipeId: string]: Array<{
        id: string;
        type: string;
        icon: string;
        text: string;
      }> };
    };
    recipes: Array<{
      id: string;
      titleFr: string;
      prepTimeMinutes: number;
      caloriesPerServing: number;
      proteinGPerServing: number;
      carbsGPerServing: number;
      fatGPerServing: number;
      cookingLevel: string;
      picture_file?: string; // New: filename in recipes_photos bucket
      imageUrl?: string | null; // New: resolved image URL from Supabase Storage
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

export default function MenuPage({resultBundle, error }: MenuPageProps) {
  const [currentRecipe, setCurrentRecipe] = useState(0);
  const [activeSection, setActiveSection] = useState('recettes');
  const [shoppingData, setShoppingData] = useState<any>({});
  const [checkedItems, setCheckedItems] = useState<any[]>([]);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [isRequestingLink, setIsRequestingLink] = useState(false);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Refs for scrolling
  const recettesRef = useRef<HTMLDivElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  const astucesRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (resultBundle?.shoppingList?.organizedByCategory) {
      // Les données sont déjà groupées par category et triées par le service
      // Il suffit de les transformer pour l'interface interactive avec mapping vers noms d'affichage
      const transformedData: any = {};

      resultBundle.shoppingList.organizedByCategory.forEach((categoryGroup) => {
        // Utiliser le mapping pour obtenir le nom d'affichage joli
        const sectionName = getSectionDisplayNameWithContext(
          categoryGroup.section_code,
          categoryGroup.category
        );

        if (!transformedData[sectionName]) {
          transformedData[sectionName] = [];
        }

        categoryGroup.items.forEach((item, index) => {
          transformedData[sectionName].push({
            id: `${categoryGroup.section_code}-${categoryGroup.category}-${index}`,
            name: item.name_fr,
            quantity: `${Math.round(item.total_amount * 10) / 10} ${item.unit}`,
            checked: false,
            category: categoryGroup.category // Keep category info for reference
          });
        });
      });

      setShoppingData(transformedData);
    }
  }, [resultBundle]);

  // Scroll observer to update active section
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
    handleScroll(); // Call once to set initial state

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
      // Get the element position
      const elementTop = targetRef.current.offsetTop;
      // Account for fixed navbar at top (if any) and add some padding
      const offset = 20; // 20px padding from top

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

  // Modal management functions
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

  // Handle activation account click
  const handleActivateAccount = async () => {
    // Try to get email from sessionStorage
    const storedEmail = sessionStorage.getItem('quinoia_email');

    if (!storedEmail) {
      // No email available - redirect to login
      window.location.href = '/login';
      return;
    }

    // Email available - generate new magic link and show modal
    setIsRequestingLink(true);

    try {
      const response = await fetch('/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail })
      });

      if (response.ok) {
        // Show success modal
        setShowActivationModal(true);
      } else if (response.status === 429) {
        // Rate limit exceeded
        alert('Tu as atteint la limite de demandes. Réessaie dans 1 heure.');
      } else {
        // Generic error
        alert('Une erreur est survenue. Réessaie dans quelques instants.');
      }
    } catch (error) {
      console.error('Error requesting magic link:', error);
      alert('Une erreur est survenue. Réessaie dans quelques instants.');
    } finally {
      setIsRequestingLink(false);
    }
  };

  // Scroll to specific recipe in horizontal carousel
  const scrollToRecipe = (index: number) => {
    if (carouselRef.current) {
      const recipeWidth = carouselRef.current.scrollWidth / (resultBundle?.recipes.length || 1);
      const scrollPosition = recipeWidth * index;

      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });

      setCurrentRecipe(index);
    }
  };

  // Detect which recipe is currently visible
  const handleCarouselScroll = React.useCallback(() => {
    if (carouselRef.current && resultBundle?.recipes) {
      const container = carouselRef.current;
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      const scrollCenter = scrollLeft + containerWidth / 2;

      // Find which recipe is closest to center
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
  }, [currentRecipe, resultBundle?.recipes]);

  // Get AI tips from resultBundle or fallback to mock data
  const displayTips = resultBundle?.aiTips?.generalTips || [
    { id: "1", type: "organization", icon: "⚡", text: "Réalise en avance des découpes de légumes → 10 min de gagné" },
    { id: "2", type: "batch", icon: "🔥", text: "Préchauffage four pendant que tu prépares → temps optimisé" },
    { id: "3", type: "nutrition", icon: "💡", text: "Double les portions et congèle → repas rapide demain" },
    { id: "4", type: "planning", icon: "⏰", text: "Utilise la cuisson vapeur pour garder les nutriments" }
  ];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FFFDF8' }}>
        <div className="max-w-md w-full bg-white rounded-lg shadow-quinoia p-6 text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Menu non disponible</h1>
          <p style={{ color: '#8A8A8A' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!resultBundle) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFDF8' }}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2" style={{ borderColor: '#F4C95D' }}></div>
      </div>
    );
  }

  const { recipes, shoppingList, nutritionSummary, meta } = resultBundle;
  const { remaining, total } = getTotalItems();

  // Fallback image URL for recipes without pictures
  const fallbackImageUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZGlzaHxlbnwxfHx8fDE3NTY4Mjg0MjF8MA&ixlib=rb-4.1.0&q=80&w=1080`;

  // Transform recipes with proper image URLs
  const transformedRecipes: TransformedRecipe[] = recipes.map((recipe) => ({
    ...recipe,
    title: recipe.titleFr,
    // Use Supabase image if available, otherwise fallback to Unsplash
    image: recipe.imageUrl || fallbackImageUrl,
    meta: { icon: "⏱", text: `${recipe.prepTimeMinutes} min` }
  }));

  return (
    <>
      <Head>
        <title>Menu personnalisé Quinoïa</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Menu de recettes personnalisé généré par Quinoïa" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <style jsx global>{`
          html, body {
            overflow-x: hidden;
            max-width: 100%;
          }

          * {
            box-sizing: border-box;
          }

          /* Hide scrollbar for carousel */
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          @media (max-width: 1023px) {
            .lg\\:hidden {
              max-width: 100vw;
              overflow-x: hidden;
            }

            .lg\\:hidden * {
              max-width: 100%;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
          }
        `}</style>
      </Head>

      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#FFFDF8' }}>
        <Navbar />

        {/* Menu Info Banner */}
        {resultBundle && (
          <div className="w-full py-4 px-4" style={{ backgroundColor: '#FFFDF8' }}>
            <div className="max-w-2xl mx-auto lg:max-w-4xl">
              <div className="text-left space-y-2">
                <p className="font-medium leading-relaxed" style={{ color: '#414535', fontSize: '24px' }}>
                  <span>{resultBundle?.userProfile?.firstName || 'Laura'},</span> tu viens de déverrouiller ta semaine sans prise de tête.
                </p>
                <p className="text-[#8A8A8A] mt-1">
                <span className="font-semibold text-[#F4C95D]">{resultBundle.meta.numRecipes} recettes</span>
                <span className="font-semibold text-[#7D9476]"> équilibrées</span>
                , {Math.max(...resultBundle.recipes.map(r => r.prepTimeMinutes))} min max chacune
              </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Layout */}
        <div className="lg:hidden w-full">
          <div className="px-4 py-4 pb-48 space-y-4 w-full max-w-full">
            {/* Recettes Section */}
            <div ref={recettesRef} id="recettes" className="space-y-4 w-full pt-2">
              {/* Recipe Carousel - Horizontal Scroll */}
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
                  {transformedRecipes.map((recipe, index) => (
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activation Banner - Mobile: below carousel */}
            <div className="w-full -mx-4 px-4 py-4 bg-gradient-to-r from-[#F4C95D] to-[#F5D76A]">
              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <h3 className="text-[#414535] font-bold text-sm mb-1">
                    Crée ton compte pour débloquer ton espace perso :
                  </h3>
                  <p className="text-[#414535] text-xs">
                    🔄 changer tes recettes • 📜 sauvegarder ton menu • 🍽️ recevoir 3 nouvelles recettes gratuites chaque semaine
                  </p>
                </div>
                <button
                  onClick={handleActivateAccount}
                  disabled={isRequestingLink}
                  className="bg-[#414535] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#2f3226] transition-all disabled:opacity-50 text-sm"
                >
                  {isRequestingLink ? 'Envoi en cours...' : '✨ Créer mon compte gratuit'}
                </button>
              </div>
            </div>

            {/* Liste de courses Section - Hidden on mobile, will use drawer instead */}
            <div ref={listeRef} id="liste" className="hidden space-y-6 w-full pt-6">
              <div className="w-full">
                <div className="flex items-start justify-between w-full mb-2">
                  <div>
                    <h2 style={{ color: '#414535', fontSize: '20px' }}>🛒 Liste de courses complète</h2>
                    <p style={{ color: '#414535', fontSize: '16px', marginTop: '2px' }}>✓ Pour mes {recipes.length} recettes</p>
                  </div>
                  <Badge variant="secondary" style={{ backgroundColor: '#FFF6DC', color: '#414535' }}>
                    {remaining}/{total} restants
                  </Badge>
                </div>
                <p style={{ color: '#8A8A8A', fontSize: '14px' }}>
                  {meta.numServings} portions • Organisée par rayon
                </p>
              </div>

              {/* Accordions for each rayon */}
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
                        <span style={{ color: '#414535' }} className="truncate pr-2">
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
                            <span className="flex-1 text-sm leading-tight min-w-0" style={{ color: '#414535' }}>
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
                        <span style={{ color: '#8A8A8A' }} className="truncate pr-2">
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
                            <span className="flex-1 text-sm leading-tight line-through min-w-0" style={{ color: '#8A8A8A' }}>
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
              <h2 style={{ color: '#414535', fontSize: '20px' }}>Astuces personnalisées</h2>

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
                    <p className="text-sm flex-1 leading-relaxed" style={{ color: '#414535' }}>
                      {tip.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="w-full max-w-[1200px] mx-auto p-4 pb-40">
            {/* Desktop Grid Layout */}
            <div className="grid grid-cols-2 gap-12 mt-8">
              {/* Left Column */}
              <div className="space-y-12">
                {/* Recettes Section */}
                <div className="space-y-6 pt-4">
                  {/* Recipe Grid for Desktop */}
                  <div className="grid grid-cols-2 gap-4">
                    {transformedRecipes.map((recipe, index) => (
                      <div
                        key={recipe.id}
                        className="rounded-2xl overflow-hidden shadow-quinoia relative cursor-pointer aspect-[4/5]"
                        onClick={() => openRecipeModal(index)}
                      >
                        <ImageWithFallback
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Bottom Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                          <h3 className="text-white mb-2 font-medium text-sm leading-tight">
                            {recipe.title}
                          </h3>
                          <Badge 
                            className="text-foreground hover:bg-primary/90 text-xs"
                            style={{ backgroundColor: '#F4C95D', color: '#414535' }}
                          >
                            {recipe.meta.icon} {recipe.meta.text}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Astuces Section */}
                <div className="space-y-6 pt-8">
                  <h2 style={{ color: '#414535', fontSize: '20px' }}>Astuces personnalisées</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {displayTips.map((tip) => (
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
                        <p className="text-sm" style={{ color: '#414535' }}>{tip.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-12">
                {/* Liste de courses Section */}
                <div className="space-y-6 pt-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h2 style={{ color: '#414535', fontSize: '20px' }}>🛒 Liste de courses</h2>
                        <p style={{ color: '#414535', fontSize: '16px', marginTop: '2px' }}>✓ Pour mes {recipes.length} recettes</p>
                      </div>
                      <Badge variant="secondary" style={{ backgroundColor: '#FFF6DC', color: '#414535' }}>
                        {remaining}/{total} restants
                      </Badge>
                    </div>
                    <p style={{ color: '#8A8A8A', fontSize: '14px' }}>
                      {meta.numServings} portions • Organisé par rayon
                    </p>
                  </div>

                  {/* Accordions for each rayon */}
                  <Accordion type="multiple" className="space-y-2">
                    {Object.entries(shoppingData).map(([rayonName, items]: [string, any]) => (
                      <AccordionItem 
                        key={rayonName} 
                        value={rayonName}
                        className="border rounded-lg"
                        style={{ borderColor: '#EAEAEA' }}
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full">
                            <span style={{ color: '#414535' }}>{rayonName} ({items.length})</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-3">
                            {items.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-3">
                                <Checkbox
                                  checked={item.checked}
                                  onCheckedChange={() => toggleItem(rayonName, item.id)}
                                />
                                <span className="flex-1" style={{ color: '#414535' }}>
                                  {item.name} – {item.quantity}
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
                        className="border rounded-lg opacity-60"
                        style={{ borderColor: '#EAEAEA' }}
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full">
                            <span style={{ color: '#8A8A8A' }}>Articles cochés ({checkedItems.length})</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-3">
                            {checkedItems.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-3">
                                <Checkbox
                                  checked={true}
                                  onCheckedChange={() => toggleCheckedItem(item.id)}
                                />
                                <span className="flex-1 line-through" style={{ color: '#8A8A8A' }}>
                                  {item.name} – {item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Activation Banner - Desktop only (fixed bottom) */}
        <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#F4C95D] to-[#F5D76A] shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex flex-row items-center justify-between gap-4">
              {/* Text Content */}
              <div className="text-left flex-1">
                <h3 className="text-[#414535] font-bold text-lg mb-2">
                Crée ton compte pour débloquer ton espace perso :
                </h3>
                <p className="text-[#414535] text-base">
                  🔄 changer tes recettes • 📜 sauvegarder ton menu • 🍽️ recevoir 3 nouvelles recettes gratuites chaque semaine
                </p>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleActivateAccount}
                  disabled={isRequestingLink}
                  className="bg-[#414535] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-[#2f3226] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRequestingLink ? 'Envoi...' : 'Activer mon compte'}
                </button>
                <p className="text-[#414535] text-xs">
                  🔐 Pas de mot de passe, juste un lien magique par email
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shopping List Button - Mobile only (centered bottom) */}
        <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-40 max-w-6xl w-full px-4">
          <button
            onClick={() => setIsShoppingListOpen(true)}
            className="bg-[#F4C95D] text-white px-9 py-4 rounded-full shadow-lg hover:shadow-2xl hover:bg-[#E5B84A] transition-all hover:scale-110 hover:ring-4 hover:ring-[#F4C95D]/30 flex items-center gap-4 mx-auto"
            aria-label="Voir ma liste de courses"
          >
            <ClipboardList className="w-9 h-9" />
            <span className="text-lg font-semibold">Voir ma liste</span>
          </button>
        </div>

        {/* Shopping List Drawer - Mobile */}
        <ShoppingListDrawer
          isOpen={isShoppingListOpen}
          onClose={() => setIsShoppingListOpen(false)}
          shoppingList={shoppingData}
          isPremium={false}
          numServings={resultBundle?.meta.numServings || 2}
          recipeCount={resultBundle?.meta.numRecipes || 3}
          onUpgrade={handleActivateAccount}
        />

        {/* Recipe Modal */}
        {selectedRecipeIndex !== null && (
          <RecipeModal
            recipes={transformedRecipes}
            initialRecipeIndex={selectedRecipeIndex}
            isOpen={selectedRecipeIndex !== null}
            onClose={closeRecipeModal}
            onRecipeChange={handleRecipeChange}
            numServings={resultBundle.meta.numServings}
            recipeTips={resultBundle?.aiTips?.recipeTips}
          />
        )}

        {/* Activation Modal */}
        {showActivationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4">✉️</div>
                <h2 className="text-2xl font-bold text-[#414535] mb-3">
                  Vérifie ta boîte mail
                </h2>
                <p className="text-[#666666] text-base leading-relaxed">
                  On t'a envoyé ton lien magique pour accéder à ton espace Quinoïa.
                  Tu y trouveras tes menus gratuits de la semaine, et plus encore 💎
                </p>
                <p className="text-[#8A8A8A] text-sm mt-3">
                  (Pense à vérifier tes spams, au cas où !)
                </p>
              </div>

              <button
                onClick={() => setShowActivationModal(false)}
                className="w-full bg-[#F4C95D] text-[#414535] px-6 py-3 rounded-full font-semibold text-base hover:bg-[#E5B84A] transition-all shadow-md"
              >
                OK, j'y vais !
              </button>
            </div>
          </div>
        )}
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
        error: 'ID de menu invalide'
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
        }
      };
    }

    logger.info('Menu accessed successfully', { 
      shareId, 
      menuId: menuResult.id,
      recipeCount: menuResult.numRecipes
    });

    // Get recipe image URLs from Supabase Storage
    const recipeImageUrls = new Map<string, string | null>();
    if (menuResult.resultBundle?.recipes) {
      const pictureFiles = (menuResult.resultBundle.recipes as any[])
        .map((recipe: any) => recipe.picture_file as string | undefined)
        .filter((file): file is string => Boolean(file));
      
      if (pictureFiles.length > 0) {
        try {
          const urlMap = await getRecipeImageUrls(pictureFiles);
          urlMap.forEach((url, filename) => {
            recipeImageUrls.set(filename, url);
          });
          
          logger.info('Recipe images loaded', { 
            shareId, 
            imageCount: recipeImageUrls.size 
          });
        } catch (imageError) {
          logger.warn('Failed to load recipe images', { 
            shareId, 
            error: imageError 
          });
        }
      }
    }

    // Add image URLs to result bundle
    const resultBundleWithImages = {
      ...menuResult.resultBundle,
      recipes: (menuResult.resultBundle?.recipes as any[])?.map((recipe: any) => ({
        ...recipe,
        imageUrl: recipe.picture_file ? recipeImageUrls.get(recipe.picture_file) : null
      })) || []
    };

    return {
      props: {
        shareId,
        resultBundle: resultBundleWithImages,
      }
    };

  } catch (error) {
    logger.error('Menu fetch failed', { shareId, error });
    
    return {
      props: {
        shareId,
        error: 'Erreur lors du chargement du menu',
      }
    };
  }
};