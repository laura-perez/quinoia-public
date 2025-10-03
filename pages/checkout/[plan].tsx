/**
 * Unified checkout page for all subscription plans
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/ui';
import { PLAN_METADATA, PlanType } from '@/lib/stripe/config';

export default function CheckoutPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const planType = router.query.plan as PlanType;
  const plan = planType ? PLAN_METADATA[planType] : null;

  // Get email from URL params or localStorage
  useEffect(() => {
    const urlEmail = router.query.email as string;
    const storedEmail = localStorage.getItem('quinoia_user_email');

    if (urlEmail) {
      setEmail(urlEmail);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }
  }, [router.query.email]);

  const handleCheckout = async () => {
    if (!email) {
      setError('Merci de renseigner votre adresse email');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
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
  const otherPlan = isYearly ? 'monthly' : 'yearly';
  const otherPlanLabel = isYearly ? 'Plan mensuel (plus flexible)' : 'Plan annuel (3 mois offerts)';

  return (
    <>
      <Head>
        <title>Abonnement {plan.name} - Quinoïa</title>
        <meta name="description" content={`Souscrivez à l'abonnement ${plan.name} Quinoïa Premium`} />
      </Head>

      <Navbar />

      <div className="min-h-screen bg-[#FFFDF8] py-12">
        <div className="max-w-md mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#414535] mb-2">
              Souscription Premium
            </h1>
            <p className="text-[#8A8A8A]">
              Démarrez votre abonnement {isYearly ? 'annuel' : 'mensuel'}
            </p>
          </div>

          {/* Plan Summary */}
          <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#414535]">
                {plan.name}
              </h2>
              <div className="bg-[#F4C95D] text-[#414535] px-3 py-1 rounded-full text-sm font-medium">
                {isYearly ? '⭐ POPULAIRE' : '🏷️ PROMO'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Prix</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#414535]">
                    {plan.price}€/{plan.interval}
                  </span>
                  {!isYearly && 'originalPrice' in plan && (
                    <div className="text-sm text-[#8A8A8A] line-through">
                      {plan.originalPrice}€
                    </div>
                  )}
                  {isYearly && 'monthlyEquivalent' in plan && (
                    <div className="text-sm text-[#F4C95D] font-medium">
                      = {plan.monthlyEquivalent}€/mois
                    </div>
                  )}
                </div>
              </div>

              {isYearly && 'savings' in plan && (
                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A8A]">Économies</span>
                  <span className="text-[#414535] font-medium">{plan.savings}</span>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="text-sm text-[#8A8A8A] space-y-1">
                  <div>✓ Menus illimités personnalisés</div>
                  <div>✓ Listes de courses optimisées</div>
                  <div>✓ Résiliation à tout moment</div>
                  {isYearly && <div>✓ 3 mois offerts (vs mensuel)</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Savings Highlight for Yearly */}
          {isYearly && (
            <div className="bg-[#FFF6DC] border border-[#F4C95D] rounded-lg p-4 mb-6">
              <div className="text-center">
                <div className="text-sm font-medium text-[#414535] mb-1">
                  💰 Vous économisez 19,80€/an
                </div>
                <div className="text-xs text-[#8A8A8A]">
                  vs abonnement mensuel (9,90€ × 12 mois)
                </div>
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-[#414535] mb-2">
              Votre adresse email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="w-full px-4 py-3 border border-[#EAEAEA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C95D] focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isLoading || !email}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 ${
              email && !isLoading
                ? 'bg-[#414535] text-white hover:bg-[#2f3226]'
                : 'bg-[#8A8A8A] text-white cursor-not-allowed'
            }`}
          >
            {isLoading && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isLoading ? 'Redirection...' : `Procéder au paiement`}
          </button>

          {/* Legal Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#8A8A8A]">
              En continuant, vous acceptez nos{' '}
              <Link href="/legal/terms" className="underline">
                conditions d'utilisation
              </Link>{' '}
              et notre{' '}
              <Link href="/legal/privacy" className="underline">
                politique de confidentialité
              </Link>
            </p>
          </div>

          {/* Alternative Plans */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[#8A8A8A] mb-3">
              Besoin d'un autre plan ?
            </p>
            <div className="space-y-2">
              <Link
                href={`/checkout/${otherPlan}`}
                className="block text-sm text-[#414535] hover:text-[#F4C95D] transition-colors"
              >
                → {otherPlanLabel}
              </Link>
              <Link
                href="/tarifs"
                className="block text-sm text-[#8A8A8A] hover:text-[#414535] transition-colors"
              >
                ← Voir tous les plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
