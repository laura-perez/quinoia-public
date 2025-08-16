/**
 * UI Constants - Magic numbers and strings used across components
 */

// Scroll behavior constants
export const SCROLL_BEHAVIOR = {
  TOP: 0,
  BEHAVIOR: "smooth" as const,
} as const;

// Precision constants for calculations
export const PRECISION = {
  DECIMAL_PLACES: 2,
  MULTIPLICATION_FACTOR: 100,
} as const;

// Form validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: "Ce champ est requis",
  INVALID_EMAIL: "Email invalide",
  INVALID_FORMAT: "Format invalide",
} as const;

// Form labels
export const FORM_LABELS = {
  // Step 1 labels
  AGE: "Quel est ton âge ?",
  GENDER: "Quel est ton genre ?",
  HEIGHT: "Taille (cm)",
  WEIGHT: "Poids (kg)",
  PHYSICAL_ACTIVITY: "Activité physique",
  
  // Step 2 labels
  DIET_TYPE: "Quel est ton type d'alimentation ?",
  PROTEIN_PREFERENCES: "Quels types de protéines aimes-tu consommer ?",
  ALLERGIES: "As-tu des allergies ou intolérances ?",
  DISLIKED_FOODS: "Des aliments que tu n'aimes pas ?",
  FAVORITE_FOODS: "À l'inverse, des aliments que tu adores ?",
  
  // Step 3 labels  
  COOKING_LEVEL: "Quel est ton niveau en cuisine ?",
  EQUIPMENT: "Quels équipements de cuisine as-tu ?",
  NUM_RECIPES: "Combien de recettes veux tu cette semaine ?",
  NUM_SERVINGS: "Combien de portions par recette ?",
  BATCH_MODE: "Souhaites-tu recevoir des conseils en batch cooking ?",
  
  // Step 4 labels
  PRIMARY_GOAL: "Quel est ton objectif principal avec ce menu ?",
  SECONDARY_FOCUS: "Un objectif secondaire ?",
  NOTES: "Des notes ou préférences particulières ?",
  CONSENT: "J'accepte les conditions d'utilisation",
} as const;

// Form placeholders
export const FORM_PLACEHOLDERS = {
  
  HEIGHT: "cm",
  WEIGHT: "kg",
  ALLERGIES: "Ex : lactose, noix, gluten...",
  DISLIKED_FOODS: "Ex : tofu, lentilles, fenouil…",
  FAVORITE_FOODS: "Ex : tomates, poulet, pâtes…",
  NOTES: "Précise tes besoins, contraintes ou préférences...",
} as const;

// Navigation button text
export const BUTTON_TEXT = {
  NEXT: "Suivant",
  PREVIOUS: "Précédent", 
  SUBMIT: "Générer mon menu",
  CONTINUE: "Continuer",
} as const;

// Helper function for smooth scrolling to top
export const scrollToTop = () => {
  window.scrollTo({ 
    top: SCROLL_BEHAVIOR.TOP, 
    behavior: SCROLL_BEHAVIOR.BEHAVIOR 
  });
};

// Helper function for rounding to specific decimal places
export const roundToPrecision = (value: number, decimalPlaces = PRECISION.DECIMAL_PLACES): number => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(value * factor) / factor;
};