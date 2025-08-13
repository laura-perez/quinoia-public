// Debug test to check import resolution
import { describe, it, expect } from 'vitest';

// Test different import approaches
try {
  // Approach 1: Direct relative import
  const { setZodErrorMapFR } = require('../../schemas/zodErrorMap.fr.ts');
  console.log('Relative import with .ts works');
} catch (e) {
  console.log('Relative import with .ts failed:', e.message);
}

try {
  // Approach 2: Direct relative import without extension
  const { setZodErrorMapFR } = require('../../schemas/zodErrorMap.fr');
  console.log('Relative import without extension works');
} catch (e) {
  console.log('Relative import without extension failed:', e.message);
}

try {
  // Approach 3: Alias import with extension
  const { setZodErrorMapFR } = require('@/schemas/zodErrorMap.fr.ts');
  console.log('Alias import with .ts works');
} catch (e) {
  console.log('Alias import with .ts failed:', e.message);
}

try {
  // Approach 4: Alias import without extension
  const { setZodErrorMapFR } = require('@/schemas/zodErrorMap.fr');
  console.log('Alias import without extension works');
} catch (e) {
  console.log('Alias import without extension failed:', e.message);
}

describe('Import Resolution Test', () => {
  it('should be able to import zodErrorMap', async () => {
    // Try dynamic import without extension
    try {
      const module = await import('../../schemas/zodErrorMap.fr');
      expect(module.setZodErrorMapFR).toBeDefined();
    } catch (e) {
      console.error('Dynamic import failed:', e);
      throw e;
    }
  });
});
