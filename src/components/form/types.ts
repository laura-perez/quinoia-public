import React from 'react';


/**
 * Form data structure shared across all steps
 */
export interface FormData {
  // Step 1 - Personal Information
  name?: string;
  age?: string;
  email?: string;
  gender?: string;

  // Step 2 - Dietary Preferences
  dietType?: string;
  proteinPreferences?: string[];
  allergens?: string; // Text input for allergies
  dislikedFoods?: string;
  favoriteFoods?: string;

  // Step 3 - Cooking Preferences
  cookingLevel?: string;
  equipmentAvailable?: string[];
  numRecipes?: string;
  numServings?: string;
  batchMode?: boolean;

  // Step 4 - Consent
  note?: string;
  consent?: boolean;
}

/**
 * Common props for form steps
 */
export interface FormStepProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  goToNext: () => void;
  goToPrevious?: () => void;
  goToPrev?: () => void; // Support both naming conventions
  email?: string; // Email prop passed from parent
  isLast?: boolean; // Whether this is the last step
}


/**
 * Validation errors structure
 */
export interface FormErrors {
  // Step 1 errors
  name?: string;
  age?: string;
  email?: string;
  gender?: string;

  // Step 2 errors
  dietType?: string;
  proteinPreferences?: string;
  allergens?: string;
  dislikedFoods?: string;
  favoriteFoods?: string;

  // Step 3 errors
  cookingLevel?: string;
  equipmentAvailable?: string;
  numRecipes?: string;
  numServings?: string;
  batchMode?: string;

  // Step 4 errors
  note?: string;
  consent?: string;

  [key: string]: string | undefined;
}
