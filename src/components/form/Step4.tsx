import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import RadioGroup from "./form-components/RadioGroup";
import ProgressBar from "./form-components/ProgressBar";
import TextInput from "./form-components/TextInput";
import FormError from "./form-components/FormError";
import ConsentCheckbox from "./form-components/ConsentCheckbox";
import { createEnvironmentLogger } from "@/lib/logger";
import { getRecaptchaSiteKey } from "@/lib/config/clientEnv";
import { FormStepProps, FormErrors } from "./types";
import { VALIDATION_MESSAGES, FORM_LABELS, FORM_PLACEHOLDERS, scrollToTop } from "../../lib/constants/ui";

// Extend Window interface for reCAPTCHA
declare global {
  interface Window {
    grecaptcha: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}


export default function Step4({ formData, updateFormData, goToPrev, email, isLast }: FormStepProps) {
  // Initialize logger for this component (stable reference)
  const logger = React.useMemo(() => createEnvironmentLogger(), []);
  
  useEffect(() => {
    scrollToTop();
  }, []);

  // Centralized form state
  const [formState, setFormState] = useState(() => ({
    agreed: false,
    note: formData.note || "",
    email: formData.email || "",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [trialExpired, setTrialExpired] = useState(false);


  // Centralized change handler
  const handleFieldChange = useCallback((name: string, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  // Memoized handlers for form fields
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("email", e.target.value),
    [handleFieldChange]
  );
  const handleConsentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("agreed", e.target.checked),
    [handleFieldChange]
  );


  // Validation
  const validate = useCallback(() => {
    const newErrors: FormErrors = {};
    if (!formState.agreed) {
      newErrors.consent = "Merci d'accepter l'utilisation de tes données.";
    }
    if (!formState.email) {
      setError("Merci de renseigner ton adresse email.");
      newErrors.email = "Adresse email requise";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState.agreed, formState.email]);

  // Extract reCAPTCHA token generation
  const getRecaptchaToken = useCallback(async (): Promise<string> => {
    let siteKey;
    try {
      siteKey = getRecaptchaSiteKey();
    } catch (configError) {
      logger.error('reCAPTCHA configuration error', {
        error: configError instanceof Error ? configError.message : String(configError),
        environment: process.env.NODE_ENV
      });
      throw new Error("Configuration reCAPTCHA invalide");
    }
    
    if (!window.grecaptcha) {
      logger.error('reCAPTCHA runtime error', {
        error: 'reCAPTCHA script not loaded',
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      throw new Error("reCAPTCHA is not available");
    }
    
    const token = await window.grecaptcha.execute(siteKey, { action: "submit_form" });
    if (!token) {
      logger.error('reCAPTCHA token generation failed', {
        siteKey: siteKey.slice(0, 10) + '...',
        action: 'submit_form'
      });
      throw new Error("Failed to generate security token");
    }
    
    return token;
  }, [logger]);

  // Full form submission (handles user verification and menu generation)
  const submitToApi = useCallback(async (submissionData: any): Promise<string | null> => {
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionData),
    });

    if (!response.ok) {
      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.redirectTo?.includes('trial-expired')) {
          const error = new Error(errorData.error) as any;
          error.isTrialExpired = true;
          throw error;
        }
      }
      throw new Error("Erreur lors de la génération du menu");
    }

    // Parse response to get shareId
    try {
      const responseData = await response.json();
      return responseData.shareId || null;
    } catch (parseError) {
      logger.error('Response parsing failed', { parseError });
      return null;
    }
  }, [logger]);

  // Main submit handler
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setError("");
    setErrors({});

    try {
      const token = await getRecaptchaToken();

      const submissionData = {
        recaptchaToken: token,
        form: {
          ...formData,
          email: formState.email,
          consent: formState.agreed,
        },
      };

      logger.debug('Form submission initiated', {
        hasToken: !!token,
        hasEmail: !!formState.email,
        hasConsent: formState.agreed,
        formDataKeys: Object.keys(formData)
      });

      // Submit to API (handles user verification + menu generation)
      const resultShareId = await submitToApi(submissionData);

      // Store shareId for success message
      if (resultShareId) {
        setShareId(resultShareId);
      }

      // Show success immediately

      // Small delay to let user see completion, then show success
      setTimeout(() => {
        setSubmitted(true);
      }, 800);
    } catch (err: any) {
      logger.error('Form submission failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        formDataKeys: Object.keys(formData),
        hasEmail: !!formState.email,
        hasConsent: formState.agreed,
        isTrialExpired: err?.isTrialExpired
      });

      // Handle error state

      // Handle trial expired case differently
      if (err?.isTrialExpired) {
        setTimeout(() => {
          setTrialExpired(true);
        }, 800);
        return; // Don't send admin email for business case
      }

      // For other errors, show success (per original requirements)
      setTimeout(() => {
        setSubmitted(true);
      }, 800);

      // Send error notification email to admin only for technical errors
      try {
        await fetch('/api/notify-admin-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
            formData: {
              email: formState.email,
              ...formData
            },
            timestamp: new Date().toISOString()
          })
        });
      } catch (emailError) {
        logger.error('Failed to send admin error notification', { emailError });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, getRecaptchaToken, submitToApi, formData, formState, logger]);

  return (
    <div>
      <ProgressBar step={4} total={4} />

      {trialExpired ? (
        <div className="text-center max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-[#414535] mb-4">
            Tu as adoré ton premier menu ? ✨
          </h2>
          <div className="bg-[#FDFBF8] border-2 border-[#F4C95D] rounded-xl p-6 mb-6">
            <p className="text-[#414535] font-medium mb-4">
              🎉 <strong>Offre de lancement exclusive !</strong>
            </p>
            <p className="text-[#8A8A8A] mb-4">
              Accède à des <strong>centaines de nouvelles recettes</strong> personnalisées,
              tes listes de courses optimisées, et bien plus encore.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-[#8A8A8A] mb-4">
              <span>✓ Menus illimités</span>
              <span>✓ Annulation facile</span>
              <span>✓ Zéro charge mentale</span>
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="/tarifs?from=trial-expired"
              className="inline-block bg-[#414535] text-white px-8 py-4 rounded-md font-semibold text-lg hover:bg-[#2f3226] transition-colors"
            >
              Découvrir l'offre à 9,90€ 🚀
            </Link>
            <p className="text-xs text-[#8A8A8A]">
              Rejoins déjà 500+ personnes qui ont simplifié leurs repas
            </p>
          </div>
        </div>
      ) : submitted ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#414535] mb-6">Ton menu est prêt ! 🍽️</h2>
          {shareId && (
            <div className="space-y-6">
              <Link
                href={`/menu/${shareId}`}
                className="inline-block bg-[#F4C95D] text-[#414535] px-8 py-4 rounded-md font-semibold text-lg hover:bg-[#E5B84A] transition-colors"
              >
                Découvrir mon menu
              </Link>
              <p className="text-[#8A8A8A] max-w-md mx-auto text-sm">
                Tu vas aussi recevoir ce menu dans ta boîte mail dans quelques minutes.
                Garde-le précieusement pour tes prochaines courses ! 📧✨
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-[#414535] mb-2">
            Tu es à 2 doigts de recevoir ton menu personnalisé ✨
          </h2>
          <p className="text-[#8A8A8A] mb-6">
            Plus qu'à confirmer ton email pour recevoir tes recettes sur-mesure.
          </p>
          
          <div className="mb-6">
            <TextInput
              label="Ton adresse email"
              name="email"
              type="email"
              value={formState.email}
              onChange={handleEmailChange}
              required
              placeholder="exemple@email.com"
            />
          </div>

          {/* consent */}
          <ConsentCheckbox
            checked={formState.agreed}
            onChange={handleConsentChange}
            label="J’accepte que mes données soient utilisées pour générer mon menu personnalisé. Elles ne seront jamais partagées."
          />

          <FormError error={error} />

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={goToPrev}
              className="bg-white border border-[#414535] text-[#414535] px-6 py-3 rounded-md font-medium hover:bg-[#FDFBF8] transition"
            >
              Retour
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formState.agreed || isSubmitting}
              className={`px-6 py-3 rounded-md font-semibold transition text-white flex items-center justify-center gap-2 ${
                formState.agreed
                  ? "bg-[#414535] hover:bg-[#2f3226]"
                  : "bg-[#8A8A8A] cursor-not-allowed"
              }`}
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isSubmitting ? "Envoi en cours…" : "C'est parti !"}
            </button>
          </div>
        </>
      )}

    </div>
  );
}
