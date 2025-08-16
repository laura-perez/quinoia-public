import React from "react";
import RadioGroup from "./form-components/RadioGroup";
import ProgressBar from "./form-components/ProgressBar";
import CheckboxGroup from "./form-components/CheckboxGroup";
import { FormStepProps } from "./types";
import { FORM_LABELS } from "../../lib/constants/ui";
import { useFormStep, useFormValidation, useFormHandlers } from "./hooks";

// Cooking level options
const COOKING_LEVELS = [
  "Débutant : Je veux juste que ce soit simple et rapide",
  "Intermédiaire : Je suis à l’aise, mais pas un chef non plus",
  "Confirmé : Cuisiner, c’est mon terrain de jeu",
];

// Equipment options
const EQUIPMENT_OPTIONS = ["Four", "Mixeur/Blender", "Thermomix", "Air Fryer"];

// Recipe and portion count options
const RECIPE_COUNTS = [2, 3, 4, 5, 6, 7];
const PORTION_COUNTS = [1, 2, 3, "4+"];

export default function Step3({ formData, updateFormData, goToNext, goToPrev, email, isLast }: FormStepProps) {
  const { errors, clearFieldError, setValidationErrors } = useFormStep();
  const { validateRequiredFields, hasValidationErrors } = useFormValidation();
  const { handleInputChange, createCheckboxArrayHandler, createBooleanRadioHandler } = useFormHandlers(updateFormData, clearFieldError);

  // Equipment checkbox handler
  const handleCheckboxChange = createCheckboxArrayHandler(
    'equipmentAvailable',
    () => formData.equipmentAvailable || []
  );

  // Batch mode boolean handler
  const handleBatchModeChange = createBooleanRadioHandler('batchMode');

  // Validate and submit
  const handleSubmit = () => {
    const validationErrors = validateRequiredFields(formData as Record<string, unknown>, ['cookingLevel', 'numRecipes', 'numServings']);
    
    if (hasValidationErrors(validationErrors)) {
      setValidationErrors(validationErrors);
      return;
    }
    
    goToNext();
  };

  // Main render
  return (
    <div>
      <ProgressBar step={3} total={4} />

      <h2 className="text-2xl font-bold text-[#414535] mb-2">Ton quotidien en cuisine</h2>
      <p className="text-[#8A8A8A] mb-6">
        Ici, pas de jugement – je veux juste m’adapter à ta réalité : ton emploi du temps, ton
        niveau, ton style de vie.
      </p>

      <div className="space-y-6">
        {/* Cooking level radio group */}
        <RadioGroup
          name="cookingLevel"
          options={COOKING_LEVELS}
          value={formData.cookingLevel || ""}
          onChange={handleInputChange}
          error={errors.cookingLevel}
          label={FORM_LABELS.COOKING_LEVEL}
        />

        {/* Equipment checkbox group */}
        <CheckboxGroup
          name="equipmentAvailable"
          options={EQUIPMENT_OPTIONS}
          values={formData.equipmentAvailable || []}
          onChange={handleCheckboxChange}
          label={FORM_LABELS.EQUIPMENT}
        />

        {/* Number of recipes radio group */}
        <RadioGroup
          name="numRecipes"
          options={RECIPE_COUNTS}
          value={formData.numRecipes || ""}
          onChange={handleInputChange}
          error={errors.numRecipes}
          label="Combien de recettes veux tu cette semaine ?"
        />

        {/* Number of portions radio group */}
        <RadioGroup
          name="numServings"
          options={PORTION_COUNTS}
          value={formData.numServings || ""}
          onChange={handleInputChange}
          error={errors.numServings}
          label="Combien de portions par recette ?"
        />

        {/* Batch cooking radio group */}
        <RadioGroup
          name="batchMode"
          label="Souhaites-tu recevoir des conseils en batch cooking ?"
          options={["Oui", "Non"]}
          value={formData.batchMode === true ? "Oui" : formData.batchMode === false ? "Non" : ""}
          onChange={handleBatchModeChange}
          optionClassName="flex-1 text-center font-medium"
        />
        <div className="text-xs text-[#8A8A8A] mt-1">
          💡 Le batch cooking, c’est une méthode pour s'organiser en avance, cuisiner plusieurs
          plats d’un coup, puis assembler ou réchauffer facilement la semaine.
        </div>
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
