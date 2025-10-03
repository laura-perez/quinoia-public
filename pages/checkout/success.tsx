/**
 * Checkout success page
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/ui';

export default function CheckoutSuccess() {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = router.query.session_id as string;

    if (sessionId) {
      fetchSessionStatus(sessionId);
    }
  }, [router.query.session_id]);

  const fetchSessionStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/checkout/session-status/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la vérification du paiement');
      }

      setSessionStatus(data);
    } catch (err) {
      console.error('Error fetching session status:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Vérification du paiement - Quinoïa</title>
        </Head>
        <Navbar />
        <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#F4C95D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8A8A8A]">Vérification de votre paiement...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Erreur de paiement - Quinoïa</title>
        </Head>
        <Navbar />
        <div className="min-h-screen bg-[#FFFDF8] py-12">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 mb-6">
              <div className="text-red-600 text-4xl mb-4">❌</div>
              <h1 className="text-xl font-bold text-red-700 mb-2">
                Erreur de vérification
              </h1>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <Link
              href="/tarifs"
              className="inline-block bg-[#414535] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2f3226] transition-colors"
            >
              Retour aux tarifs
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isPaymentSuccessful = sessionStatus?.status === 'complete' && sessionStatus?.payment_status === 'paid';

  return (
    <>
      <Head>
        <title>Bienvenue dans Quinoïa Premium ! - Quinoïa</title>
        <meta name="description" content="Votre abonnement Quinoïa Premium est actif" />
      </Head>

      <Navbar />

      <div className="min-h-screen bg-[#FFFDF8] py-12">
        <div className="max-w-lg mx-auto px-4">
          {isPaymentSuccessful ? (
            <>
              {/* Success Content */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold text-[#414535] mb-4">
                  Bienvenue dans Quinoïa Premium !
                </h1>
                <p className="text-[#8A8A8A] text-lg">
                  Votre abonnement est maintenant actif
                </p>
              </div>

              {/* Welcome Box */}
              <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 mb-6">
                <h2 className="text-lg font-semibold text-[#414535] mb-4">
                  ✨ Votre essai gratuit a commencé !
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#8A8A8A]">7 jours d'essai gratuit activés</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#8A8A8A]">Accès illimité aux menus personnalisés</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#8A8A8A]">Listes de courses optimisées</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#8A8A8A]">Résiliation possible à tout moment</span>
                  </div>
                </div>
              </div>

              {/* Email Confirmation */}
              {sessionStatus?.customer_email && (
                <div className="bg-[#FFF6DC] border border-[#F4C95D] rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📧</span>
                    <div>
                      <p className="text-sm font-medium text-[#414535] mb-1">
                        Email de confirmation envoyé
                      </p>
                      <p className="text-xs text-[#8A8A8A]">
                        Vérifiez votre boîte mail <strong>{sessionStatus.customer_email}</strong> pour tous les détails de votre abonnement.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-4 mb-8">
                <Link
                  href="/dashboard"
                  className="block w-full bg-[#414535] text-white text-center py-4 rounded-lg font-semibold text-lg hover:bg-[#2f3226] transition-colors"
                >
                  Accéder à mon espace Premium 🚀
                </Link>

                <Link
                  href="/formulaire"
                  className="block w-full bg-[#F4C95D] text-[#414535] text-center py-3 rounded-lg font-medium hover:bg-[#E5B84A] transition-colors"
                >
                  Générer mon premier menu
                </Link>
              </div>

              {/* Next Steps */}
              <div className="bg-[#FFFDF8] border border-[#F4F4F4] rounded-lg p-4">
                <h3 className="font-medium text-[#414535] mb-3">
                  📋 Prochaines étapes
                </h3>
                <div className="space-y-2 text-sm text-[#8A8A8A]">
                  <div>1. Explorez votre nouvel espace Premium</div>
                  <div>2. Générez votre premier menu personnalisé</div>
                  <div>3. Téléchargez votre liste de courses</div>
                  <div>4. Profitez de vos 7 jours d'essai gratuit !</div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Payment Pending or Failed */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">⏳</div>
                <h1 className="text-2xl font-bold text-[#414535] mb-4">
                  Paiement en cours de traitement
                </h1>
                <p className="text-[#8A8A8A]">
                  Votre paiement est en cours de vérification. Vous recevrez un email de confirmation sous peu.
                </p>
              </div>

              <div className="text-center">
                <Link
                  href="/tarifs"
                  className="inline-block bg-[#414535] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2f3226] transition-colors"
                >
                  Retour aux tarifs
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}