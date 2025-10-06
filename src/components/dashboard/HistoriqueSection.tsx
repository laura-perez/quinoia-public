/**
 * Historique Section - Past menus with freemium lock
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface HistoriqueItem {
  id: string;
  weekNumber: number;
  year: number;
  firstRecipeImage?: string;
  firstRecipeTitle: string;
  recipeCount: number;
  createdAt: string;
}

interface HistoriqueSectionProps {
  isPremium: boolean;
  historique: HistoriqueItem[];
  onReloadWeek?: (menuId: string) => void;
  onUpgrade: () => void;
}

const fallbackImageUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZGlzaHxlbnwxfHx8fDE3NTY4Mjg0MjF8MA&ixlib=rb-4.1.0&q=80&w=1080`;

export function HistoriqueSection({
  isPremium,
  historique,
  onReloadWeek,
  onUpgrade,
}: HistoriqueSectionProps) {
  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#414535]">Ton historique 🕰️</h2>
        <p className="text-[#8A8A8A] mt-1">
          {isPremium
            ? 'Retrouve et recharge tes menus passés'
            : 'Historique disponible avec Premium 💎'}
        </p>
      </div>

      {/* Grid of weeks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {historique.map((item) => (
          <div
            key={item.id}
            className="relative rounded-xl overflow-hidden shadow-lg aspect-square group cursor-pointer"
          >
            <ImageWithFallback
              src={item.firstRecipeImage || fallbackImageUrl}
              alt={item.firstRecipeTitle}
              className="w-full h-full object-cover"
            />

            {/* Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white text-sm font-medium">
                Semaine {item.weekNumber}, {item.year}
              </p>
              <p className="text-white/80 text-xs">{item.recipeCount} recettes</p>
            </div>

            {/* Lock Overlay for Free Users */}
            {!isPremium && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Lock className="w-8 h-8 text-white mb-2" />
                <p className="text-white text-sm text-center font-medium mb-3">
                  Premium — accès complet
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpgrade();
                  }}
                  className="bg-[#F4C95D] text-[#414535] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#E5B84A] transition-all"
                >
                  Débloquer avec Premium 💎
                </button>
              </div>
            )}

            {/* Premium: Reload Button */}
            {isPremium && onReloadWeek && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Veux-tu recharger cette semaine pour ton menu actuel ?')) {
                    onReloadWeek(item.id);
                  }
                }}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#414535] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white transition-all opacity-0 group-hover:opacity-100"
              >
                Recharger cette semaine
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {historique.length === 0 && (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">📚</p>
          <p className="text-[#8A8A8A]">Aucun menu dans l'historique</p>
          <p className="text-sm text-[#8A8A8A] mt-2">
            Tes menus passés apparaîtront ici
          </p>
        </div>
      )}
    </div>
  );
}
