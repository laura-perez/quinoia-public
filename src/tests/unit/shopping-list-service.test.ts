import { describe, it, expect, vi } from 'vitest';
import { organizeByGroceryCategories } from '@/lib/recipes/services/shoppingListService';
import type { ShoppingListItem } from '@/lib/recipes/types';

// Mock the Supabase client to prevent client-side import errors
vi.mock('@/lib/supabase/client', () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}));

/**
 * Tests for the simplified shopping list organization system
 * Verifies that ingredients are grouped by section_code from database,
 * sorted alphabetically by category, without hardcoded mappings
 */

describe('Shopping List Service - Simplified Organization', () => {
  const mockItems: ShoppingListItem[] = [
    {
      canonical_ingredient_id: '1',
      name_fr: 'Tomate',
      total_amount: 500,
      unit: 'g',
      category: 'Légumes',
      section_code: 'legumes-fruits', // From database
      sources: [{ recipe_id: '1', recipe_title: 'Salade', amount: 500, original_name: 'Tomate', serving_multiplier: 1 }]
    },
    {
      canonical_ingredient_id: '2', 
      name_fr: 'Basilic',
      total_amount: 20,
      unit: 'g',
      category: 'Herbes',
      section_code: 'epices', // From database (after migration)
      sources: [{ recipe_id: '1', recipe_title: 'Salade', amount: 20, original_name: 'Basilic', serving_multiplier: 1 }]
    },
    {
      canonical_ingredient_id: '3',
      name_fr: 'Mozzarella',
      total_amount: 200,
      unit: 'g', 
      category: 'Fromages',
      section_code: 'laitier', // From database
      sources: [{ recipe_id: '1', recipe_title: 'Salade', amount: 200, original_name: 'Mozzarella', serving_multiplier: 1 }]
    },
    {
      canonical_ingredient_id: '4',
      name_fr: 'Carotte',
      total_amount: 300,
      unit: 'g',
      category: 'Légumes', // Same category as Tomate
      section_code: 'legumes-fruits', // Same section as Tomate
      sources: [{ recipe_id: '2', recipe_title: 'Soupe', amount: 300, original_name: 'Carotte', serving_multiplier: 1 }]
    },
    {
      canonical_ingredient_id: '5',
      name_fr: 'Poulet',
      total_amount: 400,
      unit: 'g',
      category: 'Viandes',
      section_code: 'proteines', // From database
      sources: [{ recipe_id: '3', recipe_title: 'Curry', amount: 400, original_name: 'Blanc de poulet', serving_multiplier: 1 }]
    }
  ];

  describe('organizeByGroceryCategories', () => {
    it('should group items by category and use section_code from database', () => {
      const result = organizeByGroceryCategories(mockItems);

      // Should have one entry per category
      expect(result).toHaveLength(4); // 4 unique categories: Légumes, Herbes, Fromages, Viandes

      // Find each category
      const legumes = result.find(cat => cat.category === 'Légumes');
      const herbes = result.find(cat => cat.category === 'Herbes');
      const fromages = result.find(cat => cat.category === 'Fromages');
      const viandes = result.find(cat => cat.category === 'Viandes');

      expect(legumes).toBeDefined();
      expect(herbes).toBeDefined();
      expect(fromages).toBeDefined();
      expect(viandes).toBeDefined();

      // Verify section_codes come from database
      expect(legumes!.section_code).toBe('legumes-fruits');
      expect(herbes!.section_code).toBe('epices');
      expect(fromages!.section_code).toBe('laitier');
      expect(viandes!.section_code).toBe('proteines');

      // Verify items are correctly grouped
      expect(legumes!.items).toHaveLength(2); // Tomate + Carotte
      expect(herbes!.items).toHaveLength(1); // Basilic
      expect(fromages!.items).toHaveLength(1); // Mozzarella
      expect(viandes!.items).toHaveLength(1); // Poulet
    });

    it('should sort categories by supermarket section order, then alphabetically within sections', () => {
      const result = organizeByGroceryCategories(mockItems);

      const categoryNames = result.map(cat => cat.category);
      
      // Should respect supermarket order: legumes-fruits, laitier, proteines, epices
      // Based on SECTION_DISPLAY_ORDER: ['legumes-fruits', 'laitier', 'proteines', 'epicerie', 'sauces-huiles', 'epices']
      // Légumes (legumes-fruits) → Fromages (laitier) → Viandes (proteines) → Herbes (epices)
      expect(categoryNames).toEqual(['Légumes', 'Fromages', 'Viandes', 'Herbes']);
      
      // Verify section codes are in correct order too
      const sectionCodes = result.map(cat => cat.section_code);
      expect(sectionCodes).toEqual(['legumes-fruits', 'laitier', 'proteines', 'epices']);
    });

    it('should sort items within each category alphabetically', () => {
      const result = organizeByGroceryCategories(mockItems);

      const legumesCategory = result.find(cat => cat.category === 'Légumes');
      expect(legumesCategory).toBeDefined();

      const itemNames = legumesCategory!.items.map(item => item.name_fr);
      expect(itemNames).toEqual(['Carotte', 'Tomate']); // Alphabetical order
    });

    it('should preserve all item data correctly', () => {
      const result = organizeByGroceryCategories(mockItems);

      // Find a specific item and verify its data is preserved
      const legumesCategory = result.find(cat => cat.category === 'Légumes');
      const tomateItem = legumesCategory!.items.find(item => item.name_fr === 'Tomate');

      expect(tomateItem).toBeDefined();
      expect(tomateItem!.canonical_ingredient_id).toBe('1');
      expect(tomateItem!.total_amount).toBe(500);
      expect(tomateItem!.unit).toBe('g');
      expect(tomateItem!.sources).toHaveLength(1);
      expect(tomateItem!.sources[0].recipe_title).toBe('Salade');
    });

    it('should handle items with same category but different section_code (fallback to first item)', () => {
      // This test handles edge case where items in same category have different section_codes
      // In practice, this shouldn't happen with clean data, but we handle it gracefully
      const mixedSectionItems: ShoppingListItem[] = [
        {
          canonical_ingredient_id: '1',
          name_fr: 'Item A',
          total_amount: 100,
          unit: 'g',
          category: 'TestCategory',
          section_code: 'section1',
          sources: []
        },
        {
          canonical_ingredient_id: '2',
          name_fr: 'Item B',
          total_amount: 200,
          unit: 'g',
          category: 'TestCategory',
          section_code: 'section2', // Different section, should be ignored
          sources: []
        }
      ];

      const result = organizeByGroceryCategories(mixedSectionItems);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('TestCategory');
      expect(result[0].section_code).toBe('section1'); // Uses first item's section
      expect(result[0].items).toHaveLength(2);
    });

    it('should handle empty input', () => {
      const result = organizeByGroceryCategories([]);
      expect(result).toEqual([]);
    });

    it('should use fallback section_code when item has no section_code', () => {
      const itemWithoutSection: ShoppingListItem[] = [
        {
          canonical_ingredient_id: '1',
          name_fr: 'Unknown Item',
          total_amount: 100,
          unit: 'g',
          category: 'Unknown',
          section_code: '', // Empty section
          sources: []
        }
      ];

      const result = organizeByGroceryCategories(itemWithoutSection);

      expect(result).toHaveLength(1);
      expect(result[0].section_code).toBe('epicerie'); // Fallback value
    });
  });

  describe('No double processing architecture', () => {
    it('should provide data pre-organized for UI consumption with supermarket section order', () => {
      const result = organizeByGroceryCategories(mockItems);

      // Service should provide data ready for UI consumption
      // ✅ Grouped by category
      // ✅ Sorted by supermarket section order (not alphabetical)
      // ✅ Items within categories sorted alphabetically
      // ✅ section_code from database
      
      // Verify structure is complete for UI
      result.forEach(categoryGroup => {
        expect(categoryGroup).toHaveProperty('category');
        expect(categoryGroup).toHaveProperty('section_code');
        expect(categoryGroup).toHaveProperty('items');
        expect(categoryGroup.items.length).toBeGreaterThan(0);
        
        // Verify section_code is from database, not hardcoded
        expect(['legumes-fruits', 'laitier', 'proteines', 'epicerie', 'sauces-huiles', 'epices'])
          .toContain(categoryGroup.section_code);
      });

      // Verify supermarket logical order (not alphabetical)
      const sectionOrder = result.map(cat => cat.section_code);
      const expectedOrder = ['legumes-fruits', 'laitier', 'proteines', 'epices'];
      expect(sectionOrder).toEqual(expectedOrder);
      
      // This data structure should be consumable directly by UI without further sorting/grouping
      // UI only needs to apply display name mapping via SUPERMARKET_SECTIONS
    });
  });

  describe('No hardcoded mappings', () => {
    it('should not use any hardcoded category-to-section mappings', () => {
      // This test verifies that the function relies purely on database values
      const unusualMappingItems: ShoppingListItem[] = [
        {
          canonical_ingredient_id: '1',
          name_fr: 'Special Tomate',
          total_amount: 100,
          unit: 'g',
          category: 'Légumes',
          section_code: 'custom-section', // Unusual section from database
          sources: []
        }
      ];

      const result = organizeByGroceryCategories(unusualMappingItems);

      expect(result).toHaveLength(1);
      expect(result[0].section_code).toBe('custom-section'); // Should preserve database value
      expect(result[0].category).toBe('Légumes');
    });
  });
});