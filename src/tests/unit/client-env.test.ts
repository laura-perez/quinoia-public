/**
 * Test de validation de configuration reCAPTCHA côté client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getRecaptchaSiteKey } from '@/lib/config/clientEnv'

describe('Client Environment - reCAPTCHA', () => {
  beforeEach(() => {
    // Simuler l'environnement client avec la vraie clé
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', '6Lfty5srAAAAALWsWtxzkYB7e45it5leAzFvpxV7')
  })

  afterEach(() => {
    // Nettoyer
    vi.unstubAllEnvs()
  })

  it('should validate and return the reCAPTCHA site key', () => {
    expect(() => {
      const siteKey = getRecaptchaSiteKey()
      expect(siteKey).toBe('6Lfty5srAAAAALWsWtxzkYB7e45it5leAzFvpxV7')
    }).not.toThrow()
  })

  it('should reject invalid key format', () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'invalid-key')

    expect(() => {
      getRecaptchaSiteKey()
    }).toThrow('Invalid reCAPTCHA site key format')
  })

  it('should reject empty key', () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', '')

    expect(() => {
      getRecaptchaSiteKey()
    }).toThrow('reCAPTCHA site key is required')
  })
})
