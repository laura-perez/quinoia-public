/**
 * Types for AI-generated tips system
 */

export interface RecipeTip {
  id: string;
  type: 'preparation' | 'technique' | 'variation' | 'conservation';
  icon: string; // émoji
  text: string; // 50-80 caractères max
}

export interface GeneralTip {
  id: string;
  type: 'organization' | 'batch' | 'nutrition' | 'planning';
  icon: string; // émoji
  text: string; // 50-80 caractères max
}

export interface AITipsResult {
  generalTips: GeneralTip[];
  recipeTips: { [recipeId: string]: RecipeTip[] };
}

export interface UserProfile {
  firstName: string;
  gender: string;
  age: string;
  cookingLevel: string;
}

export interface DietContext {
  diet: string;
  proteinPreferences: string[];
}

export interface TipsGenerationParams {
  recipes: any[]; // Recipe type from existing codebase
  userProfile: UserProfile;
  dietContext: DietContext;
  nutritionSummary: any; // NutritionSummary type from existing codebase
}

// Fallback tips for when AI generation fails
export const FALLBACK_GENERAL_TIPS: GeneralTip[] = [
  {
    id: '1',
    type: 'organization',
    icon: '⚡',
    text: 'Prépare tes légumes en avance pour gagner du temps en cuisine'
  },
  {
    id: '2',
    type: 'batch',
    icon: '🔥',
    text: 'Double les portions et congèle une partie pour un repas rapide'
  },
  {
    id: '3',
    type: 'nutrition',
    icon: '💡',
    text: 'Associe légumineuses et céréales pour des protéines complètes'
  },
  {
    id: '4',
    type: 'planning',
    icon: '⏰',
    text: 'Planifie tes courses selon les sections du supermarché'
  }
];