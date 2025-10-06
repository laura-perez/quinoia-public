/**
 * Upsell Modals - Premium upgrade prompts
 */

import React from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/router';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'swap' | 'history' | 'shopping';
}

export function UpsellModal({ isOpen, onClose, type }: UpsellModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const content = {
    swap: {
      title: 'Swaps illimités 🔄',
      description: 'Les swaps illimités sont réservés aux membres Premium 💎 — découvre l\'expérience complète.',
      features: [
        'Remplace autant de recettes que tu veux',
        'Ajuste ton menu selon tes envies du jour',
        'Zéro limite, zéro stress',
      ],
    },
    history: {
      title: 'Accès à l\'historique 📚',
      description: 'Retrouve et recharge tous tes menus passés avec Premium.',
      features: [
        'Accès complet à tous tes menus',
        'Recharge une semaine en 1 clic',
        'Ne perds jamais une recette qui t\'a plu',
      ],
    },
    shopping: {
      title: 'Liste de courses Premium 🛒',
      description: 'Profite d\'une liste interactive et partageable.',
      features: [
        'Cases à cocher pour suivre tes achats',
        'Copie et partage ta liste facilement',
        'Synchronisation sur tous tes appareils',
      ],
    },
  };

  const { title, description, features } = content[type];

  const handleUpgrade = () => {
    router.push('/checkout/monthly');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#FAFAFA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-[#414535] mb-2">{title}</h3>
            <p className="text-[#8A8A8A]">{description}</p>
          </div>

          <div className="bg-[#FFFDF8] rounded-xl p-4 mb-6">
            <p className="font-semibold text-[#414535] mb-3">Avec Premium :</p>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-[#414535]">
                  <span className="text-[#F4C95D] mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className="w-full bg-[#F4C95D] text-[#414535] py-3 rounded-lg font-semibold hover:bg-[#E5B84A] transition-all"
            >
              Découvrir Premium à 9,90€ 💎
            </button>
            <button
              onClick={onClose}
              className="w-full text-[#8A8A8A] py-2 text-sm hover:text-[#414535] transition-colors"
            >
              Peut-être plus tard
            </button>
          </div>

          <p className="text-xs text-center text-[#8A8A8A] mt-4">
            Sans engagement • Annulation facile
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
