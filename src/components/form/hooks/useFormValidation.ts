import { useCallback } from 'react';
import type { FormErrors } from '../types';
import { VALIDATION_MESSAGES } from '../../../lib/constants/ui';

/**
 * Shared validation patterns for form fields
 */
export function useFormValidation() {
  
  // Validate required fields with specific FormData typing
  const validateRequiredFields = useCallback(
    (
      formData: Record<string, unknown>,
      requiredFields: readonly string[]
    ): FormErrors => {
      const errors: FormErrors = {};
      
      for (const field of requiredFields) {
        const fieldValue = formData[field];
        if (!fieldValue || fieldValue.toString().trim() === '') {
          errors[field] = VALIDATION_MESSAGES.REQUIRED_FIELD;
        }
      }
      
      return errors;
    },
    []
  );

  // Validate email format
  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email) return VALIDATION_MESSAGES.REQUIRED_FIELD;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return VALIDATION_MESSAGES.INVALID_EMAIL;
    }
    return undefined;
  }, []);

  // Check if validation has errors
  const hasValidationErrors = useCallback((errors: FormErrors): boolean => {
    return Object.keys(errors).length > 0;
  }, []);

  return {
    validateRequiredFields,
    validateEmail,
    hasValidationErrors,
  };
}