/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { submitRequestSchema } from '@/schemas/submitRequest.schema';
import { normalizeFormInput } from '@/schemas/normalizeFormInput';
import { normalizedInputSchema } from '@/schemas/normalizedInput.schema';

// Import real production form data
import omnivoreRaw from './dataset/omnivore_rawFormInput.json';
import flexitarianRaw from './dataset/flexitarian_rawFormInput.json';
import vegetarianRaw from './dataset/vegetarian_rawFormInput.json';
import veganRaw from './dataset/vegan_rawFormInput.json';

describe('Form Parsing & Normalization - Production Data', () => {
  describe('Omnivore Dataset', () => {
    it('should parse raw form data with submitRequestSchema', () => {
      const payload = {
        recaptchaToken: 'test-token',
        form: omnivoreRaw,
      };

      const result = submitRequestSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.form.email).toBe('loz@test.com');
        expect(result.data.form.name).toBe('TESTLOZ');
        expect(result.data.form.age).toBe('36'); // submitRequestSchema doesn't coerce - keeps as string
        expect(result.data.form.numRecipes).toBe('4');
        expect(result.data.form.numServings).toBe('3');
      }
    });

    it('should normalize omnivore form data correctly', () => {
      const normalized = normalizeFormInput(omnivoreRaw);

      expect(normalized.email).toBe('loz@test.com');
      expect(normalized.firstName).toBe('TESTLOZ');
      expect(normalized.age).toBe('36'); // normalizeFormInput keeps as string, schema converts later
      expect(normalized.gender).toBe('female'); // Mapped from "Femme"
      expect(normalized.diet).toBe('omnivore'); // Mapped from "Omnivore"
      expect(normalized.cookingLevel).toBe('advanced'); // Mapped from "Confirmé"
      expect(normalized.numRecipes).toBe('4'); // Still string from normalizeFormInput
      expect(normalized.numServings).toBe('3'); // Still string from normalizeFormInput
      expect(normalized.consent).toBe(true);
    });

    it('should map equipment labels correctly', () => {
      const normalized = normalizeFormInput(omnivoreRaw);

      expect(normalized.equipmentAvailable).toContain('Oven'); // "Four" -> "Oven"
      expect(normalized.equipmentAvailable).toContain('Thermomix');
      expect(normalized.equipmentAvailable).toContain('Air Fryer');
      expect(normalized.equipmentAvailable).toContain('Blender'); // "Mixeur/Blender" -> "Blender"
    });

    it('should map protein preferences correctly', () => {
      const normalized = normalizeFormInput(omnivoreRaw);

      expect(normalized.proteinPreferences).toContain('Beef'); // "Boeuf" -> "Beef"
      expect(normalized.proteinPreferences).toContain('Poultry'); // "Volaille" -> "Poultry"
      expect(normalized.proteinPreferences).toContain('Fish'); // "Poisson" -> "Fish"
      expect(normalized.proteinPreferences).toContain('Eggs'); // "Œufs" -> "Eggs"
      expect(normalized.proteinPreferences).toContain('Dairy'); // "Fromages, Produits laitiers" -> "Dairy"
      expect(normalized.proteinPreferences).toContain('Tofu');
      expect(normalized.proteinPreferences).toContain('Legumes'); // "Légumineuses" -> "Legumes"
    });

    it('should validate normalized data with normalizedInputSchema', () => {
      const normalized = normalizeFormInput(omnivoreRaw);
      const result = normalizedInputSchema.safeParse(normalized);

      expect(result.success).toBe(true);
    });
  });

  describe('Flexitarian Dataset', () => {
    it('should parse and normalize flexitarian data', () => {
      const payload = {
        recaptchaToken: 'test-token',
        form: flexitarianRaw,
      };

      const parseResult = submitRequestSchema.safeParse(payload);
      expect(parseResult.success).toBe(true);

      const normalized = normalizeFormInput(flexitarianRaw);
      expect(normalized.email).toBe('alex@test.com');
      expect(normalized.firstName).toBe('Alex');
      expect(normalized.age).toBe('36'); // String before schema validation
      expect(normalized.gender).toBe('male'); // Mapped from "Homme"
      expect(normalized.diet).toBe('flexitarian'); // Mapped from "Flexitarien"
      expect(normalized.cookingLevel).toBe('intermediate'); // Mapped from "Intermédiaire"
      expect(normalized.numRecipes).toBe('5'); // String before schema validation
      expect(normalized.numServings).toBe('2'); // String before schema validation

      const validateResult = normalizedInputSchema.safeParse(normalized);
      expect(validateResult.success).toBe(true);
    });
  });

  describe('Vegetarian Dataset', () => {
    it('should parse and normalize vegetarian data', () => {
      const payload = {
        recaptchaToken: 'test-token',
        form: vegetarianRaw,
      };

      const parseResult = submitRequestSchema.safeParse(payload);
      expect(parseResult.success).toBe(true);

      const normalized = normalizeFormInput(vegetarianRaw);
      expect(normalized.email).toBe('sarah@test.com');
      expect(normalized.firstName).toBe('Sarah');
      expect(normalized.age).toBe('28'); // String before schema validation
      expect(normalized.gender).toBe('unspecified'); // Mapped from "Pas précisé"
      expect(normalized.diet).toBe('vegetarian'); // Mapped from "Végétarien"
      expect(normalized.cookingLevel).toBe('beginner'); // Mapped from "Débutant"
      expect(normalized.numRecipes).toBe('3'); // String before schema validation
      expect(normalized.numServings).toBe('2'); // String before schema validation

      const validateResult = normalizedInputSchema.safeParse(normalized);
      expect(validateResult.success).toBe(true);
    });
  });

  describe('Vegan Dataset', () => {
    it('should parse and normalize vegan data with allergens', () => {
      const payload = {
        recaptchaToken: 'test-token',
        form: veganRaw,
      };

      const parseResult = submitRequestSchema.safeParse(payload);
      expect(parseResult.success).toBe(true);

      const normalized = normalizeFormInput(veganRaw);
      expect(normalized.email).toBe('jeanclaude@test.com');
      expect(normalized.firstName).toBe('Jean Claude');
      expect(normalized.age).toBe('45'); // String before schema validation
      expect(normalized.gender).toBe('male'); // Mapped from "Homme"
      expect(normalized.diet).toBe('vegan'); // Mapped from "Vegan"
      expect(normalized.cookingLevel).toBe('advanced'); // Mapped from "Confirmé"
      expect(normalized.numRecipes).toBe('4'); // String before schema validation
      expect(normalized.numServings).toBe('2'); // String before schema validation

      // Allergens should be extracted
      expect(normalized.allergiesText).toBe('Gluten');
      expect(normalized.allergens).toContain('Gluten'); // Canonical allergens are capitalized

      const validateResult = normalizedInputSchema.safeParse(normalized);
      expect(validateResult.success).toBe(true);
    });
  });

  describe('Edge Cases & Validation', () => {
    it('should handle string numbers correctly', () => {
      // normalizeFormInput keeps them as strings, schema does z.coerce.number()
      const normalized = normalizeFormInput(omnivoreRaw);

      expect(typeof normalized.age).toBe('string'); // Converted by schema later
      expect(typeof normalized.numRecipes).toBe('string');
      expect(typeof normalized.numServings).toBe('string');

      // But after schema validation, they become numbers
      const validated = normalizedInputSchema.parse(normalized);
      expect(typeof validated.age).toBe('number');
      expect(typeof validated.numRecipes).toBe('number');
      expect(typeof validated.numServings).toBe('number');
    });

    it('should preserve consent boolean', () => {
      const normalized = normalizeFormInput(omnivoreRaw);
      expect(normalized.consent).toBe(true);
      expect(typeof normalized.consent).toBe('boolean');
    });

    it('should handle missing optional fields gracefully', () => {
      // Omnivore dataset doesn't have allergens
      const normalized = normalizeFormInput(omnivoreRaw);
      expect(normalized.allergiesText).toBeUndefined();
      expect(normalized.allergens).toEqual([]);
    });

    it('should deduplicate protein preferences', () => {
      // If there were duplicates in the raw data, they should be removed
      const normalized = normalizeFormInput(omnivoreRaw);
      const uniqueProteins = new Set(normalized.proteinPreferences);
      expect(normalized.proteinPreferences.length).toBe(uniqueProteins.size);
    });
  });

  describe('Complete Pipeline Test', () => {
    it('should pass all 4 diets through complete pipeline', () => {
      const datasets = [
        { name: 'omnivore', data: omnivoreRaw },
        { name: 'flexitarian', data: flexitarianRaw },
        { name: 'vegetarian', data: vegetarianRaw },
        { name: 'vegan', data: veganRaw },
      ];

      datasets.forEach(({ name, data }) => {
        // Step 1: Parse with submitRequestSchema
        const payload = { recaptchaToken: 'test-token', form: data };
        const parseResult = submitRequestSchema.safeParse(payload);
        expect(parseResult.success).toBe(true);

        // Step 2: Normalize
        const normalized = normalizeFormInput(data);
        expect(normalized).toBeDefined();
        expect(normalized.email).toBeDefined();
        expect(normalized.diet).toBeDefined();

        // Step 3: Validate normalized data
        const validateResult = normalizedInputSchema.safeParse(normalized);
        expect(validateResult.success).toBe(true);
      });
    });
  });
});
