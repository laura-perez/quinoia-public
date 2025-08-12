// Protein categories
export const proteinCategories = [
  "Beef",
  "Poultry",
  "Meat alternatives",
  "Fish",
  "Eggs",
  "Dairy",
  "Legumes",
  "Tofu",
] as const;
export type ProteinCategory = (typeof proteinCategories)[number];

// Equipment options
export const equipmentOptions = ["Oven", "Blender", "Thermomix", "Air Fryer"] as const;
export type EquipmentOption = (typeof equipmentOptions)[number];

// Gender options
export const genderOptions = ["female", "male", "unspecified"] as const;
export type GenderOption = (typeof genderOptions)[number];

// Diet options
export const dietOptions = ["omnivore", "flexitarian", "vegetarian", "vegan"] as const;
export type DietOption = (typeof dietOptions)[number];

// Cooking levels
export const cookingLevels = ["beginner", "intermediate", "advanced"] as const;
export type CookingLevel = (typeof cookingLevels)[number];

// Primary goals
export const primaryGoals = ["saveTime", "eatHealthier", "weightLoss"] as const;
export type PrimaryGoal = (typeof primaryGoals)[number];

// Secondary focuses
export const secondaryFocuses = ["highProtein"] as const;
export type SecondaryFocus = (typeof secondaryFocuses)[number];

// Daily steps options
export const dailyStepsOptions = ["<5k", "5-8k", ">8k"] as const;
export type DailyStepsOption = (typeof dailyStepsOptions)[number];

// Sessions per week options
export const sessionsPerWeekOptions = ["0", "1-2", "3-4", ">=5"] as const;
export type SessionsPerWeekOption = (typeof sessionsPerWeekOptions)[number];
