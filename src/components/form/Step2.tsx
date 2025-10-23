import React from "react";
import RadioGroup from "./form-components/RadioGroup";
import ProgressBar from "./form-components/ProgressBar";
import CheckboxGroup from "./form-components/CheckboxGroup";
import TextInput from "./form-components/TextInput";
import type { FormStepProps } from "./types";
import { FORM_LABELS, FORM_PLACEHOLDERS, DIET_OPTIONS, PROTEIN_OPTIONS, ALLERGY_OPTIONS } from "../../lib/constants";
import { useFormStep, useFormValidation, useFormHandlers } from "./hooks";

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

  // Custom handler for allergies with mutual exclusion logic
  const handleAllergiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentAllergies = formData.allergens || [];
    const isChecked = e.target.checked;
    
    let newAllergies: string[];
    
    if (!isChecked) {
      // Unchecking an item
      newAllergies = currentAllergies.filter(item => item !== value);
      // If nothing is selected, auto-select "Aucune"
      if (newAllergies.length === 0) {
        newAllergies = ["Aucune"];
      }
    } else {
      // Checking an item
      if (value === "Aucune") {
        // If selecting "Aucune", clear all others
        newAllergies = ["Aucune"];
      } else {
        // If selecting anything else, remove "Aucune" and add the new item
        newAllergies = currentAllergies.filter(item => item !== "Aucune");
        newAllergies.push(value);
      }
    }
    
    updateFormData({ allergens: newAllergies });
    clearFieldError('allergens');
  };

  // Check if "Autres" is selected to show text input
  const isOtherAllergySelected = (formData.allergens || []).includes("Autres");

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
        <div>
          <CheckboxGroup
            name="allergens"
            options={ALLERGY_OPTIONS.map(a => a.label)}
            values={formData.allergens || ["Aucune"]}
            onChange={handleAllergiesChange}
            label={FORM_LABELS.ALLERGIES}
          />
          
          {/* Champ texte libre si "Autres" est sélectionné */}
          {isOtherAllergySelected && (
            <div className="mt-3">
              <TextInput
                label="Précisez vos autres allergies"
                name="otherAllergies"
                value={formData.otherAllergies || ""}
                onChange={handleInputChange}
                placeholder="Ex: sulfites, céleri, lupin..."
                error={errors.otherAllergies}
              />
            </div>
          )}
        </div>

        {/* Disliked foods */}
        <TextInput
          label={FORM_LABELS.DISLIKED_FOODS}
          name="dislikedFoods"
          value={formData.dislikedFoods || ""}
          onChange={handleInputChange}
          placeholder={FORM_PLACEHOLDERS.DISLIKED_FOODS}
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
