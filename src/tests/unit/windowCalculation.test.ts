import { describe, it, expect } from "vitest";
import { computeWindow } from "../../lib/business/windowCalculation";
import {
  MEAL_SHARE,
  TOLERANCE_BY_GOAL,
  PROTEIN_FLOOR_BY_GOAL,
  HIGH_PROTEIN_BONUS,
} from "../../config/contracts";

describe("computeWindow", () => {
  it("saveTime: calculs corrects", () => {
    const result = computeWindow(2000, "saveTime", null);
    
    const expectedTarget = Math.round(2000 * MEAL_SHARE); // 700
    const expectedMin = Math.floor(expectedTarget * (1 - TOLERANCE_BY_GOAL.saveTime)); // floor(700 * 0.85) = 595
    const expectedMax = Math.ceil(expectedTarget * (1 + TOLERANCE_BY_GOAL.saveTime)); // ceil(700 * 1.15) = 805
    
    expect(result.mealTargetKcal).toBe(expectedTarget);
    expect(result.mealMinKcal).toBe(expectedMin);
    expect(result.mealMaxKcal).toBe(expectedMax);
    expect(result.proteinFloorG).toBe(PROTEIN_FLOOR_BY_GOAL.saveTime);
  });

  it("eatHealthier: calculs corrects", () => {
    const result = computeWindow(2000, "eatHealthier", null);
    
    const expectedTarget = Math.round(2000 * MEAL_SHARE); // 700
    const expectedMin = Math.floor(expectedTarget * (1 - TOLERANCE_BY_GOAL.eatHealthier)); // floor(700 * 0.85) = 595
    const expectedMax = Math.ceil(expectedTarget * (1 + TOLERANCE_BY_GOAL.eatHealthier)); // ceil(700 * 1.15) = 805
    
    expect(result.mealTargetKcal).toBe(expectedTarget);
    expect(result.mealMinKcal).toBe(expectedMin);
    expect(result.mealMaxKcal).toBe(expectedMax);
    expect(result.proteinFloorG).toBe(PROTEIN_FLOOR_BY_GOAL.eatHealthier);
  });

  it("weightLoss: tolérance plus stricte", () => {
    const result = computeWindow(1800, "weightLoss", null);
    
    const expectedTarget = Math.round(1800 * MEAL_SHARE); // 630
    const expectedMin = Math.floor(expectedTarget * (1 - TOLERANCE_BY_GOAL.weightLoss)); // floor(630 * 0.9) = 567
    const expectedMax = Math.ceil(expectedTarget * (1 + TOLERANCE_BY_GOAL.weightLoss)); // ceil(630 * 1.1) = 693
    
    expect(result.mealTargetKcal).toBe(expectedTarget);
    expect(result.mealMinKcal).toBe(expectedMin);
    expect(result.mealMaxKcal).toBe(expectedMax);
    expect(result.proteinFloorG).toBe(PROTEIN_FLOOR_BY_GOAL.weightLoss);
  });

  it("highProtein: bonus +5g", () => {
    const result = computeWindow(2000, "saveTime", "highProtein");
    
    expect(result.proteinFloorG).toBe(PROTEIN_FLOOR_BY_GOAL.saveTime + HIGH_PROTEIN_BONUS);
  });

  it("secondaryFocus autre que highProtein: pas de bonus", () => {
    const result = computeWindow(2000, "saveTime", "autres");
    
    expect(result.proteinFloorG).toBe(PROTEIN_FLOOR_BY_GOAL.saveTime);
  });

  it("cas d'ancrage specs: femme weightLoss highProtein", () => {
    // Input de l'exemple specs:
    // dailyTarget = 1639 (TDEE 1928 * 0.85)
    const result = computeWindow(1639, "weightLoss", "highProtein");
    
    const expectedTarget = Math.round(1639 * 0.35); // 574
    const expectedMin = Math.floor(574 * 0.9); // 516
    const expectedMax = Math.ceil(574 * 1.1); // 631
    const expectedProtein = 35 + 5; // 40g
    
    expect(result.mealTargetKcal).toBe(expectedTarget);
    expect(result.mealMinKcal).toBe(expectedMin);
    expect(result.mealMaxKcal).toBe(expectedMax);
    expect(result.proteinFloorG).toBe(expectedProtein);
  });
});
