/**
 * Constantes nutritionnelles et métaboliques
 * Source: SPECS_MVP_QUINOIA v3.0
 */

// Fenêtre repas : 35% de l'apport quotidien
export const MEAL_SHARE = 0.35;

// Tolérance par objectif principal
export const TOLERANCE_BY_GOAL = {
  saveTime: 0.15,      // ±15%
  eatHealthier: 0.15,  // ±15%
  weightLoss: 0.10,    // ±10%
} as const;

// Plancher protéique par objectif (grammes)
export const PROTEIN_FLOOR_BY_GOAL = {
  saveTime: 25,        // 25g minimum
  eatHealthier: 30,    // 30g minimum
  weightLoss: 35,      // 35g minimum
} as const;

// Bonus protéique si secondaryFocus = highProtein
export const HIGH_PROTEIN_BONUS = 5; // +5g

// Facteur de réduction pour weightLoss
export const WEIGHT_LOSS_FACTOR = 0.85; // -15% du TDEE
