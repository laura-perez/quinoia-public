/**
 * Checkout error page
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/ui';

export default function CheckoutError() {
  const router = useRouter();
  const { reason } = router.query;

  const getErrorMessage = (reason?: string | string[]) => {
    switch (reason) {
      case 'payment_failed':
        return {
          title: 'Paiement échoué',
          description: 'Votre paiement n\'a pas pu être traité. Veuillez vérifier vos informations bancaires et réessayer.',
          icon: '💳'
        };
      case 'cancelled':
        return {
          title: 'Paiement annulé',
          description: 'Vous avez annulé le processus de paiement. Aucun montant n\'a été débité.',
          icon: '❌'
        };
      default:
        return {
          title: 'Erreur de paiement',
          description: 'Une erreur est survenue lors du traitement de votre paiement. Veuillez réessayer.',
          icon: '⚠️'
        };
    }
  };

  const errorInfo = getErrorMessage(reason);

  const handleRetry = () => {
    // Get the stored email if available
    const storedEmail = localStorage.getItem('quinoia_user_email');

    // Redirect to tarifs page with email if available
    if (storedEmail) {
      router.push(`/checkout/monthly?email=${encodeURIComponent(storedEmail)}`);
    } else {
      router.push('/checkout/monthly');
    }
  };

  return (
    <>
      <Head>
        <title>Erreur de paiement - Quinoïa</title>
        <meta name="description" content="Une erreur est survenue lors du paiement" />
      </Head>

      <Navbar />

      <div className="min-h-screen bg-[#FFFDF8] py-12">
        <div className="max-w-md mx-auto px-4">
          {/* Error Display */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{errorInfo.icon}</div>
            <h1 className="text-2xl font-bold text-[#414535] mb-4">
              {errorInfo.title}
            </h1>
            <p className="text-[#8A8A8A] leading-relaxed">
              {errorInfo.description}
            </p>
          </div>

          {/* Error Details Box */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-700 mb-3">
              Que s'est-il passé ?
            </h2>
            <div className="space-y-2 text-sm text-red-600">
              {reason === 'payment_failed' && (
                <>
                  <div>• Informations de carte incorrectes</div>
                  <div>• Fonds insuffisants</div>
                  <div>• Carte expirée ou bloquée</div>
                  <div>• Problème technique temporaire</div>
                </>
              )}
              {reason === 'cancelled' && (
                <div>• Vous avez fermé la fenêtre de paiement ou cliqué sur "Annuler"</div>
              )}
              {!reason && (
                <div>• Problème de connexion ou erreur technique</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 mb-6">
            <button
              onClick={handleRetry}
              className="w-full bg-[#414535] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#2f3226] transition-colors"
            >
              Réessayer le paiement
            </button>

            <Link
              href="/tarifs"
              className="block w-full bg-[#F4C95D] text-[#414535] text-center py-3 rounded-lg font-medium hover:bg-[#E5B84A] transition-colors"
            >
              Choisir un autre plan
            </Link>
          </div>

          {/* Help Section */}
          <div className="bg-[#FFFDF8] border border-[#F4F4F4] rounded-lg p-4 mb-6">
            <h3 className="font-medium text-[#414535] mb-3">
              💡 Besoin d'aide ?
            </h3>
            <div className="space-y-2 text-sm text-[#8A8A8A]">
              <div>• Vérifiez que votre carte est activée pour les paiements en ligne</div>
              <div>• Essayez avec une autre carte bancaire</div>
              <div>• Contactez votre banque si le problème persiste</div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="text-center">
            <p className="text-sm text-[#8A8A8A] mb-4">
              Le problème persiste ?
            </p>
            <div className="space-y-2">
              <a
                href="mailto:hello@quinoia.fr"
                className="block text-[#414535] hover:text-[#F4C95D] transition-colors font-medium"
              >
                📧 hello@quinoia.fr
              </a>
              <p className="text-xs text-[#8A8A8A]">
                Nous vous répondrons sous 24h
              </p>
            </div>
          </div>

          {/* Alternative Options */}
          <div className="mt-8 pt-6 border-t border-[#EAEAEA]">
            <h3 className="text-center text-sm font-medium text-[#414535] mb-4">
              Ou découvrez d'abord notre version gratuite
            </h3>
            <div className="space-y-2">
              <Link
                href="/formulaire"
                className="block text-center text-sm text-[#8A8A8A] hover:text-[#414535] transition-colors"
              >
                → Essayer gratuitement
              </Link>
              <Link
                href="/"
                className="block text-center text-sm text-[#8A8A8A] hover:text-[#414535] transition-colors"
              >
                ← Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}