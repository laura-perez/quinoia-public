/**
 * Database types for the User table
 */
export interface User {
  id: string;
  email: string;
  firstName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  email: string;
  firstName?: string;
}

export interface UpsertUserInput {
  email: string;
  firstName?: string;
}
