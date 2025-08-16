import { describe, it, expect, beforeEach, vi } from "vitest";
import { verifyAndExtractRecaptcha } from "@/lib/auth/recaptcha";

// Mock du logger pour éviter les logs durant les tests
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  redact: (value: string) => `[REDACTED:${value.length}]`,
}));

describe("verifyAndExtractRecaptcha - Local Bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should bypass reCAPTCHA verification in development with 'bypass-local' token", async () => {
    // Simule l'environnement de développement
    vi.stubEnv("NODE_ENV", "development");
    
    const result = await verifyAndExtractRecaptcha("bypass-local");
    
    expect(result.ok).toBe(true);
    expect(result.meta).toEqual(
      expect.objectContaining({
        score: 0.9,
        action: "submit",
        challengeTs: expect.any(String),
        hostname: "localhost",
      })
    );
  });

  it("should bypass reCAPTCHA verification in development with 'test-token' token", async () => {
    // Simule l'environnement de développement
    vi.stubEnv("NODE_ENV", "development");
    
    const result = await verifyAndExtractRecaptcha("test-token");
    
    expect(result.ok).toBe(true);
    expect(result.meta).toEqual(
      expect.objectContaining({
        score: 0.9,
        action: "submit",
        challengeTs: expect.any(String),
        hostname: "localhost",
      })
    );
  });

  it("should NOT bypass reCAPTCHA verification in production", async () => {
    // Simule l'environnement de production
    vi.stubEnv("NODE_ENV", "production");
    
    // Cette fonction devra appeler verifyRecaptcha et échouer
    // car nous n'avons pas de vraies clés dans les tests
    const result = await verifyAndExtractRecaptcha("bypass-local");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Échec de la vérification reCAPTCHA. Veuillez réessayer.");
  });
});
