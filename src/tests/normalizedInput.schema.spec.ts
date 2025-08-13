import { describe, it, expect } from "vitest";
import { normalizedInputSchema } from "../schemas/normalizedInput.schema";
import { normalizeFormInput } from "../schemas/normalizeFormInput";
import { setZodErrorMapFR, formatZodErrors } from "../schemas/zodErrorMap.fr";

setZodErrorMapFR();

function makeForm(overrides: Partial<any> = {}) {
  return {
    name: "Jean",
    age: 28,
    gender: "Homme",
    height_cm: 180,
    weight_kg: 75,
    diet_type: "Omnivore",
    protein_preference: ["Bœuf", "Boeuf", "Poisson", "poisson"],
    equipment: ["Four", "Four", "Mixeur/Blender"],
  cooking_level: "Intermédiaire : Je suis à l’aise, mais pas un chef non plus",
    nbRecipes: 4,
    nbPortions: 2,
    favourite_food: "pâtes, pizza",
    disliked_food: "chou, navet",
    batch: true,
    primaryGoal: "saveTime",
    secondaryFocus: null,
    physicalActivity: {
      deskJob: true,
      dailySteps: "<5k",
      sessionsPerWeek: "1-2",
      highIntensity: false,
    },
    allergies: "",
    agreed: true,
    email: "jean@example.com",
    ...overrides,
  };
}

describe("normalizedInputSchema integration", () => {
  it("happy path: form complet", () => {
    const form = makeForm();
    const candidate = normalizeFormInput(form);
    expect(() => normalizedInputSchema.parse(candidate)).not.toThrow();
  });

  it("email invalide → error sur email", () => {
    const form = makeForm({ email: "not-an-email" });
    const candidate = normalizeFormInput(form);
    try {
      normalizedInputSchema.parse(candidate);
      throw new Error("Should have failed");
    } catch (err: any) {
      const errors = formatZodErrors(err);
      expect(errors.fieldErrors.email?.[0]).toMatch(/email/i);
    }
  });

  it("nbRecipes=1 → error min", () => {
    const form = makeForm({ nbRecipes: 1 });
    const candidate = normalizeFormInput(form);
    try {
      normalizedInputSchema.parse(candidate);
      throw new Error("Should have failed");
    } catch (err: any) {
      const errors = formatZodErrors(err);
      expect(errors.fieldErrors.numRecipes?.[0]).toMatch(/min|petit/i);
    }
  });

  it("nbRecipes=8 → error max", () => {
    const form = makeForm({ nbRecipes: 8 });
    const candidate = normalizeFormInput(form);
    try {
      normalizedInputSchema.parse(candidate);
      throw new Error("Should have failed");
    } catch (err: any) {
      const errors = formatZodErrors(err);
      expect(errors.fieldErrors.numRecipes?.[0]).toMatch(/max|grand/i);
    }
  });

  it('gender="Autre" → unspecified', () => {
    const form = makeForm({ gender: "Autre" });
  const candidate = normalizeFormInput(form) as any;
  expect(candidate.gender).toBe("unspecified");
  expect(() => normalizedInputSchema.parse(candidate)).not.toThrow();
  });

  it("protein_preference avec doublons et accents → dédup + map correct", () => {
    const form = makeForm({ protein_preference: ["Bœuf", "Boeuf", "Poisson", "poisson"] });
  const candidate = normalizeFormInput(form) as any;
  expect(candidate.proteinPreferences).toEqual(["Beef", "Fish"]);
  });

  it("equipment avec doublons → dédup", () => {
    const form = makeForm({ equipment: ["Four", "Four", "Mixeur/Blender"] });
  const candidate = normalizeFormInput(form) as any;
  expect(candidate.equipmentAvailable).toEqual(["Oven", "Blender"]);
  });

  it("physicalActivity valeurs hors enum → error enum", () => {
    const form = makeForm({ physicalActivity: { deskJob: true, dailySteps: "test", sessionsPerWeek: "42", highIntensity: false } });
    const candidate = normalizeFormInput(form);
    try {
      normalizedInputSchema.parse(candidate);
      throw new Error("Should have failed");
    } catch (err: any) {
  const errors = formatZodErrors(err);
  const allFieldErrors = Object.values(errors.fieldErrors).flat();
  // Log pour audit si besoin
  // console.log(errors.fieldErrors);
  expect(allFieldErrors.length).toBeGreaterThan(0);
    }
  });

  it('allergies "lait, gluten, œufs" → allergens contient ["Milk","Gluten","Eggs"]', () => {
    const form = makeForm({ allergies: "lait, gluten, œufs" });
  const candidate = normalizeFormInput(form) as any;
  expect(candidate.allergens).toEqual(["Milk", "Gluten", "Eggs"]);
  });

  it("clé inconnue sneaky:x dans le candidat avant parse → .strict() la rejette", () => {
    const form = makeForm();
    const base = normalizeFormInput(form) as any;
    const candidate = { ...base, sneaky: "x" };
    try {
      normalizedInputSchema.parse(candidate);
      throw new Error("Should have failed");
    } catch (err: any) {
      const errors = formatZodErrors(err);
      expect(errors.formErrors[0]).toMatch(/clé non autorisée|unrecognized|strict/i);
    }
  });
});
