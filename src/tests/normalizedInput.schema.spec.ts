import { describe, it, expect } from "vitest";
import { normalizedInputSchema } from "../schemas/normalizedInput.schema";
import { normalizeFormInput, type NormalizedFormOutput } from "../schemas/normalizeFormInput";
import { setZodErrorMapFR, formatZodErrors } from "../schemas/zodErrorMap.fr";

setZodErrorMapFR();

function makeForm(overrides: Partial<any> = {}) {
  return {
    name: "Jean",
    age: 28,
    gender: "Homme",
    heightCm: 180,
    weightKg: 75,
    dietType: "Omnivore",
    proteinPreferences: ["Bœuf", "Boeuf", "Poisson", "poisson"],
    equipmentAvailable: ["Four", "Four", "Mixeur/Blender"],
    cookingLevel: "Intermédiaire : Je suis à l'aise, mais pas un chef non plus",
    numRecipes: 4,
    numServings: 2,
    favoriteFoods: "pâtes, pizza",
    dislikedFoods: "chou, navet",
    batchMode: true,
    primaryGoal: "saveTime",
    secondaryFocus: null,
    physicalActivity: {
      deskJob: true,
      dailySteps: "<5k",
      sessionsPerWeek: "1-2",
      highIntensity: false,
    },
    allergies: "",
    consent: true,
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

  it("numRecipes=1 → error min", () => {
    const form = makeForm({ numRecipes: 1 });
    const candidate = normalizeFormInput(form);
    try {
      normalizedInputSchema.parse(candidate);
      throw new Error("Should have failed");
    } catch (err: any) {
      const errors = formatZodErrors(err);
      expect(errors.fieldErrors.numRecipes?.[0]).toMatch(/min|petit/i);
    }
  });

  it("numRecipes=8 → error max", () => {
    const form = makeForm({ numRecipes: 8 });
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
    const candidate: NormalizedFormOutput = normalizeFormInput(form);
    expect(candidate.gender).toBe("unspecified");
    expect(() => normalizedInputSchema.parse(candidate)).not.toThrow();
  });

  it("proteinPreferences avec doublons et accents → dédup + map correct", () => {
    const form = makeForm({ proteinPreferences: ["Bœuf", "Boeuf", "Poisson", "poisson"] });
    const candidate: NormalizedFormOutput = normalizeFormInput(form);
    expect(candidate.proteinPreferences).toEqual(["Beef", "Fish"]);
  });

  it("equipmentAvailable avec doublons → dédup", () => {
    const form = makeForm({ equipmentAvailable: ["Four", "Four", "Mixeur/Blender"] });
    const candidate: NormalizedFormOutput = normalizeFormInput(form);
    expect(candidate.equipmentAvailable).toEqual(["Oven", "Blender"]);
  });

  it("physicalActivity valeurs hors enum → error enum", () => {
    const form = makeForm({
      physicalActivity: {
        deskJob: true,
        dailySteps: "test",
        sessionsPerWeek: "42",
        highIntensity: false,
      },
    });
    const candidate = normalizeFormInput(form);
    try {
      normalizedInputSchema.parse(candidate);
      throw new Error("Should have failed");
    } catch (err: any) {
      const errors = formatZodErrors(err);
      const allFieldErrors = Object.values(errors.fieldErrors).flat();
      // Log pour audit si besoin
      expect(allFieldErrors.length).toBeGreaterThan(0);
    }
  });

  it('allergens "lait, gluten, œufs" → allergens contient ["Milk","Gluten","Eggs"]', () => {
    const form = makeForm({ allergens: "lait, gluten, œufs" });
    const candidate: NormalizedFormOutput = normalizeFormInput(form);
    expect(candidate.allergens).toEqual(["Milk", "Gluten", "Eggs"]);
  });

  it("clé inconnue sneaky:x dans le candidat avant parse → .strict() la rejette", () => {
    const form = makeForm();
    const base: NormalizedFormOutput = normalizeFormInput(form);
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
