import React, { useState, useEffect } from "react";
import RadioGroup from "./form-components/RadioGroup";
import ProgressBar from "./form-components/ProgressBar";
import CheckboxGroup from "./form-components/CheckboxGroup";
import { FormStepProps } from "./types";
import {
  FORM_LABELS,
  COOKING_LEVELS,
  EQUIPMENT_OPTIONS,
  PORTION_COUNTS,
  getRecipeCountOptions,
  getPremiumOnlyRecipeCounts
} from "../../lib/constants";
import { useFormStep, useFormValidation, useFormHandlers } from "./hooks";

export default function Step3({ formData, updateFormData, goToNext, goToPrev, email, isLast, isPremium = false }: FormStepProps) {
  const { errors, clearFieldError, setValidationErrors } = useFormStep();
  const { validateRequiredFields, hasValidationErrors } = useFormValidation();
  const { handleInputChange, createCheckboxArrayHandler, createBooleanRadioHandler } = useFormHandlers(updateFormData, clearFieldError);
  const [hoveredPremium, setHoveredPremium] = useState<number | null>(null);

  // Recipe count options - dynamic based on premium status
  const RECIPE_COUNTS = getRecipeCountOptions(isPremium);
  const PREMIUM_RECIPE_COUNTS = getPremiumOnlyRecipeCounts(isPremium);

  // Initialize default values when component mounts
  useEffect(() => {
    // Set default values if they don't exist
    if (!formData.numRecipes) {
      updateFormData({ numRecipes: "3" });
    }
    if (!formData.numServings) {
      updateFormData({ numServings: "2" });
    }
  }, [formData.numRecipes, formData.numServings, updateFormData]); // Include dependencies

  // Equipment checkbox handler
  const handleCheckboxChange = createCheckboxArrayHandler(
    'equipmentAvailable',
    () => formData.equipmentAvailable || []
  );


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

        {/* Number of recipes section */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">
            Combien de recettes veux tu cette semaine ?
          </label>
          {/* Debug: {hoveredPremium && `Hovering: ${hoveredPremium}`} */}
          <div className="flex flex-wrap gap-3">
            {/* Free options - functional radio buttons */}
            {RECIPE_COUNTS.map((option) => {
              const optionStr = String(option);
              const isSelected = (formData.numRecipes || "3") === optionStr;
              return (
                <label
                  key={optionStr}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
                    isSelected
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#F4C95D]"
                  }`}
                >
                  <input
                    type="radio"
                    name="numRecipes"
                    value={optionStr}
                    checked={isSelected}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  {optionStr}
                </label>
              );
            })}
            
            {/* Premium options - fake buttons with tooltip */}
            {PREMIUM_RECIPE_COUNTS.map((option) => (
              <div key={option} className="relative">
                <div
                  className="cursor-not-allowed rounded-lg border px-4 py-2 text-sm bg-gray-100 text-gray-400 border-gray-200 inline-block"
                  onMouseEnter={() => setHoveredPremium(option)}
                  onMouseLeave={() => setHoveredPremium(null)}
                >
                  {option}
                </div>
                
                {/* Tooltip */}
                {hoveredPremium === option && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded-md py-2 px-3 whitespace-nowrap shadow-lg">
                      Premium 👑
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {errors.numRecipes && (
            <p className="text-sm text-red-500 mt-2">{errors.numRecipes}</p>
          )}
        </div>

        {/* Number of portions radio group */}
        <RadioGroup
          name="numServings"
          options={PORTION_COUNTS}
          value={formData.numServings || "2"}
          onChange={handleInputChange}
          error={errors.numServings}
          label="Combien de portions par recette ?"
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
