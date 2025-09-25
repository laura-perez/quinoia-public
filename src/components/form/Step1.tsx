import React from "react";
import RadioGroup from "./form-components/RadioGroup";
import ProgressBar from "./form-components/ProgressBar";
import TextInput from "./form-components/TextInput";
import type { FormStepProps } from "./types";
import { VALIDATION_MESSAGES, FORM_LABELS, FORM_PLACEHOLDERS } from "../../lib/constants/ui";
import { useFormStep, useFormValidation, useFormHandlers } from "./hooks";


const GENDER_OPTIONS = ["Femme", "Homme", "Pas précisé"];

/**
 * Step 1: User profile and physical activity form.
 */
export default function Step1({ formData, updateFormData, goToNext, goToPrev, email, isLast }: FormStepProps) {
  const { errors, clearFieldError, setValidationErrors } = useFormStep();
  const { validateRequiredFields, hasValidationErrors } = useFormValidation();
  const { handleInputChange } = useFormHandlers(updateFormData, clearFieldError);

  // Main submit handler
  const handleSubmit = () => {
    const basicErrors = validateRequiredFields(formData as Record<string, unknown>, ['name', 'age', 'gender']);

    if (hasValidationErrors(basicErrors)) {
      setValidationErrors(basicErrors);
      return;
    }

    goToNext();
  };

  return (
    <div>
      <ProgressBar step={1} total={4} />

      <h2 className="text-2xl font-bold text-[#414535] mb-2">Faisons connaissance !</h2>
      <p className="text-[#8A8A8A] mb-6">
        Juste quelques informations pour personnaliser ton expérience.
      </p>

      <div className="space-y-6">
        <TextInput
          label="Comment t'appelles-tu ?"
          name="name"
          value={formData.name || ""}
          onChange={handleInputChange}
          error={errors.name}
          placeholder="Prénom"
        />
        <TextInput
          label="Quel âge as-tu ?"
          name="age"
          value={formData.age || ""}
          onChange={handleInputChange}
          error={errors.age} 
          placeholder="Âge"
          type="number"
        />
        <RadioGroup
          name="gender"
          options={GENDER_OPTIONS}
          value={formData.gender || ""}
          onChange={handleInputChange}
          error={errors.gender}
          label={FORM_LABELS.GENDER}
          optionClassName="flex-1 text-center font-medium"
        />
      </div>

      {/* Next button aligned right */}
      <div className="mt-8 flex justify-end">
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
