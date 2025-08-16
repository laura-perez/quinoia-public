import React from 'react';

/**
 * Physical activity data structure
 */
export interface PhysicalActivity {
  deskJob: boolean | null;
  dailySteps: string | null;
  sessionsPerWeek: string | null;
  highIntensity: boolean | null;
}

/**
 * Form data structure shared across all steps
 */
export interface FormData {
  // Step 1 - Personal Information
  name?: string;
  email?: string;
  age?: string;
  gender?: string;
  heightCm?: string;
  weightKg?: string;
  physicalActivity?: PhysicalActivity;
  
  // Step 2 - Dietary Preferences
  dietType?: string;
  allergens?: string; // Text input for allergies
  proteinPreferences?: string[];
  dislikedFoods?: string;
  favoriteFoods?: string;
  
  // Step 3 - Cooking Preferences
  cookingLevel?: string;
  equipmentAvailable?: string[];
  numRecipes?: string;
  numServings?: string;
  batchMode?: boolean;
  
  // Step 4 - Goals and Consent
  primaryGoal?: string;
  secondaryFocus?: string | null;
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
 * Physical activity errors structure
 */
export interface PhysicalActivityErrors {
  deskJob?: string;
  dailySteps?: string;
  sessionsPerWeek?: string;
  highIntensity?: string;
}

/**
 * Validation errors structure
 */
export interface FormErrors {
  // Step 1 errors
  name?: string;
  email?: string;
  age?: string;
  gender?: string;
  heightCm?: string;
  weightKg?: string;
  physicalActivity?: PhysicalActivityErrors;
  
  // Step 2 errors
  dietType?: string;
  allergens?: string;
  proteinPreferences?: string;
  dislikedFoods?: string;
  favoriteFoods?: string;
  
  // Step 3 errors
  cookingLevel?: string;
  equipmentAvailable?: string;
  numRecipes?: string;
  numServings?: string;
  batchMode?: string;
  
  // Step 4 errors
  primaryGoal?: string;
  secondaryFocus?: string;
  note?: string;
  consent?: string;
  
  [key: string]: string | PhysicalActivityErrors | undefined;
}
