import { describe, it, expect } from "vitest";
import { computeActivityFactor, computeActivityFactorBreakdown } from "../../lib/activityFactor";
import type { ActivityInput } from "../../lib/activityFactor";

const steps = ['<5k', '5-8k', '>8k'] as const;
const sessions = ['0', '1-2', '3-4', '>=5'] as const;
const bools = [false, true] as const;

describe("computeActivityFactor - exhaustive table", () => {
  for (const deskJob of bools) {
    for (const dailySteps of steps) {
      for (const sessionsPerWeek of sessions) {
        for (const highIntensity of bools) {
          const input: ActivityInput = { deskJob, dailySteps, sessionsPerWeek, highIntensity };
          it(`deskJob=${deskJob} dailySteps=${dailySteps} sessionsPerWeek=${sessionsPerWeek} highIntensity=${highIntensity}`, () => {
            const factor = computeActivityFactor(input);
            expect(typeof factor).toBe("number");
            expect(factor).toBeGreaterThanOrEqual(1.35);
            expect(factor).toBeLessThanOrEqual(1.70);
            expect(Number(factor.toFixed(2))).toBe(factor);
          });
        }
      }
    }
  }
});

describe("computeActivityFactor - cas limites", () => {
  it("clamp bas", () => {
    const input: ActivityInput = { deskJob: true, dailySteps: '<5k', sessionsPerWeek: '0', highIntensity: false };
    expect(computeActivityFactor(input)).toBe(1.35);
  });
  it("clamp haut", () => {
    const input: ActivityInput = { deskJob: false, dailySteps: '>8k', sessionsPerWeek: '>=5', highIntensity: true };
  expect(computeActivityFactor(input)).toBeCloseTo(1.60, 2);
  });
  it("intensité ignorée si sessions=0", () => {
    const input: ActivityInput = { deskJob: false, dailySteps: '5-8k', sessionsPerWeek: '0', highIntensity: true };
    expect(computeActivityFactor(input)).toBe(1.37);
  });
  it("exemple spec: bureau + <5k + 1-2 sessions → 1.35", () => {
    const input: ActivityInput = { deskJob: true, dailySteps: '<5k', sessionsPerWeek: '1-2', highIntensity: false };
    expect(computeActivityFactor(input)).toBe(1.35);
  });
});

describe("computeActivityFactorBreakdown", () => {
  it("breakdown.unclamped + clamp = factor", () => {
    const input: ActivityInput = { deskJob: false, dailySteps: '>8k', sessionsPerWeek: '>=5', highIntensity: true };
    const { factor, breakdown } = computeActivityFactorBreakdown(input);
  expect(factor).toBeCloseTo(1.60, 2);
    expect(Number(breakdown.clamped.toFixed(2))).toBe(breakdown.clamped);
    expect(Number(factor.toFixed(2))).toBe(factor);
  });
  it("composantes sédentaire dur", () => {
    const input: ActivityInput = { deskJob: true, dailySteps: '<5k', sessionsPerWeek: '0', highIntensity: false };
    const { factor, breakdown } = computeActivityFactorBreakdown(input);
    expect(breakdown.base).toBe(1.35);
    expect(breakdown.stepInc).toBe(0.00);
    expect(breakdown.sessInc).toBe(0.00);
    expect(breakdown.intensityInc).toBe(0.00);
    expect(breakdown.sedentaryPenalty).toBe(-0.05);
    expect(breakdown.unclamped).toBe(1.30);
    expect(factor).toBe(1.35);
  });
  it("composantes actif + intensité", () => {
    const input: ActivityInput = { deskJob: false, dailySteps: '>8k', sessionsPerWeek: '3-4', highIntensity: true };
    const { factor, breakdown } = computeActivityFactorBreakdown(input);
    expect(breakdown.base).toBe(1.35);
    expect(breakdown.stepInc).toBe(0.05);
    expect(breakdown.sessInc).toBe(0.10);
    expect(breakdown.intensityInc).toBe(0.05);
    expect(breakdown.sedentaryPenalty).toBe(0.00);
  expect(breakdown.unclamped).toBeCloseTo(1.55, 2);
  expect(factor).toBeCloseTo(1.55, 2);
  });
});
