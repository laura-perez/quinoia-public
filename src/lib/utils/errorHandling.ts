/**
 * Consistent error handling utilities
 * Provides standardized patterns for error handling across the application
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger();

/**
 * Standard error response type for APIs
 */
export interface ErrorResponse {
  error: string;
  code?: number;
  details?: Record<string, unknown>;
}

/**
 * Success response type for APIs
 */
export interface SuccessResponse<T = unknown> {
  data: T;
  success: true;
}

/**
 * Union type for API responses
 */
export type ApiResponse<T = unknown> = ErrorResponse | SuccessResponse<T>;

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  code?: number,
  details?: Record<string, unknown>
): ErrorResponse {
  return { error, code, details };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return { data, success: true };
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return 'error' in response;
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return 'success' in response && response.success === true;
}

/**
 * Safely extracts error message from unknown error types
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Logs and throws a standardized error with context
 */
export function logAndThrowError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>
): never {
  const errorMessage = extractErrorMessage(error);
  const logContext = {
    originalError: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  logger.error(message, logContext);
  throw new Error(message);
}

/**
 * Wraps async operations with consistent error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logAndThrowError(errorMessage, error, context);
  }
}