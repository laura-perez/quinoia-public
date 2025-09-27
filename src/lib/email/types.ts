/**
 * Email Types - Clean interfaces for email system
 */

export interface User {
  id: string;
  email: string;
  firstName?: string;
}

export interface Recipe {
  id: string;
  titleFr: string;
  prepTimeMinutes: number;
  caloriesPerServing: number;
  proteinGPerServing: number;
  carbsGPerServing: number;
  fatGPerServing: number;
  ingredients: Array<{
    nom: string;
    quantite?: number;
    unite?: string;
    section?: string;
  }>;
}

export interface MenuData {
  shareId: string;
  shareUrl: string;
  recipes: Recipe[];
  numServings: number;
  numRecipes: number;
  shoppingList: {
    summary: {
      totalItems: number;
      totalCategories: number;
    };
  };
  nutritionSummary: {
    avgProtein: number;
    totalProtein: number;
  };
}

export type EmailType =
  | 'WELCOME_MENU'      // Premier menu gratuit
  | 'FOLLOW_UP_J3'      // Email J+3 - Comment ça se passe
  | 'NEW_MENU_J7'       // Email J+7 - Proposer nouveau menu
  | 'WEEKLY_MENU'       // Menu hebdomadaire automatique
  | 'REMINDER'          // Rappel menu non consulté
  | 'MARKETING';        // Emails marketing généraux

export interface EmailTemplate {
  type: EmailType;
  subject: string;
  getHtml: (data: any) => string;
}