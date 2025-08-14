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
  diet_type?: string; // Support both formats
  allergens?: string[];
  allergies?: string; // Support both formats
  proteinPreferences?: string[];
  protein_preference?: string[]; // Support both formats
  dislikedFoods?: string;
  disliked_food?: string; // Support both formats
  favourite_food?: string; // Support alternate format
  
  // Step 3
  cooking_level?: string; // User's cooking skill level
  equipmentAvailable?: string[];
  equipment?: string[]; // Support both formats
  numRecipes?: string;
  num_recipes?: string; // Support both formats
  nbRecipes?: string; // French naming convention
  numServings?: string;
  num_servings?: string; // Support both formats
  nbPortions?: string; // French naming convention
  favoriteFoods?: string;
  favorite_foods?: string; // Support both formats
  batch?: boolean; // Batch cooking preference
  
  // Step 4
  primaryGoal?: string; // Main user objective
  secondaryFocus?: string | null; // Secondary focus area
  note?: string; // User notes
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
  name?: string;
  email?: string;
  age?: string;
  gender?: string;
  height?: string;
  height_cm?: string;
  weight?: string;
  weight_kg?: string;
  diet_type?: string;
  cooking_level?: string;
  equipment?: string;
  nbRecipes?: string;
  nbPortions?: string;
  batch?: string;
  num_recipes?: string;
  num_servings?: string;
  favorite_foods?: string;
  primaryGoal?: string;
  secondaryFocus?: string;
  note?: string;
  consent?: string;
  physicalActivity?: PhysicalActivityErrors;
  [key: string]: string | PhysicalActivityErrors | undefined;
}
