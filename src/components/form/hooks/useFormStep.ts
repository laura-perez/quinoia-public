import { useState, useEffect, useCallback } from 'react';
import type { FormErrors } from '../types';
import { scrollToTop } from '../../../lib/constants/ui';

/**
 * Shared hook for form step logic
 * Provides common functionality: scroll, error state, validation patterns
 */
export function useFormStep() {
  const [errors, setErrors] = useState<FormErrors>({});

  // Auto-scroll to top when step mounts
  useEffect(() => {
    scrollToTop();
  }, []);

  // Clear specific field error when field changes
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Set validation errors
  const setValidationErrors = useCallback((newErrors: FormErrors) => {
    setErrors(newErrors);
  }, []);

  return {
    errors,
    clearFieldError,
    clearAllErrors,
    setValidationErrors,
  };
}