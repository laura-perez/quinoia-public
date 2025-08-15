/**
 * Constantes contractuelles pour le payload API → n8n
 * Source: SPECS_MVP_QUINOIA v1.1
 */

export const CONTRACT_VERSION = "api_to_n8n.v1.1";

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
