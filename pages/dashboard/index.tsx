/**
 * Dashboard Page - Refactored with 3-section layout
 * Sections: Menu, Historique, Profil
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Navbar, DashboardNavbar } from '@/components/ui';
import { USER_STATUS } from '@/lib/supabase/types/user.types';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MenuSection } from '@/components/dashboard/MenuSection';
import { HistoriqueSection } from '@/components/dashboard/HistoriqueSection';
import { ProfilSection } from '@/components/dashboard/ProfilSection';
import { ShoppingListDrawer } from '@/components/dashboard/ShoppingListDrawer';
import { UpsellModal } from '@/components/dashboard/UpsellModals';
import { generateShoppingList } from '@/utils/shoppingList/generator';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import type {
  DashboardStatusResponse,
  DashboardMenu,
  QuotaStatus,
  DashboardUser,
} from '@/types/dashboard';
import type { CanonicalIngredientInfo } from '@/lib/supabase/repositories/ingredients';
import type { FormData } from '@/components/form/types';
import { cookingLevelMap } from '@/schemas/mappers';

function DashboardContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardStatusResponse | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingMenu, setIsGeneratingMenu] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');
  const [currentActiveRecipes, setCurrentActiveRecipes] = useState<any[] | null>(null);

  // Drawer & Modal States
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [upsellModal, setUpsellModal] = useState<{
    isOpen: boolean;
    type: 'swap' | 'history' | 'shopping';
  }>({ isOpen: false, type: 'swap' });

  // Load dashboard data on mount (includes submission)
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Check for first login welcome
  useEffect(() => {
    if (router.query.welcome === 'true' && dashboardData?.user) {
      setShowWelcome(true);
      const timer = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [router.query.welcome, dashboardData]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/status');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        throw new Error(data.message || 'Erreur lors du chargement');
      }

      const data = await response.json();
      setDashboardData(data);
      // Extract submission from response (already included)
      setSubmission(data.submission);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMenu = async () => {
    setIsGeneratingMenu(true);
    setError('');

    try {
      const response = await fetch('/api/dashboard/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();

        // Handle onboarding required
        if (response.status === 403 && data.requiresOnboarding) {
          router.push(data.redirectUrl || '/onboarding');
          return;
        }

        // Handle quota exceeded
        if (response.status === 403) {
          setError(data.message || 'Quota dépassé');
          return;
        }

        throw new Error(data.message || 'Erreur lors de la génération');
      }

      const data = await response.json();

      // Update dashboard data with new menu
      setDashboardData((prev) =>
        prev
          ? {
              ...prev,
              currentMenu: data.menu,
              ingredientsCatalog: data.ingredientsCatalog,
              quotas: data.quotas,
            }
          : null
      );
    } catch (err) {
      console.error('Error generating menu:', err);
      setError(err instanceof Error ? err.message : 'Erreur de génération');
    } finally {
      setIsGeneratingMenu(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/');
    }
  };

  const handleUpgrade = () => {
    const email = encodeURIComponent(user?.email || '');
    router.push(`/checkout/monthly?email=${email}`);
  };

  const handleSwapQuotaExceeded = () => {
    setUpsellModal({ isOpen: true, type: 'swap' });
  };

  const handleSavePreferences = async (formData: FormData) => {
    try {
      const submissionData = {
        firstName: user?.firstName || '',
        diet: formData.dietType || 'Omnivore',
        proteinPreferences: formData.proteinPreferences || [],
        equipmentAvailable: formData.equipmentAvailable || [],
        cookingLevel: cookingLevelMap[formData.cookingLevel as keyof typeof cookingLevelMap] || 'beginner',
        numRecipes: parseInt(formData.numRecipes as string) || 3,
        numServings: parseInt(formData.numServings as string) || 2,
        dislikedFoods: formData.dislikedFoods || '',
      };

      const response = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      // Reload dashboard data (includes updated submission)
      await loadDashboardData();

      // Show success toast
      showToast('Tes préférences ont été mises à jour.', 'success');
    } catch (err) {
      console.error('Error saving preferences:', err);
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  // Calculate shopping list (uses currentActiveRecipes if available, otherwise fallback to dashboardData)
  const shoppingList = useMemo(() => {
    if (!dashboardData?.currentMenu || !dashboardData?.ingredientsCatalog) return null;

    const recipesToUse = currentActiveRecipes || dashboardData.currentMenu.activeRecipes;

    return generateShoppingList({
      recipes: recipesToUse,
      numServings: dashboardData.currentMenu.numServings,
      ingredientsCatalog: dashboardData.ingredientsCatalog,
    });
  }, [currentActiveRecipes, dashboardData?.currentMenu, dashboardData?.ingredientsCatalog]);

  // Loading state
  if (isLoading) {
    return (
      <>
        <Head>
          <title>Dashboard - Quinoïa</title>
        </Head>
        <Navbar />
        <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#F4C95D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8A8A8A]">Chargement de ton espace...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <>
        <Head>
          <title>Erreur - Quinoïa</title>
        </Head>
        <Navbar />
        <div className="min-h-screen bg-[#FFFDF8] py-12">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8">
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { user, quotas, currentMenu, ingredientsCatalog } = dashboardData || {};
  const isPremium = user?.status === USER_STATUS.PAID_ACTIVE;

  // Mock historique data (will be fetched from API later)
  const historique = [
    {
      id: '1',
      weekNumber: 40,
      year: 2025,
      firstRecipeTitle: 'Pâtes au pesto',
      recipeCount: 5,
      createdAt: '2025-10-01',
    },
    {
      id: '2',
      weekNumber: 39,
      year: 2025,
      firstRecipeTitle: 'Poulet rôti',
      recipeCount: 7,
      createdAt: '2025-09-24',
    },
  ];

  return (
    <>
      <Head>
        <title>Dashboard - Quinoïa</title>
        <meta name="description" content="Ton espace Quinoïa" />
      </Head>

      <DashboardNavbar
        statusBadge={
          <div className="flex items-center gap-3">
            {!isPremium && (
              <button
                onClick={handleUpgrade}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all bg-[#FFF6DC] text-[#414535] hover:bg-[#F4C95D]"
              >
                <span className="flex flex-col md:flex-row items-start md:items-center md:gap-2">
                  <span className="leading-tight">Gratuit</span>
                  <span className="text-[11px] md:text-sm">découvrir Premium 💎</span>
                </span>
              </button>
            )}
            {isPremium && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#F4C95D] text-[#414535]">
                Premium 💎
              </span>
            )}
            <button
              onClick={() => setActiveTab(activeTab === 'profil' ? 'menu' : 'profil')}
              className="p-2 hover:bg-[#FAFAFA] rounded-lg transition-colors"
              title="Profil"
            >
              <svg
                className="w-5 h-5 text-[#414535]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>
          </div>
        }
      />

      {/* Welcome Animation (First Visit) */}
      {showWelcome && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="welcome-sparkles">
            <span className="sparkle" style={{ left: '30%', top: '20%', animationDelay: '0s' }}>
              ✨
            </span>
            <span className="sparkle" style={{ left: '60%', top: '15%', animationDelay: '0.2s' }}>
              ✨
            </span>
            <span className="sparkle" style={{ left: '50%', top: '40%', animationDelay: '0.4s' }}>
              ✨
            </span>
          </div>
          <style jsx>{`
            @keyframes sparkle-fade {
              0% {
                opacity: 0;
                transform: translateY(0) scale(0.5);
              }
              50% {
                opacity: 0.4;
                transform: translateY(-20px) scale(1);
              }
              100% {
                opacity: 0;
                transform: translateY(-40px) scale(0.5);
              }
            }
            .welcome-sparkles {
              position: relative;
              width: 100vw;
              height: 100vh;
            }
            .sparkle {
              position: absolute;
              font-size: 2rem;
              animation: sparkle-fade 1s ease-out forwards;
            }
          `}</style>
        </div>
      )}

      <DashboardLayout
        userStatus={user?.status}
        swapQuota={{
          used: quotas?.swapsUsedThisMenu || 0,
          limit: quotas?.swapQuotaLimit || null,
        }}
        onUpgrade={handleUpgrade}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      >
        {(layoutData) => (
          <>
            {/* Menu Section */}
            {activeTab === 'menu' && (
              <>
                {currentMenu && ingredientsCatalog ? (
                  <MenuSection
                    menu={currentMenu}
                    ingredientsCatalog={ingredientsCatalog}
                    isPremium={isPremium}
                    swapQuota={{
                      used: quotas?.swapsUsedThisMenu || 0,
                      limit: quotas?.swapQuotaLimit || null,
                    }}
                    onError={(err) => setError(err)}
                    onSwapQuotaExceeded={handleSwapQuotaExceeded}
                    onOpenShoppingList={() => setIsShoppingListOpen(true)}
                    onActiveRecipesChange={setCurrentActiveRecipes}
                    historique={historique}
                    onUpgradeHistory={() => setUpsellModal({ isOpen: true, type: 'history' })}
                    userFirstName={user?.firstName}
                  />
                ) : (
                  <EmptyState
                    onGenerateMenu={handleGenerateMenu}
                    isGenerating={isGeneratingMenu}
                    canGenerate={
                      quotas?.menusGeneratedThisWindow !== undefined &&
                      quotas.menusGeneratedThisWindow < (quotas.menuQuotaLimit || Infinity)
                    }
                  />
                )}
              </>
            )}

            {/* Historique Section */}
            {activeTab === 'historique' && (
              <HistoriqueSection
                isPremium={isPremium}
                historique={historique}
                onUpgrade={() => setUpsellModal({ isOpen: true, type: 'history' })}
              />
            )}

            {/* Profil Section */}
            {activeTab === 'profil' && user && (
              <ProfilSection
                user={user}
                submission={submission}
                onSavePreferences={handleSavePreferences}
                onUpgrade={handleUpgrade}
                onManageSubscription={() => router.push('/account/subscription')}
                onDeleteAccount={() => {
                  if (confirm('Es-tu sûr de vouloir supprimer ton compte ?')) {
                    // Handle account deletion
                  }
                }}
                onLogout={handleLogout}
                onBackToDashboard={() => setActiveTab('menu')}
              />
            )}
          </>
        )}
      </DashboardLayout>

      {/* Shopping List Drawer */}
      {currentMenu && shoppingList && (
        <ShoppingListDrawer
          isOpen={isShoppingListOpen}
          onClose={() => setIsShoppingListOpen(false)}
          shoppingList={shoppingList}
          isPremium={isPremium}
          numServings={currentMenu.numServings}
          recipeCount={(currentActiveRecipes || currentMenu.activeRecipes).length}
          onUpgrade={() => setUpsellModal({ isOpen: true, type: 'shopping' })}
        />
      )}

      {/* Upsell Modals */}
      <UpsellModal
        isOpen={upsellModal.isOpen}
        onClose={() => setUpsellModal({ ...upsellModal, isOpen: false })}
        type={upsellModal.type}
      />
    </>
  );
}

// Wrapper with ToastProvider
export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}

// Empty State Component
function EmptyState({
  onGenerateMenu,
  isGenerating,
  canGenerate,
}: {
  onGenerateMenu: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-6xl mb-4">🍽️</div>
      <h2 className="text-2xl font-semibold text-[#414535] mb-2">Aucun menu actif</h2>
      <p className="text-[#8A8A8A] mb-6">
        Génère ton premier menu personnalisé pour commencer
      </p>
      <button
        onClick={onGenerateMenu}
        disabled={isGenerating || !canGenerate}
        className="bg-[#414535] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2f3226] transition-colors disabled:bg-[#BDBDBD] disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Génération en cours...
          </span>
        ) : canGenerate ? (
          'Générer un menu'
        ) : (
          'Quota épuisé'
        )}
      </button>
      {!canGenerate && (
        <p className="text-sm text-[#8A8A8A] mt-4">
          <Link href="/tarifs" className="text-[#F4C95D] hover:underline">
            Passe Premium
          </Link>{' '}
          pour des menus illimités
        </p>
      )}
    </div>
  );
}
