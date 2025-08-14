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
  // Step 1
  name?: string;
  email?: string;
  age?: string;
  gender?: string;
  height?: string;
  height_cm?: string; // Support both formats
  weight?: string;
  weight_kg?: string; // Support both formats
  physicalActivity?: PhysicalActivity;
  
  // Step 2
  diet?: string;
  allergens?: string[];
  proteinPreferences?: string[];
  dislikedFoods?: string;
  
  // Step 3
  equipmentAvailable?: string[];
  numRecipes?: string;
  numServings?: string;
  favoriteFoods?: string;
  cookingLevel?: string;
  
  // Step 4
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
  name?: string;
  email?: string;
  age?: string;
  gender?: string;
  height?: string;
  height_cm?: string;
  weight?: string;
  weight_kg?: string;
  physicalActivity?: PhysicalActivityErrors;
  [key: string]: string | PhysicalActivityErrors | undefined;
}
