/**
 * Login Page - Magic Link Authentication
 *
 * Flow:
 * 1. User enters email
 * 2. POST /api/auth/request-magic-link
 * 3. Show success message
 * 4. User clicks link in email → /api/auth/verify-magic-link → redirect to dashboard
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/ui';
import { ToastProvider, useToast } from '@/components/ui/Toast';

function LoginPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await fetch('/api/dashboard/status');

        // If the response is OK, user is authenticated - redirect to dashboard
        if (response.ok) {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        // If there's an error, user is not authenticated - continue with login
        console.log('User not authenticated');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, [router]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setErrorMessage('');
    setSuccessMessage('');

    // Validate email
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setValidationError('L\'email est requis');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setValidationError('Format d\'email invalide');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          setErrorMessage('Trop de demandes. Réessaie dans quelques minutes.');
          return;
        }

        // Handle validation errors
        if (result.errors) {
          const firstError = Object.values(result.errors)[0] as string;
          setErrorMessage(firstError);
          return;
        }

        setErrorMessage(result.error || 'Une erreur est survenue');
        return;
      }

      // Success - always show same message (anti-enumeration)
      setSuccessMessage('Lien envoyé ! Vérifie tes emails.');
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Erreur réseau. Vérifie ta connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check for error query param (from failed magic link verification)
  React.useEffect(() => {
    const error = router.query.error;
    if (error === 'invalid_token') {
      setErrorMessage('Lien invalide. Demande un nouveau lien.');
    } else if (error === 'token_expired') {
      setErrorMessage('Lien expiré. Demande un nouveau lien.');
    }
  }, [router.query.error]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <>
        <Head>
          <title>Connexion - Quinoïa</title>
        </Head>
        <Navbar />
        <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#F4C95D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8A8A8A]">Vérification...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Connexion - Quinoïa</title>
        <meta name="description" content="Connecte-toi à ton compte Quinoïa" />
      </Head>

      <Navbar />

      <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#414535] mb-2">
              Connexion 🔐
            </h1>
            <p className="text-[#8A8A8A]">
              Entre ton email pour recevoir un lien de connexion magique
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-xl">✨</div>
                <div className="flex-1">
                  <p className="text-green-800 font-medium mb-2">{successMessage}</p>
                  <p className="text-green-700 text-sm">
                    Clique sur le lien dans l'email pour te connecter. Il est valable 15 minutes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600">{errorMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <div className="bg-white rounded-xl border border-[#EAEAEA] p-8 shadow-sm">
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#414535] mb-2"
                >
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="ton-email@exemple.fr"
                  className={`w-full px-4 py-3 border rounded-lg text-[#414535] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#F4C95D] transition-all ${
                    validationError ? 'border-red-300' : 'border-[#EAEAEA]'
                  }`}
                  disabled={isSubmitting || !!successMessage}
                />
                {validationError && (
                  <p className="text-red-500 text-sm mt-2">{validationError}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !!successMessage}
                className="w-full bg-[#414535] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2f3226] transition-colors disabled:bg-[#BDBDBD] disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F4C95D] focus:ring-offset-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Envoi en cours...
                  </span>
                ) : successMessage ? (
                  'Lien envoyé'
                ) : (
                  'Recevoir le lien de connexion'
                )}
              </button>
            </form>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#BDBDBD]">
              🔒 Authentification sécurisée sans mot de passe
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginPageContent />
    </ToastProvider>
  );
}
