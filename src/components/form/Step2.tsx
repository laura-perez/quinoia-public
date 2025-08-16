import React from "react";
import RadioGroup from "./form-components/RadioGroup";
import ProgressBar from "./form-components/ProgressBar";
import CheckboxGroup from "./form-components/CheckboxGroup";
import TextInput from "./form-components/TextInput";
import type { FormStepProps } from "./types";
import { FORM_LABELS, FORM_PLACEHOLDERS } from "../../lib/constants/ui";
import { useFormStep, useFormValidation, useFormHandlers } from "./hooks";

const DIET_OPTIONS = ["Omnivore", "Flexitarien", "Végétarien", "Vegan"];
const PROTEIN_OPTIONS = [
  "Boeuf",
  "Volaille",
  "Poisson",
  "Œufs",
  "Fromages, Produits laitiers",
  "Tofu",
  "Légumineuses (Pois chiches, lentilles ..)",
  "Simili-viandes (Heura, LaVie etc ..)",
];

/**
 * Step 2: Dietary preferences and restrictions.
 */
export default function Step2({ formData, updateFormData, goToNext, goToPrev, email, isLast }: FormStepProps) {
  const { errors, clearFieldError, setValidationErrors } = useFormStep();
  const { validateRequiredFields, hasValidationErrors } = useFormValidation();
  const { handleInputChange, createCheckboxArrayHandler } = useFormHandlers(updateFormData, clearFieldError);

  // Checkbox handler for protein preferences
  const handleCheckbox = createCheckboxArrayHandler(
    'proteinPreferences',
    () => formData.proteinPreferences || []
  );

  // Validate and submit
  const handleSubmit = () => {
    const validationErrors = validateRequiredFields(formData as Record<string, unknown>, ['dietType']);
    
    if (hasValidationErrors(validationErrors)) {
      setValidationErrors(validationErrors);
      return;
    }
    
    goToNext();
  };

  return (
    <div>
      <ProgressBar step={2} total={4} />

      <h2 className="text-2xl font-bold text-[#414535] mb-2">Tes préférences alimentaires</h2>
      <p className="text-[#8A8A8A] mb-6">
        Raconte moi un peu comment tu manges aujourd’hui, ce que tu veux éviter, et ce que tu veux
        retrouver dans ton assiette.
      </p>

      <div className="space-y-6">
        {/* Diet type radio group */}
        <RadioGroup
          name="dietType"
          options={DIET_OPTIONS}
          value={formData.dietType || ""}
          onChange={handleInputChange}
          error={errors.dietType as string}
          label={FORM_LABELS.DIET_TYPE}
          optionClassName="flex-1 text-center font-medium"
        />

        {/* Protein preferences checkbox group */}
        <CheckboxGroup
          name="proteinPreferences"
          options={PROTEIN_OPTIONS}
          values={formData.proteinPreferences || []}
          onChange={handleCheckbox}
          label={FORM_LABELS.PROTEIN_PREFERENCES}
        />

        {/* Allergies */}
        <TextInput
          label={FORM_LABELS.ALLERGIES}
          name="allergens"
          value={formData.allergens || ""}
          onChange={handleInputChange}
          placeholder={FORM_PLACEHOLDERS.ALLERGIES}
        />

        {/* Disliked foods */}
        <TextInput
          label={FORM_LABELS.DISLIKED_FOODS}
          name="dislikedFoods"
          value={formData.dislikedFoods || ""}
          onChange={handleInputChange}
          placeholder={FORM_PLACEHOLDERS.DISLIKED_FOODS}
        />

        {/* Favorite foods */}
        <TextInput
          label={FORM_LABELS.FAVORITE_FOODS}
          name="favoriteFoods"
          value={formData.favoriteFoods || ""}
          onChange={handleInputChange}
          placeholder={FORM_PLACEHOLDERS.FAVORITE_FOODS}
        />
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={goToPrev}
          className="bg-white border border-[#414535] text-[#414535] px-6 py-3 rounded-md font-medium hover:bg-[#FDFBF8] transition"
          type="button"
        >
          Retour
        </button>
        <button
          onClick={handleSubmit}
          className="bg-[#414535] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#2f3226] transition"
          type="button"
        >
          Étape suivante
        </button>
      </div>
    </div>
  );
}
