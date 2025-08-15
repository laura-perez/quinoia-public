import { z } from "zod";

export const targetsSchema = z
  .object({
    formula: z.literal("Mifflin-St Jeor"),
    bmr: z.number().gt(0),
    activityFactor: z.number().min(1.35).max(1.7),
    tdee: z.number().gt(0),
    dailyEnergyTarget: z.number().gt(0),
    mealShare: z.number().min(0).max(1),
    mealEnergyTarget: z.number().gt(0),
    tolerancePct: z.number().positive(),
    mealEnergyMin: z.number().gt(0),
    mealEnergyMax: z.number().gt(0),
    proteinFloor: z.number().gt(0),
  })
  .strict();

export type Targets = z.infer<typeof targetsSchema>;
