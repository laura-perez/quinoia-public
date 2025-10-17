/**
 * Shopping List Drawer
 * Mobile: Overlay drawer
 * Desktop: Right pane
 */

import React, { useState, useEffect } from 'react';
import { X, Copy, Share2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { getSectionDisplayNameWithContext } from '@/lib/constants';

interface ShoppingListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingList: any;
  isPremium: boolean;
  numServings: number;
  recipeCount: number;
  onUpgrade: () => void;
}

export function ShoppingListDrawer({
  isOpen,
  onClose,
  shoppingList,
  isPremium,
  numServings,
  recipeCount,
  onUpgrade,
}: ShoppingListDrawerProps) {
  const [shoppingData, setShoppingData] = useState<any>({});
  const [checkedItems, setCheckedItems] = useState<any[]>([]);

  // Initialize shopping data
  useEffect(() => {
    if (shoppingList?.organizedByCategory) {
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
            category: categoryGroup.category,
          });
        });
      });

      setShoppingData(transformedData);
    }
  }, [shoppingList]);

  const toggleItem = (rayonName: string, itemId: string) => {
    if (!isPremium) return; // No checkboxes for free users

    setShoppingData((prev: any) => {
      const newData = { ...prev };
      const rayon = newData[rayonName];
      const itemIndex = rayon.findIndex((item: any) => item.id === itemId);

      if (itemIndex !== -1) {
        const item = { ...rayon[itemIndex] };
        item.checked = !item.checked;

        if (item.checked) {
          setCheckedItems((prevChecked) => [...prevChecked, { ...item, rayon: rayonName }]);
          rayon.splice(itemIndex, 1);
        } else {
          rayon[itemIndex] = item;
        }
      }

      return newData;
    });
  };

  const toggleCheckedItem = (itemId: string) => {
    setCheckedItems((prev) => {
      const itemIndex = prev.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) {
        const item = prev[itemIndex];
        setShoppingData((prevData: any) => {
          const newData = { ...prevData };
          const rayon = newData[item.rayon];
          rayon.push({ ...item, checked: false });
          return newData;
        });
        return prev.filter((item) => item.id !== itemId);
      }
      return prev;
    });
  };

  const getTotalItems = () => {
    const uncheckedCount = Object.values(shoppingData).reduce(
      (total: number, rayon: any) => total + rayon.length,
      0
    );
    const checkedCount = checkedItems.length;
    return { remaining: uncheckedCount, total: uncheckedCount + checkedCount };
  };

  const { remaining, total } = getTotalItems();

  const handleCopy = () => {
    if (!isPremium) {
      onUpgrade();
      return;
    }
    // Copy to clipboard
    const text = Object.entries(shoppingData)
      .map(([rayon, items]: [string, any]) => {
        const itemList = items.map((item: any) => `- ${item.name}: ${item.quantity}`).join('\n');
        return `${rayon}\n${itemList}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(text);
    alert('Liste copiée !');
  };

  const handleShare = () => {
    if (!isPremium) {
      onUpgrade();
      return;
    }
    // Share (future PWA)
    alert('Partage disponible bientôt !');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#EAEAEA] p-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-[#414535]">
              🛒 Liste de courses complète
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#FAFAFA] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-[#8A8A8A]">
            ✓ Pour mes {recipeCount} recettes • {numServings} portions
          </p>
          <div className="flex items-center justify-between mt-3">
            <Badge variant="secondary" className="bg-[#FFF6DC] text-[#414535]">
              {remaining}/{total} restants
            </Badge>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!isPremium}
                className={`p-2 rounded-lg transition-all ${
                  isPremium
                    ? 'hover:bg-[#FAFAFA] text-[#414535]'
                    : 'text-[#BDBDBD] cursor-not-allowed'
                }`}
                title={!isPremium ? 'Premium uniquement' : 'Copier'}
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handleShare}
                disabled={!isPremium}
                className={`p-2 rounded-lg transition-all ${
                  isPremium
                    ? 'hover:bg-[#FAFAFA] text-[#414535]'
                    : 'text-[#BDBDBD] cursor-not-allowed'
                }`}
                title={!isPremium ? 'Premium uniquement' : 'Partager'}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-140px)] p-4">
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
                    <span className="text-[#414535] truncate pr-2">
                      {rayonName} ({items.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {isPremium ? (
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => toggleItem(rayonName, item.id)}
                            className="flex-shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 flex-shrink-0" /> // Placeholder
                        )}
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

            {/* Checked Items (Premium only) */}
            {isPremium && checkedItems.length > 0 && (
              <AccordionItem
                value="checked-items"
                className="border rounded-lg opacity-60"
                style={{ borderColor: '#EAEAEA' }}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[#8A8A8A] truncate pr-2">
                      Articles cochés ({checkedItems.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {checkedItems.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3">
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

          {/* Free User Notice */}
          {!isPremium && (
            <div className="mt-6 p-4 bg-[#FFF6DC] rounded-lg">
              <p className="text-sm text-[#414535] mb-2">
                💎 <strong>Avec Premium :</strong>
              </p>
              <ul className="text-sm text-[#8A8A8A] space-y-1 ml-4">
                <li>✓ Cases à cocher interactives</li>
                <li>✓ Copier/partager la liste</li>
                <li>✓ Synchronisation sur tous tes appareils</li>
              </ul>
              <button
                onClick={onUpgrade}
                className="mt-3 w-full bg-[#F4C95D] text-[#414535] py-2 rounded-lg font-medium hover:bg-[#E5B84A] transition-all"
              >
                Découvrir Premium
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
