/**
 * Premium Upgrade Modal - Soft upsell for premium features
 */

import React from 'react';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PremiumUpgradeModal({ isOpen, onClose }: PremiumUpgradeModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/checkout/monthly');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8A8A8A] hover:text-[#414535] transition-colors z-10"
          aria-label="Fermer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Illustration */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F4C95D]/20 to-[#E5B84A]/20 flex items-center justify-center">
              <span className="text-5xl">🌿</span>
            </div>
          </div>

          {/* Titre principal */}
          <h2 className="text-2xl font-bold text-[#414535] text-center mb-3">
            Profite de toute la liberté Quinoïa
          </h2>

          {/* Sous-texte */}
          <p className="text-[#8A8A8A] text-center mb-4">
            Tu as découvert une fonctionnalité réservée aux membres Premium.
          </p>

          <p className="text-[#414535] text-sm mb-4 leading-relaxed">
            Avec l'accès complet, tu débloques :
          </p>

          {/* Liste des avantages */}
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3 text-[#414535]">
              <span className="text-xl flex-shrink-0">🍽️</span>
              <span className="text-sm">Recettes illimitées</span>
            </li>
            <li className="flex items-start gap-3 text-[#414535]">
              <span className="text-xl flex-shrink-0">🔄</span>
              <span className="text-sm">Swaps illimités</span>
            </li>
            <li className="flex items-start gap-3 text-[#414535]">
              <span className="text-xl flex-shrink-0">📄</span>
              <span className="text-sm">Liste de courses intéractive</span>
            </li>
            <li className="flex items-start gap-3 text-[#414535]">
              <span className="text-xl flex-shrink-0">📚</span>
              <span className="text-sm">Accès à tous tes anciens menus</span>
            </li>
            <li className="flex items-start gap-3 text-[#414535]">
              <span className="text-xl flex-shrink-0">🌿</span>
              <span className="text-sm">Sérénité totale chaque semaine</span>
            </li>
          </ul>

          {/* CTA principal */}
          <button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-[#F4C95D] to-[#E5B84A] text-[#414535] py-4 rounded-xl font-bold text-base hover:shadow-lg transition-all hover:scale-[1.02] mb-3"
          >
            Passer en Premium (9,90 €/mois)
          </button>

          {/* CTA secondaire */}
          <button
            onClick={onClose}
            className="w-full text-[#8A8A8A] text-sm py-2 hover:text-[#414535] transition-colors"
          >
            Plus tard
          </button>

          {/* Micro-texte éthique */}
          <p className="text-xs text-[#8A8A8A] text-center mt-6 leading-relaxed">
            Ton abonnement soutient le projet Quinoïa et aide à faire grandir une alternative simple à la charge mentale alimentaire.
          </p>
        </div>
      </div>
    </div>
  );
}
