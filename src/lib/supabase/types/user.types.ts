/**
 * Database types for the User table
 */
export interface User {
  id: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  email: string;
}

export interface UpsertUserInput {
  email: string;
}
