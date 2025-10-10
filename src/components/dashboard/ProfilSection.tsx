/**
 * Profil Section - Preferences, Notifications, Subscription, Account
 */

import React, { useState } from 'react';
import { USER_STATUS } from '@/lib/supabase/types/user.types';
import { Settings, Bell, CreditCard, User } from 'lucide-react';

interface ProfilSectionProps {
  user: {
    email: string;
    firstName?: string | null;
    status: string;
  };
  onSavePreferences?: (prefs: any) => void;
  onManageSubscription?: () => void;
  onUpgrade?: () => void;
  onDeleteAccount?: () => void;
}

export function ProfilSection({
  user,
  onSavePreferences,
  onManageSubscription,
  onUpgrade,
  onDeleteAccount,
}: ProfilSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState('preferences');

  const isPremium = user.status === USER_STATUS.PAID_ACTIVE;

  const subTabs = [
    { id: 'preferences', label: 'Préférences', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'abonnement', label: 'Abonnement', icon: CreditCard },
    { id: 'compte', label: 'Compte', icon: User },
  ];

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <p className="text-[#8A8A8A] mt-1">{user.firstName || 'toi'} - {user.email}</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide border-b border-[#EAEAEA]">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap transition-all ${
              activeSubTab === id
                ? 'border-b-2 border-[#F4C95D] text-[#414535]'
                : 'text-[#8A8A8A] hover:text-[#414535]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Content based on active sub-tab */}
      <div className="max-w-2xl">
        {activeSubTab === 'preferences' && (
          <div className="space-y-4">
            <p className="text-sm text-[#8A8A8A]">
              Modifie tes préférences alimentaires (régime, goûts, équipements, exclusions)
            </p>
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
              <p className="text-[#8A8A8A] text-center py-8">
                [À implémenter : Formulaire de préférences - réutiliser les composants de l'onboarding]
              </p>
            </div>
          </div>
        )}

        {activeSubTab === 'notifications' && (
          <div className="space-y-4">
            <p className="text-sm text-[#8A8A8A]">
              Gère tes notifications email et web push
            </p>
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-[#414535]">Email hebdomadaire</span>
                <input type="checkbox" className="w-5 h-5" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-[#414535]">Notifications push (PWA)</span>
                <input type="checkbox" className="w-5 h-5" disabled />
              </label>
            </div>
          </div>
        )}

        {activeSubTab === 'abonnement' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
              {isPremium ? (
                <>
                  <h3 className="font-semibold text-[#414535] mb-2">
                    Premium mensuel — 9,90€/mois
                  </h3>
                  <p className="text-sm text-[#8A8A8A] mb-4">
                    Tu peux te désabonner à tout moment — sans blabla.
                  </p>
                  <button
                    onClick={onManageSubscription}
                    className="bg-[#414535] text-white px-4 py-2 rounded-lg hover:bg-[#2f3226] transition-all"
                  >
                    Gérer / Annuler
                  </button>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-[#414535] mb-2">Gratuit</h3>
                  <p className="text-sm text-[#8A8A8A] mb-4">
                    Passe Premium pour des menus illimités, l'historique complet, et plus encore.
                  </p>
                  <button
                    onClick={onUpgrade}
                    className="bg-[#F4C95D] text-[#414535] px-6 py-3 rounded-lg hover:bg-[#E5B84A] transition-all font-medium"
                  >
                    Passer Premium 💎
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'compte' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#414535] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 border border-[#EAEAEA] rounded-lg bg-[#FAFAFA] text-[#8A8A8A]"
                />
              </div>

              <div className="pt-4 border-t border-[#EAEAEA]">
                <button
                  onClick={onDeleteAccount}
                  className="text-red-600 text-sm hover:underline"
                >
                  Supprimer mon compte
                </button>
              </div>

              <div className="pt-4 border-t border-[#EAEAEA] text-sm text-[#8A8A8A] space-y-1">
                <a href="/cgu" className="block hover:text-[#414535]">
                  Conditions générales
                </a>
                <a href="/privacy" className="block hover:text-[#414535]">
                  Politique de confidentialité
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

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
