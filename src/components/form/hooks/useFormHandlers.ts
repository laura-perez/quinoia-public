import { useCallback } from 'react';
import type { FormStepProps } from '../types';

/**
 * Shared form input handlers
 * Provides reusable patterns for handling form input changes
 */
export function useFormHandlers(
  updateFormData: FormStepProps['updateFormData'],
  clearFieldError: (fieldName: string) => void
) {

  // Standard text/radio input handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      updateFormData({ [name]: value });
      clearFieldError(name);
    },
    [updateFormData, clearFieldError]
  );

  // Boolean radio handler (Oui/Non)
  const createBooleanRadioHandler = useCallback(
    (fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value === 'Oui' ? true : e.target.value === 'Non' ? false : null;
      updateFormData({ [fieldName]: val });
      clearFieldError(fieldName);
    },
    [updateFormData, clearFieldError]
  );

  // Checkbox array handler
  const createCheckboxArrayHandler = useCallback(
    (fieldName: string, getCurrentArray: () => string[]) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value, checked } = e.target;
      const current = getCurrentArray();
      const updated = checked 
        ? [...current, value] 
        : current.filter((v: string) => v !== value);
      updateFormData({ [fieldName]: updated });
    },
    [updateFormData]
  );

  return {
    handleInputChange,
    createBooleanRadioHandler,
    createCheckboxArrayHandler,
  };
}