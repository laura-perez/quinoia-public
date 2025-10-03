/**
 * Premium user dashboard
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/ui';

interface UserData {
  email: string;
  firstName?: string;
  status: string;
  subscriptionType?: string;
  paidUntil?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get user email from localStorage or session
      const email = localStorage.getItem('quinoia_user_email');

      if (!email) {
        router.push('/tarifs');
        return;
      }

      // For now, we'll use localStorage data
      // TODO: Implement proper user session management
      setUserData({
        email,
        firstName: 'Laura', // Temporary
        status: 'paid_active',
        subscriptionType: 'monthly',
      });

    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Erreur lors du chargement des données utilisateur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('quinoia_user_email');
    router.push('/');
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Dashboard - Quinoïa Premium</title>
        </Head>
        <Navbar />
        <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#F4C95D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8A8A8A]">Chargement de votre espace...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
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

  return (
    <>
      <Head>
        <title>Dashboard - Quinoïa Premium</title>
        <meta name="description" content="Votre espace Premium Quinoïa" />
      </Head>

      <Navbar />

      <div className="min-h-screen bg-[#FFFDF8] py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#414535]">
                Salut {userData?.firstName || 'Laura'} ! ✨
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-[#F4C95D] text-[#414535] px-3 py-1 rounded-full text-sm font-medium">
                  Premium {userData?.subscriptionType === 'yearly' ? 'Annuel' : 'Mensuel'}
                </span>
                <span className="text-[#8A8A8A] text-sm">
                  • {userData?.email}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#8A8A8A] hover:text-[#414535] transition-colors text-sm"
            >
              Déconnexion
            </button>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Generate Menu */}
            <Link
              href="/formulaire"
              className="bg-white rounded-xl border border-[#EAEAEA] p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🍽️</div>
                <h3 className="text-lg font-semibold text-[#414535] mb-2">
                  Générer un nouveau menu
                </h3>
                <p className="text-[#8A8A8A] text-sm">
                  Créez un menu personnalisé avec vos préférences
                </p>
              </div>
            </Link>

            {/* Preferences */}
            <Link
              href="/dashboard/preferences"
              className="bg-white rounded-xl border border-[#EAEAEA] p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
                <h3 className="text-lg font-semibold text-[#414535] mb-2">
                  Mes préférences
                </h3>
                <p className="text-[#8A8A8A] text-sm">
                  Modifiez vos goûts et restrictions alimentaires
                </p>
              </div>
            </Link>

            {/* Subscription Management */}
            <Link
              href="/dashboard/subscription"
              className="bg-white rounded-xl border border-[#EAEAEA] p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💳</div>
                <h3 className="text-lg font-semibold text-[#414535] mb-2">
                  Mon abonnement
                </h3>
                <p className="text-[#8A8A8A] text-sm">
                  Gérez votre abonnement et facturation
                </p>
              </div>
            </Link>

            {/* Menu History */}
            <Link
              href="/dashboard/history"
              className="bg-white rounded-xl border border-[#EAEAEA] p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📊</div>
                <h3 className="text-lg font-semibold text-[#414535] mb-2">
                  Historique des menus
                </h3>
                <p className="text-[#8A8A8A] text-sm">
                  Retrouvez vos anciens menus et recettes
                </p>
              </div>
            </Link>

            {/* Profile Settings */}
            <Link
              href="/dashboard/profile"
              className="bg-white rounded-xl border border-[#EAEAEA] p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">👤</div>
                <h3 className="text-lg font-semibold text-[#414535] mb-2">
                  Mon profil
                </h3>
                <p className="text-[#8A8A8A] text-sm">
                  Modifiez vos informations personnelles
                </p>
              </div>
            </Link>

            {/* Support */}
            <a
              href="mailto:hello@quinoia.fr"
              className="bg-white rounded-xl border border-[#EAEAEA] p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💬</div>
                <h3 className="text-lg font-semibold text-[#414535] mb-2">
                  Support
                </h3>
                <p className="text-[#8A8A8A] text-sm">
                  Contactez notre équipe pour toute question
                </p>
              </div>
            </a>
          </div>

          {/* Welcome Message for New Users */}
          <div className="bg-[#FFF6DC] border border-[#F4C95D] rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-2xl">🎉</div>
              <div>
                <h3 className="font-semibold text-[#414535] mb-2">
                  Bienvenue dans Quinoïa Premium !
                </h3>
                <p className="text-[#8A8A8A] text-sm mb-3">
                  Vous avez maintenant accès à toutes nos fonctionnalités premium. Commencez par générer votre premier menu personnalisé !
                </p>
                <Link
                  href="/formulaire"
                  className="inline-block bg-[#414535] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2f3226] transition-colors"
                >
                  Créer mon premier menu
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-[#EAEAEA] p-4 text-center">
              <div className="text-2xl font-bold text-[#F4C95D] mb-1">0</div>
              <div className="text-sm text-[#8A8A8A]">Menus générés</div>
            </div>
            <div className="bg-white rounded-lg border border-[#EAEAEA] p-4 text-center">
              <div className="text-2xl font-bold text-[#F4C95D] mb-1">7</div>
              <div className="text-sm text-[#8A8A8A]">Jours d'essai restants</div>
            </div>
            <div className="bg-white rounded-lg border border-[#EAEAEA] p-4 text-center">
              <div className="text-2xl font-bold text-[#F4C95D] mb-1">∞</div>
              <div className="text-sm text-[#8A8A8A]">Menus disponibles</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}