/**
 * Menu Sharing Page - /menu/{shareId}
 * Public page displaying personalized recipes and shopping lists
 * IMPORTANT: Must send X-Robots-Tag: noindex and be PII-free per specs
 */

import React, { useState, useRef } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { Lightbulb, CheckSquare, List } from 'lucide-react';
import { getServiceClient } from '@/lib/supabase/client';
import { getRecipeImageUrls } from '@/lib/supabase/storage';
import { createLogger } from '@/lib/logger';
import { SECTION_DISPLAY_ORDER, getSectionDisplayNameWithContext } from '@/lib/constants';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/ui/Navbar';

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

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const refs = {
      recettes: recettesRef,
      liste: listeRef,
      astuces: astucesRef
    };
    refs[section as keyof typeof refs]?.current?.scrollIntoView({ behavior: 'smooth' });
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

  // Mock data for sections not available in current resultBundle
  const mockTips = [
    { id: 1, icon: "⚡", text: "Réalise en avance des découpes de légumes → 10 min de gagné" },
    { id: 2, icon: "🔥", text: "Préchauffage four pendant que tu prépares → temps optimisé" },
    { id: 3, icon: "💡", text: "Double les portions et congèle → repas rapide demain" },
    { id: 4, icon: "⏰", text: "Utilise la cuisson vapeur pour garder les nutriments" }
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

        {/* Mobile Layout */}
        <div className="lg:hidden w-full">
          <div className="px-4 py-4 pb-24 space-y-4 w-full max-w-full">
            {/* Recettes Section */}
            <div ref={recettesRef} id="recettes" className="space-y-4 w-full">
              <h2 style={{ color: '#414535', fontSize: '20px' }}>Recettes</h2>

              {/* Recipe Carousel */}
              <div className="relative w-full">
                <div
                  className="rounded-2xl overflow-hidden shadow-quinoia relative w-full mx-auto max-w-sm"
                  style={{ height: '72vh', aspectRatio: '4/5' }}
                >
                  <ImageWithFallback
                    src={transformedRecipes[currentRecipe].image}
                    alt={transformedRecipes[currentRecipe].title}
                    className="w-full h-full object-cover"
                  />

                  {/* Bottom Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h3 className="text-white mb-3 font-medium leading-tight text-sm">
                      {transformedRecipes[currentRecipe].title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge
                        className="text-foreground hover:bg-primary/90 text-xs px-2 py-1"
                        style={{ backgroundColor: '#F4C95D', color: '#414535' }}
                      >
                        {transformedRecipes[currentRecipe].meta.icon} {transformedRecipes[currentRecipe].meta.text}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Pagination Dots */}
                <div className="flex justify-center gap-2 mt-4 w-full">
                  {transformedRecipes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentRecipe(index)}
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{ 
                        backgroundColor: index === currentRecipe ? '#F4C95D' : '#EAEAEA' 
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Liste de courses Section */}
            <div ref={listeRef} id="liste" className="space-y-4 w-full">
              <h2 style={{ color: '#414535', fontSize: '20px' }}>Liste de courses</h2>

              {/* Progress */}
              <div className="flex items-center gap-2 w-full">
                <Badge variant="secondary" style={{ backgroundColor: '#FFF6DC', color: '#414535' }}>
                  {remaining}/{total} restants
                </Badge>
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
                          Checked items ({checkedItems.length})
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
            <div ref={astucesRef} id="astuces" className="space-y-4 w-full">
              <h2 style={{ color: '#414535', fontSize: '20px' }}>Astuces personnalisées</h2>

              <div className="space-y-3 w-full">
                {mockTips.map((tip) => (
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

              <p className="caption text-center w-full" style={{ color: '#8A8A8A', fontSize: '12px' }}>
                Astuces générées automatiquement par IA.
              </p>
            </div>
          </div>

          {/* Sticky Bottom Navigation */}
          <div
            className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 w-full"
            style={{ backgroundColor: '#FFFDF8', borderColor: '#EAEAEA' }}
          >
            <div className="flex justify-around w-full max-w-md mx-auto">
              {[
                { key: 'recettes', label: 'Recettes', icon: CheckSquare },
                { key: 'liste', label: 'Liste', icon: List },
                { key: 'astuces', label: 'Astuces', icon: Lightbulb }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => scrollToSection(key)}
                  className="flex flex-col items-center gap-1 py-2 px-3 min-h-[44px] justify-center flex-1"
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: activeSection === key ? '#F4C95D' : '#8A8A8A'
                    }}
                  />
                  <span
                    className="text-xs truncate"
                    style={{
                      color: activeSection === key ? '#F4C95D' : '#8A8A8A',
                      fontSize: '12px'
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="w-full max-w-[1200px] mx-auto p-4 pb-8">
            {/* Desktop Grid Layout */}
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Recettes Section */}
                <div ref={recettesRef} id="recettes" className="space-y-4">
                  {/* Recipe Grid for Desktop */}
                  <div className="grid grid-cols-2 gap-4">
                    {transformedRecipes.map((recipe, index) => (
                      <div 
                        key={recipe.id}
                        className="rounded-2xl overflow-hidden shadow-quinoia relative cursor-pointer aspect-[4/5]"
                        onClick={() => setCurrentRecipe(index)}
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
                <div ref={astucesRef} id="astuces" className="space-y-4">
                  <h2 style={{ color: '#414535', fontSize: '20px' }}>Astuces personnalisées</h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {mockTips.map((tip) => (
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
                  
                  <p className="caption text-center" style={{ color: '#8A8A8A', fontSize: '12px' }}>
                    Astuces générées automatiquement par IA.
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Liste de courses Section */}
                <div ref={listeRef} id="liste" className="space-y-4">
                  <h2 style={{ color: '#414535', fontSize: '20px' }}>Liste de courses</h2>
                  
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" style={{ backgroundColor: '#FFF6DC', color: '#414535' }}>
                      {remaining}/{total} restants
                    </Badge>
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
                            <span style={{ color: '#8A8A8A' }}>Checked items ({checkedItems.length})</span>
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

            {/* Desktop Navigation */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
              <div 
                className="flex gap-2 bg-white rounded-full px-4 py-2 shadow-quinoia"
                style={{ backgroundColor: '#FFFDF8', borderColor: '#EAEAEA' }}
              >
                {[
                  { key: 'recettes', label: 'Recettes', icon: CheckSquare },
                  { key: 'liste', label: 'Liste', icon: List },
                  { key: 'astuces', label: 'Astuces', icon: Lightbulb }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => scrollToSection(key)}
                    className="flex items-center gap-2 py-2 px-4 rounded-full min-h-[44px] transition-colors"
                    style={{
                      backgroundColor: activeSection === key ? '#F4C95D' : 'transparent',
                      color: activeSection === key ? '#414535' : '#8A8A8A'
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
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