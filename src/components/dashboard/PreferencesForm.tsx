/**
 * PreferencesForm - Inline form to edit user dietary preferences
 * Reuses Step2 and Step3 onboarding components in a single-page layout
 */

import React, { useState, useEffect } from 'react';
import RadioGroup from '../form/form-components/RadioGroup';
import CheckboxGroup from '../form/form-components/CheckboxGroup';
import TextInput from '../form/form-components/TextInput';
import { useFormHandlers, useFormValidation } from '../form/hooks';
import type { FormData } from '../form/types';
import {
  DIET_OPTIONS,
  PROTEIN_OPTIONS,
  ALLERGY_OPTIONS,
  COOKING_LEVELS,
  EQUIPMENT_OPTIONS,
  PORTION_COUNTS,
  getRecipeCountOptions,
  getPremiumOnlyRecipeCounts
} from '@/lib/constants';

interface PreferencesFormProps {
  initialData: FormData;
  onSave: (data: FormData) => Promise<void>;
  isPremium: boolean;
}

export function PreferencesForm({ initialData, onSave, isPremium }: PreferencesFormProps) {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [hoveredPremium, setHoveredPremium] = useState<number | null>(null);

  const { validateRequiredFields, hasValidationErrors } = useFormValidation();

  // Update formData when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const { handleInputChange, createCheckboxArrayHandler } = useFormHandlers(updateFormData, clearFieldError);

  // Recipe count options - dynamic based on premium status
  const RECIPE_COUNTS = getRecipeCountOptions(isPremium);
  const PREMIUM_RECIPE_COUNTS = getPremiumOnlyRecipeCounts(isPremium);

  // Checkbox handlers
  const handleProteinCheckbox = createCheckboxArrayHandler(
    'proteinPreferences',
    () => formData.proteinPreferences || []
  );

  const handleEquipmentCheckbox = createCheckboxArrayHandler(
    'equipmentAvailable',
    () => formData.equipmentAvailable || []
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

  // Submit handler
  const handleSubmit = async () => {
    // Validate required fields
    const validationErrors = validateRequiredFields(formData as Record<string, unknown>, [
      'dietType',
      'cookingLevel',
      'numRecipes',
      'numServings'
    ]);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      setErrors({});
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Info message */}
      <div className="bg-[#FFF6DC] border border-[#F4C95D] rounded-lg p-4">
        <p className="text-sm text-[#414535]">
          Tes préférences seront prises en compte dès ton prochain menu.
        </p>
      </div>

      {/* Step 2 Fields - Dietary Preferences */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-[#414535]">Préférences alimentaires</h3>

        <RadioGroup
          name="dietType"
          options={DIET_OPTIONS}
          value={formData.dietType || ""}
          onChange={handleInputChange}
          error={errors.dietType}
          label="Quel est ton régime alimentaire ?"
          optionClassName="flex-1 text-center font-medium"
        />

        <CheckboxGroup
          name="proteinPreferences"
          options={PROTEIN_OPTIONS}
          values={formData.proteinPreferences || []}
          onChange={handleProteinCheckbox}
          label="Quelles protéines veux-tu retrouver dans tes recettes ?"
        />

        <div>
          <CheckboxGroup
            name="allergens"
            options={ALLERGY_OPTIONS.map(a => a.label)}
            values={formData.allergens || ["Aucune"]}
            onChange={handleAllergiesChange}
            label="As-tu des allergies ou intolérances alimentaires ?"
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
              />
            </div>
          )}
        </div>

        <TextInput
          label="Y a-t-il des aliments que tu n'aimes vraiment pas ?"
          name="dislikedFoods"
          value={formData.dislikedFoods || ""}
          onChange={handleInputChange}
          placeholder="Ex : aubergine, coriandre..."
        />
      </div>

      {/* Step 3 Fields - Cooking Preferences */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-[#414535]">Quotidien en cuisine</h3>

        <RadioGroup
          name="cookingLevel"
          options={COOKING_LEVELS}
          value={formData.cookingLevel || ""}
          onChange={handleInputChange}
          error={errors.cookingLevel}
          label="Quel est ton niveau en cuisine ?"
        />

        <CheckboxGroup
          name="equipmentAvailable"
          options={EQUIPMENT_OPTIONS}
          values={formData.equipmentAvailable || []}
          onChange={handleEquipmentCheckbox}
          label="Quels équipements as-tu à disposition ?"
        />

        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">
            Combien de recettes veux-tu cette semaine ?
          </label>
          <div className="flex flex-wrap gap-3">
            {/* Free/Premium options - functional radio buttons */}
            {RECIPE_COUNTS.map((count) => {
              const countStr = String(count);
              const isSelected = (formData.numRecipes || "3") === countStr;
              return (
                <label
                  key={countStr}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
                    isSelected
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#F4C95D]"
                  }`}
                >
                  <input
                    type="radio"
                    name="numRecipes"
                    value={countStr}
                    checked={isSelected}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  {countStr}
                </label>
              );
            })}

            {/* Premium-only options - fake buttons with tooltip */}
            {PREMIUM_RECIPE_COUNTS.map((count) => (
              <div key={count} className="relative">
                <div
                  className="cursor-not-allowed rounded-lg border px-4 py-2 text-sm bg-gray-100 text-gray-400 border-gray-200 inline-block"
                  onMouseEnter={() => setHoveredPremium(count)}
                  onMouseLeave={() => setHoveredPremium(null)}
                >
                  {count}
                </div>

                {/* Tooltip */}
                {hoveredPremium === count && (
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
          {errors.numRecipes && <p className="text-red-600 text-sm mt-1">{errors.numRecipes}</p>}
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

      {/* Submit Button */}
      <div className="pt-4 border-t border-[#EAEAEA]">
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full bg-[#F4C95D] text-[#414535] py-3 rounded-lg font-semibold hover:bg-[#E5B84A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer mes préférences'}
        </button>
      </div>
    </div>
  );
}
