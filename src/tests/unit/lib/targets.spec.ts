import { describe, it, expect } from "vitest";
import { computeTargets } from "../../../lib/targets";
import type { NormalizedInput } from "@/schemas";

describe("computeTargets", () => {
  it("Cas A: female, 70kg, 170cm, 30y, AF=1.55, goal=eatHealthier", () => {
    const input: NormalizedInput = {
      age: 30,
      gender: "female",
      heightCm: 170,
      weightKg: 70,
      primaryGoal: "eatHealthier",
      secondaryFocus: null,
      // ...autres champs requis, valeurs factices
      diet: "omnivore",
      proteinPreferences: [],
      equipmentAvailable: [],
      cookingLevel: "beginner",
      numRecipes: 3,
      numServings: 2,
      batchMode: false,
      activity: {
        deskJob: false,
        dailySteps: "5-8k",
        sessionsPerWeek: "1-2",
        highIntensity: false,
      },
      allergiesText: "",
      allergens: [],
      locale: "fr-FR",
      unitSystem: "metric",
      consent: true,
      email: "a@b.com",
      firstName: "A",
      favoriteFoods: "",
      dislikedFoods: "",
    };
    const targets = computeTargets(input, 1.55);
    expect(targets.bmr).toBe(1452);
    expect(targets.tdee).toBe(2251);
    expect(targets.dailyEnergyTarget).toBe(2251);
    expect(targets.mealEnergyTarget).toBe(788);
    expect(targets.mealEnergyMin).toBe(669);
    expect(targets.mealEnergyMax).toBe(907);
    expect(targets.proteinFloor).toBe(30);
    expect(targets.formula).toBe("Mifflin-St Jeor");
    expect(targets.activityFactor).toBe(1.55);
    expect(targets.mealShare).toBe(0.35);
    expect(targets.tolerancePct).toBe(0.15);
  });

  it("Cas B: male, 82kg, 180cm, 40y, AF=1.60, goal=weightLoss", () => {
    const input: NormalizedInput = {
      age: 40,
      gender: "male",
      heightCm: 180,
      weightKg: 82,
      primaryGoal: "weightLoss",
      secondaryFocus: null,
      diet: "omnivore",
      proteinPreferences: [],
      equipmentAvailable: [],
      cookingLevel: "beginner",
      numRecipes: 3,
      numServings: 2,
      batchMode: false,
      activity: {
        deskJob: false,
        dailySteps: "5-8k",
        sessionsPerWeek: "1-2",
        highIntensity: false,
      },
      allergiesText: "",
      allergens: [],
      locale: "fr-FR",
      unitSystem: "metric",
      consent: true,
      email: "a@b.com",
      firstName: "A",
      favoriteFoods: "",
      dislikedFoods: "",
    };
    const targets = computeTargets(input, 1.6);
    expect(targets.bmr).toBe(1750);
    expect(targets.tdee).toBe(2800);
    expect(targets.dailyEnergyTarget).toBe(2380);
    expect(targets.mealEnergyTarget).toBe(833);
    expect(targets.mealEnergyMin).toBe(749);
    expect(targets.mealEnergyMax).toBe(917);
    expect(targets.proteinFloor).toBe(35);
    expect(targets.formula).toBe("Mifflin-St Jeor");
    expect(targets.activityFactor).toBe(1.6);
    expect(targets.mealShare).toBe(0.35);
    expect(targets.tolerancePct).toBe(0.1);
  });

  it("Cas C: female, 55kg, 165cm, 28y, AF=1.35, goal=saveTime", () => {
    const input: NormalizedInput = {
      age: 28,
      gender: "female",
      heightCm: 165,
      weightKg: 55,
      primaryGoal: "saveTime",
      secondaryFocus: null,
      diet: "omnivore",
      proteinPreferences: [],
      equipmentAvailable: [],
      cookingLevel: "beginner",
      numRecipes: 3,
      numServings: 2,
      batchMode: false,
      activity: {
        deskJob: false,
        dailySteps: "5-8k",
        sessionsPerWeek: "1-2",
        highIntensity: false,
      },
      allergiesText: "",
      allergens: [],
      locale: "fr-FR",
      unitSystem: "metric",
      consent: true,
      email: "a@b.com",
      firstName: "A",
      favoriteFoods: "",
      dislikedFoods: "",
    };
    const targets = computeTargets(input, 1.35);
    expect(targets.bmr).toBe(1280);
    expect(targets.tdee).toBe(1728);
    expect(targets.dailyEnergyTarget).toBe(1728);
    expect(targets.mealEnergyTarget).toBe(605);
    expect(targets.mealEnergyMin).toBe(514);
    expect(targets.mealEnergyMax).toBe(696);
    expect(targets.proteinFloor).toBe(25);
    expect(targets.formula).toBe("Mifflin-St Jeor");
    expect(targets.activityFactor).toBe(1.35);
    expect(targets.mealShare).toBe(0.35);
    expect(targets.tolerancePct).toBe(0.15);
  });

  it("Cas A highProtein: +5g protein floor", () => {
    const input: NormalizedInput = {
      age: 30,
      gender: "female",
      heightCm: 170,
      weightKg: 70,
      primaryGoal: "eatHealthier",
      secondaryFocus: "highProtein",
      diet: "omnivore",
      proteinPreferences: [],
      equipmentAvailable: [],
      cookingLevel: "beginner",
      numRecipes: 3,
      numServings: 2,
      batchMode: false,
      activity: {
        deskJob: false,
        dailySteps: "5-8k",
        sessionsPerWeek: "1-2",
        highIntensity: false,
      },
      allergiesText: "",
      allergens: [],
      locale: "fr-FR",
      unitSystem: "metric",
      consent: true,
      email: "a@b.com",
      firstName: "A",
      favoriteFoods: "",
      dislikedFoods: "",
    };
    const targets = computeTargets(input, 1.55);
    expect(targets.proteinFloor).toBe(35);
  });

  it("Cas A unspecified: gender conservatif", () => {
    const input: NormalizedInput = {
      age: 30,
      gender: "unspecified",
      heightCm: 170,
      weightKg: 70,
      primaryGoal: "eatHealthier",
      secondaryFocus: null,
      diet: "omnivore",
      proteinPreferences: [],
      equipmentAvailable: [],
      cookingLevel: "beginner",
      numRecipes: 3,
      numServings: 2,
      batchMode: false,
      activity: {
        deskJob: false,
        dailySteps: "5-8k",
        sessionsPerWeek: "1-2",
        highIntensity: false,
      },
      allergiesText: "",
      allergens: [],
      locale: "fr-FR",
      unitSystem: "metric",
      consent: true,
      email: "a@b.com",
      firstName: "A",
      favoriteFoods: "",
      dislikedFoods: "",
    };
    const targets = computeTargets(input, 1.55);
    expect(targets.bmr).toBe(1452);
  });
});
