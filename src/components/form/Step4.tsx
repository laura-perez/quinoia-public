import React, { useState, useEffect, useCallback } from "react";
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
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

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

  // Extract API submission logic
  const submitToApi = useCallback(async (submissionData: any): Promise<void> => {
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionData),
    });
    
    if (!response.ok) {
      let errorMessage = "Une erreur est survenue. Merci de réessayer.";
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        logger.error('API response parsing failed', {
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          responseStatus: response.status,
          responseStatusText: response.statusText,
          url: response.url
        });
      }
      throw new Error(errorMessage);
    }
  }, [logger]);

  // Main submit handler - now focused and concise
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
      await submitToApi(submissionData);
      setSubmitted(true);
    } catch (err) {
      logger.error('Form submission failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        formDataKeys: Object.keys(formData),
        hasEmail: !!formState.email,
        hasConsent: formState.agreed
      });
      setError(err instanceof Error ? err.message : "Une erreur est survenue. Merci de réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, getRecaptchaToken, submitToApi, formData, formState, logger]);

  return (
    <div>
      <ProgressBar step={4} total={4} />

      {submitted ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#414535] mb-4">C’est envoyé 🎉</h2>
          <p className="text-[#8A8A8A] max-w-md mx-auto">
            Merci ! Tu vas recevoir très bientôt ton menu personnalisé directement dans ta boîte
            mail.
          </p>
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
              className={`px-6 py-3 rounded-md font-semibold transition text-white ${
                formState.agreed
                  ? "bg-[#414535] hover:bg-[#2f3226]"
                  : "bg-[#8A8A8A] cursor-not-allowed"
              }`}
            >
              {isSubmitting ? "Envoi en cours…" : "C’est parti !"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
