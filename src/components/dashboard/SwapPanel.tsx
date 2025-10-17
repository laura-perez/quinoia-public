/**
 * SwapPanel - Volet coulissant pour sélectionner une recette du swap pool (Gratuit only)
 */

import React from 'react';
import { X } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Badge } from '@/components/ui/badge';
import type { Recipe } from '@/lib/recipes/types';

interface SwapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  availableRecipes: Recipe[];
  targetRecipe: Recipe | null;
  onSwapConfirm: (chosenRecipe: Recipe) => void;
  hasSwappedThisWeek: boolean;
  numServings: number;
  quotaExceeded: boolean;
}

const fallbackImageUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZGlzaHxlbnwxfHx8fDE3NTY4Mjg0MjF8MA&ixlib=rb-4.1.0&q=80&w=1080`;

export function SwapPanel({
  isOpen,
  onClose,
  availableRecipes,
  targetRecipe,
  onSwapConfirm,
  hasSwappedThisWeek,
  numServings,
  quotaExceeded,
}: SwapPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-[#FDFBF8] z-50 shadow-2xl overflow-y-auto animate-slide-in">
        {/* Full Panel Overlay (when quota exceeded) */}
        {quotaExceeded && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 animate-pulse-subtle" />
        )}

        {/* Header */}
        <div className="sticky top-0 bg-[#FDFBF8] border-b border-gray-200 p-6 flex justify-between items-center z-20">
          <div>
            <h2 className="text-2xl font-bold text-[#414535]">
              Remplacer {targetRecipe?.titleFr || 'cette recette'}
            </h2>
            <p className="text-sm text-[#8A8A8A] mt-1">
              Choisis une recette parmi les {availableRecipes.length} disponibles
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#414535] hover:bg-gray-100 p-2 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Warning / Quota Exceeded Card */}
        {quotaExceeded ? (
          <div className="mx-6 mt-6 p-6 bg-white border-2 border-[#F4C95D]/30 rounded-xl shadow-lg relative z-30">
            <p className="text-lg font-semibold text-[#414535] mb-2">
              💛 Tu as déjà utilisé ton swap cette semaine.
            </p>
            <p className="text-sm text-[#8A8A8A] mb-4">
              Passe en Premium pour changer tes recettes à volonté — sans perdre ton menu.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.href = '/checkout/monthly'}
                className="w-full bg-[#F4C95D] text-[#414535] py-3 rounded-lg font-semibold hover:bg-[#E5B84A] transition"
              >
                Découvrir le confort Premium
              </button>
              <button
                onClick={onClose}
                className="w-full text-[#8A8A8A] text-sm hover:text-[#414535] transition"
              >
                Je garde mon menu comme ça 🌿
              </button>
            </div>
          </div>
        ) : (
          !hasSwappedThisWeek && (
            <div className="mx-6 mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg relative z-20">
              <p className="text-sm text-orange-800">
                ⚠️ <strong>Attention :</strong> Ce swap consommera ton unique swap gratuit de la semaine.
              </p>
            </div>
          )
        )}

        {/* Recipe Cards */}
        <div className="p-6 space-y-4 relative z-20">

          {availableRecipes.length === 0 ? (
            <p className="text-center text-[#8A8A8A] py-8">
              Aucune recette disponible pour le swap.
            </p>
          ) : (
            availableRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`bg-white rounded-xl border-2 border-gray-200 overflow-hidden transition-all ${
                  quotaExceeded
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:border-[#F4C95D] cursor-pointer'
                }`}
                onClick={() => !quotaExceeded && onSwapConfirm(recipe)}
              >
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden relative">
                    <ImageWithFallback
                      src={recipe.imageUrl || fallbackImageUrl}
                      alt={recipe.titleFr}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute bottom-2 right-2 bg-[#F4C95D] text-[#414535] text-xs">
                      ⏱ {recipe.prepTimeMinutes} min
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-[#414535] text-lg line-clamp-2">
                        {recipe.titleFr}
                      </h3>
                      <p className="text-sm text-[#8A8A8A] mt-1">
                        {numServings} portions
                      </p>
                    </div>

                    {!quotaExceeded && (
                      <button className="self-end mt-2 bg-[#F4C95D] text-[#414535] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#E5B84A] transition">
                        Choisir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#FDFBF8] border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full bg-white border border-[#414535] text-[#414535] py-3 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Annuler
          </button>
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
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
