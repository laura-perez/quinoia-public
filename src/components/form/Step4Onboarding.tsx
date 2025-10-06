import React, { useState, useCallback } from "react";
import { useRouter } from "next/router";
import ProgressBar from "./form-components/ProgressBar";
import FormError from "./form-components/FormError";
import { createEnvironmentLogger } from "@/lib/logger";
import { FormStepProps } from "./types";

export default function Step4Onboarding({ formData, goToPrev }: FormStepProps) {
  const router = useRouter();
  const logger = React.useMemo(() => createEnvironmentLogger(), []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Map form data to API schema
  const prepareSubmissionData = useCallback(() => {
    // Map cooking level to enum
    const cookingLevelMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
      "Débutant : Je veux juste que ce soit simple et rapide": 'beginner',
      "Intermédiaire : Je suis à l'aise, mais pas un chef non plus": 'intermediate',
      "Confirmé : Cuisiner, c'est mon terrain de jeu": 'advanced',
    };

    return {
      // User profile info (Step1)
      firstName: formData.name || '',
      age: parseInt(formData.age as string) || null,
      gender: formData.gender || null,

      // Dietary preferences (Step2, Step3)
      diet: formData.dietType || 'Omnivore',
      proteinPreferences: formData.proteinPreferences || [],
      equipmentAvailable: formData.equipmentAvailable || [],
      cookingLevel: cookingLevelMap[formData.cookingLevel as string] || 'beginner',
      numRecipes: parseInt(formData.numRecipes as string) || 3,
      numServings: parseInt(formData.numServings as string) || 2,
      dislikedFoods: formData.dislikedFoods || '',
    };
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const submissionData = prepareSubmissionData();

      // Step 1: Submit onboarding (save user preferences)
      const onboardingResponse = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!onboardingResponse.ok) {
        const errorData = await onboardingResponse.json();
        throw new Error(errorData.error || "Erreur lors de l'enregistrement");
      }

      logger.info('Onboarding completed, generating menu...');

      // Step 2: Generate first menu automatically
      const menuResponse = await fetch("/api/dashboard/generate-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numRecipes: submissionData.numRecipes,
          numServings: submissionData.numServings,
        }),
      });

      if (!menuResponse.ok) {
        const menuError = await menuResponse.json();
        logger.error('Menu generation failed after onboarding', {
          error: menuError
        });
        // Don't throw - still redirect to dashboard where user can retry
        setError("Ton profil est enregistré ! Redirige vers ton tableau de bord...");
      } else {
        logger.info('First menu generated successfully');
      }

      // Step 3: Redirect to dashboard
      router.push('/dashboard');

    } catch (err: any) {
      logger.error('Onboarding submission failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });

      setError(err.message || "Une erreur est survenue. Réessaie dans quelques instants.");
    } finally {
      setIsSubmitting(false);
    }
  }, [prepareSubmissionData, router, logger]);

  return (
    <div>
      <ProgressBar step={4} total={4} />

      <h2 className="text-2xl font-bold text-[#414535] mb-2">
        Prêt à découvrir ton premier menu ? ✨
      </h2>
      <p className="text-[#8A8A8A] mb-6">
        En validant, nous allons générer automatiquement ton premier menu personnalisé avec {formData.numRecipes || 3} recettes.
      </p>

      <FormError error={error} />

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={goToPrev}
          className="bg-white border border-[#414535] text-[#414535] px-6 py-3 rounded-md font-medium hover:bg-[#FDFBF8] transition"
          disabled={isSubmitting}
        >
          Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`px-6 py-3 rounded-md font-semibold transition text-white flex items-center justify-center gap-2 ${
            !isSubmitting
              ? "bg-[#414535] hover:bg-[#2f3226]"
              : "bg-[#8A8A8A] cursor-not-allowed"
          }`}
        >
          {isSubmitting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {isSubmitting ? "Génération de ton menu…" : "Générer mon menu"}
        </button>
      </div>
    </div>
  );
}
