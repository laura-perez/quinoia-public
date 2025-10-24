/**
 * Unified checkout page for all subscription plans
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/ui';
import { PLAN_METADATA, PlanType } from '@/lib/stripe/config';
import { EMAIL_REGEX } from '@/lib/constants';

export default function CheckoutPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [referrer, setReferrer] = useState<string | null>(null);

  const planType = router.query.plan as PlanType;
  const plan = planType ? PLAN_METADATA[planType] : null;

  // Get email from session API or localStorage
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        // Try to get email from session (if user is logged in)
        const response = await fetch('/api/dashboard/status');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.email) {
            setEmail(data.user.email);
            return;
          }
        }
      } catch (err) {
        // Silent fail - user might not be logged in
      }

      // Fallback to localStorage
      const storedEmail = localStorage.getItem('quinoia_user_email');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    };

    fetchUserEmail();
  }, []);

  // Track referrer for back button
  useEffect(() => {
    if (typeof window !== 'undefined' && document.referrer) {
      const referrerUrl = new URL(document.referrer);
      // Only save if referrer is from same domain
      if (referrerUrl.hostname === window.location.hostname) {
        setReferrer(document.referrer);
      }
    }
  }, []);

  const handleCheckout = async () => {
    if (!email) {
      setError('Merci de renseigner votre adresse email');
      return;
    }

    // Validate email
    if (!EMAIL_REGEX.test(email)) {
      setError('Format d\'email invalide');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          customerEmail: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la session');
      }

      // Store email for future use
      localStorage.setItem('quinoia_user_email', email);

      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (referrer) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  // Loading state while router is initializing
  if (!plan) {
    return (
      <>
        <Head>
          <title>Chargement... - Quinoïa</title>
        </Head>
        <Navbar />
        <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#F4C95D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8A8A8A]">Chargement...</p>
          </div>
        </div>
      </>
    );
  }

  const isYearly = planType === 'yearly';

  // 4 benefits only (removed "Astuces Premium")
  const benefits = [
    {
      icon: '🍽️',
      title: 'Recettes illimitées',
      description: 'Accède au catalogue complet de recettes et aux nouveautés en accès anticipé',
    },
    {
      icon: '🌿',
      title: 'Swaps illimités',
      description: 'Ajuste ton menu à tes envies, sans limites. Un menu sur-mesure, qui te ressemble vraiment.',
    },
    {
      icon: '🧾',
      title: 'Liste de courses interactive',
      description: 'Optimisée par rayons, prête pour ton supermarché. Partage la avec tes proches',
    },
    {
      icon: '🗓️',
      title: 'Historique complet',
      description: 'Retrouve tous tes anciens menus à tout moment. Ta mémoire alimentaire, sans effort.',
    },
  ];

  return (
    <>
      <Head>
        <title>Passe à Quinoïa Premium - Quinoïa</title>
        <meta name="description" content="Reprends le contrôle de tes repas sans y penser. Premium, c'est la version complète de Quinoïa." />
      </Head>

      <Navbar />

      <div className="min-h-screen bg-[#FFFDF8] py-4 lg:py-6">
        <div className="max-w-6xl mx-auto px-4">
          {/* 60/40 Split Layout - Desktop only */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

            {/* LEFT SECTION (60%) - Hero + CTA */}
            <div className="lg:w-[60%] flex flex-col">
              {/* Hero Section */}
              <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-[#414535] mb-3">
                  Passe à Quinoïa Premium
                </h1>
                <p className="text-base lg:text-lg text-[#414535] leading-relaxed">
                  <strong>Premium</strong>, c'est la version complète de Quinoïa : plus de liberté, moins de charge mentale.
                </p>
              </div>

              {/* CTA Section */}
              <div className="bg-white rounded-2xl border-2 border-[#F4C95D] p-6 lg:p-8 shadow-xl flex-grow flex flex-col">
                <h3 className="text-2xl lg:text-3xl font-bold text-[#414535] mb-3 text-center">
                  🌿 Respire un peu
                </h3>
                <p className="text-sm lg:text-base text-[#8A8A8A] text-center mb-6 leading-relaxed">
                  Ton temps et ton énergie valent plus que tes repas à improviser.<br />
                  Passe à <strong className="text-[#414535]">Quinoïa Premium</strong> et reprends de la sérénité dans ton assiette.
                </p>

                {/* Email Input */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-[#414535] mb-2">
                    Ton adresse email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="w-full px-4 py-3 border-2 border-[#EAEAEA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F4C95D] focus:border-transparent text-base"
                    disabled={isLoading}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isLoading || !email}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                    email && !isLoading
                      ? 'bg-gradient-to-r from-[#F4C95D] to-[#E5B84A] text-[#414535] hover:shadow-2xl hover:scale-[1.02]'
                      : 'bg-[#8A8A8A] text-white cursor-not-allowed'
                  }`}
                >
                  {isLoading && (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isLoading ? 'Redirection...' : `Activer mon Premium – ${plan.price}€/${plan.interval}`}
                </button>

                <p className="text-xs text-[#8A8A8A] text-center mt-auto pt-4">
                  Sans engagement. Annulable à tout moment. Paiement sécurisé.
                </p>

                {/* Back Link - Inside CTA section */}
                <div className="text-center mt-4 pt-3 border-t border-[#EAEAEA]">
                  <button
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 text-[#8A8A8A] hover:text-[#414535] transition-colors text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT SECTION (40%) - Benefits Cards */}
            <div className="lg:w-[40%] flex flex-col">
              <h2 className="text-xl lg:text-2xl font-bold text-[#414535] mb-5 text-center lg:text-left">
                🍋 Ce que tu débloques
              </h2>

              {/* Benefits Grid - 2x2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl border-2 border-[#EAEAEA] p-5 hover:border-[#F4C95D] hover:shadow-lg transition-all duration-300 group relative"
                    title={benefit.description}
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                      {benefit.icon}
                    </div>
                    <h3 className="text-base font-bold text-[#414535] mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-xs text-[#8A8A8A] leading-snug">
                      {benefit.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ethics Section - Centered, full width */}
          <div className="max-w-3xl mx-auto mb-12 mt-12">
            <div className="bg-gradient-to-br from-[#F4C95D]/10 to-[#E5B84A]/10 rounded-xl border-2 border-[#F4C95D]/30 p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">💚</div>
                <h3 className="text-xl lg:text-2xl font-bold text-[#414535]">
                  Un abonnement qui a du sens
                </h3>
              </div>
              <div className="text-sm lg:text-base text-[#414535] space-y-3 leading-relaxed">
                <p>
                  Tu ne finances pas une multinationale, tu soutiens un projet indépendant.
                </p>
                <p>
                  Chaque abonnement aide <strong>Quinoïa</strong> à grandir, à développer de nouvelles recettes, et à faire exister une alternative plus douce à la charge mentale alimentaire.
                </p>
                <p className="italic text-[#8A8A8A] text-sm mt-4">
                  Merci de faire partie de cette aventure 🍋
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section - Below split layout */}
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-[#414535] mb-6 text-center">
              ✨ Foire aux petites questions
            </h2>

            <div className="space-y-3">
              <details className="bg-white rounded-xl border-2 border-[#EAEAEA] p-4 group hover:border-[#F4C95D] transition-all">
                <summary className="font-semibold text-[#414535] text-sm cursor-pointer list-none flex justify-between items-center">
                  Je peux me désabonner quand je veux ?
                  <span className="text-[#F4C95D] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-[#8A8A8A] text-xs mt-3 leading-relaxed">
                  Oui, en deux clics. Pas de mail, pas de justification.
                </p>
              </details>

              <details className="bg-white rounded-xl border-2 border-[#EAEAEA] p-4 group hover:border-[#F4C95D] transition-all">
                <summary className="font-semibold text-[#414535] text-sm cursor-pointer list-none flex justify-between items-center">
                  Qu'est-ce que je garde si j'arrête ?
                  <span className="text-[#F4C95D] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-[#8A8A8A] text-xs mt-3 leading-relaxed">
                  Ton compte et ton dernier menu restent accessibles.<br />
                  Tu pourras revenir quand tu veux.
                </p>
              </details>

              <details className="bg-white rounded-xl border-2 border-[#EAEAEA] p-4 group hover:border-[#F4C95D] transition-all">
                <summary className="font-semibold text-[#414535] text-sm cursor-pointer list-none flex justify-between items-center">
                  Est-ce que je serai prélevé automatiquement ?
                  <span className="text-[#F4C95D] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-[#8A8A8A] text-xs mt-3 leading-relaxed">
                  Oui, une fois par mois via <strong>Stripe</strong> (paiement sécurisé).<br />
                  Tu peux annuler avant le prochain cycle, sans frais.
                </p>
              </details>
            </div>
          </div>

          {/* Alternative Plan Link */}
          {!isYearly && (
            <div className="text-center mt-8 mb-6">
              <Link
                href="/checkout/yearly"
                className="inline-block text-xs text-[#8A8A8A] hover:text-[#414535] transition-colors"
              >
                → Voir le plan annuel (3 mois offerts)
              </Link>
            </div>
          )}

          {/* Legal Notice */}
          <div className="text-center pb-6">
            <p className="text-xs text-[#8A8A8A]">
              En continuant, tu acceptes nos{' '}
              <Link href="/legal/terms" className="underline hover:text-[#414535]">
                conditions d'utilisation
              </Link>{' '}
              et notre{' '}
              <Link href="/legal/privacy" className="underline hover:text-[#414535]">
                politique de confidentialité
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
