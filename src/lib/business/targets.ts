import type { NormalizedInput } from "@/schemas";
import type { Targets } from "@/schemas";

import { clampActivityFactor } from "@/lib/constants/activityFactor";
import {
  MEAL_SHARE,
  TOLERANCE,
  PROTEIN_FLOOR,
  HIGH_PROTEIN_BONUS,
  BMR_FORMULA,
  GENDER_MALE,
} from "@/lib/constants/nutrition";

/**
 * Calcule le BMR (Basal Metabolic Rate) selon la formule Mifflin-St Jeor
 * 
 * @param gender - Genre ('male' ou autre)
 * @param weightKg - Poids en kilogrammes
 * @param heightCm - Taille en centimètres
 * @param age - Âge en années
 * @returns BMR en kcal/jour (arrondi)
 * 
 * @description
 * Formule Mifflin-St Jeor:
 * - Hommes: 10 × poids(kg) + 6.25 × taille(cm) - 5 × âge + 5
 * - Femmes: 10 × poids(kg) + 6.25 × taille(cm) - 5 × âge - 161
 */
function computeBMR(gender: string, weightKg: number, heightCm: number, age: number): number {
  return Math.round(
    gender === GENDER_MALE
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  );
}

/**
 * Calcule le TDEE (Total Daily Energy Expenditure)
 * 
 * @param bmr - Basal Metabolic Rate en kcal/jour
 * @param af - Facteur d'activité (Activity Factor)
 * @returns TDEE en kcal/jour (arrondi)
 */
function computeTDEE(bmr: number, af: number): number {
  return Math.round(bmr * af);
}

/**
 * Calcule l'objectif calorique quotidien selon l'objectif principal
 * 
 * @param primaryGoal - Objectif principal ('weightLoss', 'saveTime', 'eatHealthier')
 * @param tdee - TDEE en kcal/jour
 * @returns Objectif quotidien avec tolérance associée
 * 
 * @description
 * - Perte de poids: -15% du TDEE (déficit calorique)
 * - Autres objectifs: maintien du TDEE
 */
function computeDailyTarget(
  primaryGoal: string,
  tdee: number
): { kcal: number; tolerance: number } {
  if (primaryGoal === "weightLoss") {
    return { kcal: Math.round(tdee * 0.85), tolerance: TOLERANCE.weightLoss };
  }
  return { kcal: tdee, tolerance: TOLERANCE[primaryGoal as keyof typeof TOLERANCE] };
}

function computeMealTarget(dailyKcal: number): number {
  return Math.round(dailyKcal * MEAL_SHARE);
}

function computeMealWindow(mealKcal: number, tolerance: number): { min: number; max: number } {
  return {
    min: Math.floor(mealKcal * (1 - tolerance)),
    max: Math.ceil(mealKcal * (1 + tolerance)),
  };
}

function computeProteinFloor(primaryGoal: string, secondaryFocus: string | null): number {
  let floor = PROTEIN_FLOOR[primaryGoal as keyof typeof PROTEIN_FLOOR];
  if (secondaryFocus === "highProtein") floor += HIGH_PROTEIN_BONUS;
  return floor;
}

/**
 * Calcule tous les objectifs énergétiques et protéiques
 * 
 * Point d'entrée principal pour les calculs métaboliques de Quinoïa
 * 
 * @param input - Données utilisateur normalisées
 * @param activityFactor - Facteur d'activité calculé
 * @returns Objet complet avec tous les objectifs nutritionnels
 * 
 * @example
 * ```typescript
 * const targets = computeTargets(userInput, 1.5);
 * console.log(targets.bmr);              // 1650 kcal (BMR)
 * console.log(targets.tdee);             // 2475 kcal (TDEE)
 * console.log(targets.dailyEnergyTarget); // 2475 kcal (maintien) ou 2104 kcal (perte)
 * console.log(targets.mealEnergyTarget);  // ~866 kcal (35% du quotidien)
 * console.log(targets.proteinFloor);      // 25-35g selon objectif
 * ```
 * 
 * @description
 * Pipeline de calcul:
 * 1. BMR (Mifflin-St Jeor) selon genre/poids/taille/âge
 * 2. TDEE = BMR × facteur d'activité
 * 3. Objectif quotidien selon primaryGoal (-15% si perte de poids)
 * 4. Répartition repas (35% du quotidien)
 * 5. Fenêtre de tolérance selon objectif
 * 6. Seuil protéique avec bonus si focus protéines
 */
export function computeTargets(input: NormalizedInput, activityFactor: number): Targets {
  const af = clampActivityFactor(activityFactor);
  const { age, gender, heightCm, weightKg, primaryGoal, secondaryFocus } = input;
  const bmrKcal = computeBMR(gender, weightKg, heightCm, age);
  const tdeeKcal = computeTDEE(bmrKcal, af);
  const { kcal: dailyTargetKcal, tolerance: mealTolerancePct } = computeDailyTarget(
    primaryGoal,
    tdeeKcal
  );
  const mealTargetKcal = computeMealTarget(dailyTargetKcal);
  const { min: mealMinKcal, max: mealMaxKcal } = computeMealWindow(
    mealTargetKcal,
    mealTolerancePct
  );
  const proteinFloorG = computeProteinFloor(primaryGoal, secondaryFocus);

  return {
    formula: BMR_FORMULA,
    bmr: bmrKcal,
    activityFactor: af,
    tdee: tdeeKcal,
    dailyEnergyTarget: dailyTargetKcal,
    mealShare: MEAL_SHARE,
    mealEnergyTarget: mealTargetKcal,
    tolerancePct: mealTolerancePct,
    mealEnergyMin: mealMinKcal,
    mealEnergyMax: mealMaxKcal,
    proteinFloor: proteinFloorG,
  };
}
