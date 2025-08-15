import { describe, it, expect } from "vitest";
import { computeActivityFactor } from "../../lib/business/activityFactor";
import { computeTargets } from "../../lib/business/targets";
import { computeWindow } from "../../lib/business/windowCalculation";
import type { NormalizedInput } from "../../schemas";

describe("Cas d'ancrage specs - end to end", () => {
  it("Femme, 32 ans, 168 cm, 63 kg, weightLoss + highProtein", () => {
    // Input conforme au cas d'ancrage des specs
    const input: NormalizedInput = {
      email: "test@example.com",
      firstName: "Test",
      age: 32,
      gender: "female",
      heightCm: 168,
      weightKg: 63,
      diet: "omnivore",
      proteinPreferences: ["Poultry", "Fish"],
      equipmentAvailable: ["Oven"],
      cookingLevel: "intermediate",
      numRecipes: 5,
      numServings: 2,
      favoriteFoods: undefined,
      dislikedFoods: undefined,
      batchMode: true,
      primaryGoal: "weightLoss",
      secondaryFocus: "highProtein",
      activity: {
        deskJob: false,
        dailySteps: "5-8k",
        sessionsPerWeek: "1-2",
        highIntensity: false,
      },
      allergiesText: undefined,
      allergens: [],
      locale: "fr-FR",
      unitSystem: "metric",
      consent: true,
    };

    // Étape 1: Calcul activityFactor
    const activityFactor = computeActivityFactor(input.activity);
    expect(activityFactor).toBe(1.42); // Base 1.35 + dailySteps 0.02 + sessions 0.05

    // Étape 2: Calcul targets
    const targets = computeTargets(input, activityFactor);
    
    // Vérifications selon specs
    expect(targets.bmr).toBe(1359); // BMR femme
    expect(targets.activityFactor).toBe(1.42);
    expect(targets.tdee).toBe(1930); // round(1359 * 1.42) = 1929.78 -> 1930
    expect(targets.dailyEnergyTarget).toBe(1641); // round(1930 * 0.85) = 1640.5 -> 1641
    
    // Étape 3: Calcul window
    const window = computeWindow(targets.dailyEnergyTarget, "weightLoss", "highProtein");
    
    expect(window.mealTargetKcal).toBe(574); // round(1641 * 0.35) = 574.35 -> 574
    expect(window.mealMinKcal).toBe(516); // floor(574 * 0.9) = 516.6 -> 516
    expect(window.mealMaxKcal).toBe(632); // ceil(574 * 1.1) = 631.4 -> 632
    expect(window.proteinFloorG).toBe(40); // 35 + 5 pour highProtein
  });

  it("Homme, saveTime, pas highProtein", () => {
    const input: NormalizedInput = {
      email: "test@example.com",
      age: 35,
      gender: "male",
      heightCm: 180,
      weightKg: 75,
      primaryGoal: "saveTime",
      secondaryFocus: null,
      activity: {
        deskJob: true,
        dailySteps: "<5k",
        sessionsPerWeek: "0",
        highIntensity: false,
      },
      diet: "omnivore",
      proteinPreferences: [],
      equipmentAvailable: [],
      cookingLevel: "beginner",
      numRecipes: 3,
      numServings: 1,
      batchMode: false,
      allergiesText: undefined,
      allergens: [],
      locale: "fr-FR",
      unitSystem: "metric",
      consent: true,
    };

    const activityFactor = computeActivityFactor(input.activity);
    expect(activityFactor).toBe(1.35); // Base 1.35 - 0.05 sedentary penalty = 1.30, mais clampé à 1.35 minimum
    
    const targets = computeTargets(input, activityFactor);
    const window = computeWindow(targets.dailyEnergyTarget, "saveTime", null);
    
    // Vérifications cohérence
    expect(targets.dailyEnergyTarget).toBe(targets.tdee); // pas de réduction pour saveTime
    expect(window.proteinFloorG).toBe(25); // plancher saveTime sans bonus
    expect(window.mealTargetKcal).toBe(Math.round(targets.dailyEnergyTarget * 0.35));
  });
});
