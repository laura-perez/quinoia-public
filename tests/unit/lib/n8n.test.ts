// Mock required env vars before imports
process.env.RECAPTCHA_SECRET_KEY = "test";
process.env.SUPABASE_URL = "test";
process.env.SUPABASE_SERVICE_KEY = "test";
process.env.N8N_WEBHOOK_URL = "http://localhost";
process.env.N8N_WEBHOOK_SECRET = "test";
process.env.HMAC_SECRET = "test";
process.env.APP_BASE_URL = "http://localhost";

import { describe, it, expect, vi } from "vitest";
import { triggerN8n } from "../../../src/lib/n8n";
import { signBody } from "../../../src/lib/hmac";

const mockPayload = {
  submissionId: "test-id-123",
  input: {
    email: "test@example.com",
    firstName: "John",
    age: 30,
    gender: "male",
    heightCm: 180,
    weightKg: 75,
    diet: "omnivore",
    proteinPreferences: ["Beef", "Fish"],
    equipmentAvailable: ["Oven", "Blender"],
    cookingLevel: "beginner",
    numRecipes: 3,
    numServings: 2,
    favoriteFoods: "Pizza, Sushi",
    dislikedFoods: "Broccoli",
    batchMode: false,
    primaryGoal: "eatHealthier",
    secondaryFocus: null,
    activity: {
      deskJob: true,
      dailySteps: "5-8k",
      sessionsPerWeek: "1-2",
      highIntensity: false,
    },
    allergiesText: "Peanuts",
    allergens: ["Peanuts"],
    locale: "fr-FR",
    unitSystem: "metric",
    consent: true,
  },
};

global.fetch = vi.fn();

describe("triggerN8n", () => {
  it("should sign the payload and call n8n webhook with correct headers", async () => {
    const expectedSignature = signBody(JSON.stringify(mockPayload));
    const mockResponse = {
      ok: true,
      json: async () => ({ result: "ok" }),
    };
    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const result = await triggerN8n(mockPayload);
    expect(result).toEqual({ result: "ok" });
    expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
        "X-Hub-Signature": expectedSignature,
      }),
      body: JSON.stringify(mockPayload),
    }));
  });

  it("should throw on non-ok response", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500, text: async () => "fail" });
    await expect(triggerN8n(mockPayload)).rejects.toThrow(/n8n webhook error: 500 fail/);
  });
});
