/**
 * Calcul de la fenêtre énergétique et protéique pour un repas
 * Conforme aux specs QUINOIA v1.1 section 4.3
 */
import type { NormalizedInput } from "@/schemas";
import {
  MEAL_SHARE,
  TOLERANCE_BY_GOAL,
  PROTEIN_FLOOR_BY_GOAL,
  HIGH_PROTEIN_BONUS,
} from "@/config/contracts";

export interface WindowCalculationResult {
  mealMinKcal: number;
  mealMaxKcal: number;
  mealTargetKcal: number;
  proteinFloorG: number;
}

/**
 * Calcule la fenêtre énergétique et protéique d'un repas
 * @param dailyTargetKcal - Cible quotidienne en kcal
 * @param primaryGoal - Objectif principal (détermine la tolérance)
 * @param secondaryFocus - Focus secondaire (highProtein ajoute +5g)
 * @returns Fenêtre complète pour le payload n8n
 */
export function computeWindow(
  dailyTargetKcal: number,
  primaryGoal: keyof typeof TOLERANCE_BY_GOAL,
  secondaryFocus: string | null
): WindowCalculationResult {
  // Calcul de la cible repas (35% du quotidien)
  const mealTargetKcal = Math.round(dailyTargetKcal * MEAL_SHARE);
  
  // Récupération de la tolérance selon l'objectif
  const tolerancePct = TOLERANCE_BY_GOAL[primaryGoal];
  
  // Calcul des bornes avec floor/ceil selon specs
  const mealMinKcal = Math.floor(mealTargetKcal * (1 - tolerancePct));
  const mealMaxKcal = Math.ceil(mealTargetKcal * (1 + tolerancePct));
  
  // Calcul du plancher protéique
  let proteinFloorG = PROTEIN_FLOOR_BY_GOAL[primaryGoal];
  if (secondaryFocus === "highProtein") {
    proteinFloorG += HIGH_PROTEIN_BONUS;
  }
  
  return {
    mealMinKcal,
    mealMaxKcal,
    mealTargetKcal,
    proteinFloorG,
  };
}
