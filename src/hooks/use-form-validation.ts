import { useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';
import { useValidationCache } from './use-form-validation-cache';
import { validateField, validateForm } from '@/utils/form-validation';

interface ValidationOptions {
  schema: z.ZodType<any>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

interface ValidationState {
  errors: Record<string, string>;
  isValid: boolean;
  isValidating: boolean;
}

interface ValidationResult {
  validateField: (field: string, value: any) => Promise<boolean>;
  validateForm: (values: any) => Promise<boolean>;
  validateAllFields: (values: any) => Promise<boolean>;
  clearValidation: () => void;
  state: ValidationState;
}

export function useFormValidation(options: ValidationOptions): ValidationResult {
  const {
    schema,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  const validationCache = useValidationCache({
    maxAge: 5000,
    maxSize: 100
  });

  const stateRef = useRef<ValidationState>({
    errors: {},
    isValid: true,
    isValidating: false
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingValidationsRef = useRef<Map<string, Promise<boolean>>>(new Map());

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const validateFieldWithSchema = useCallback(async (
    field: string,
    value: any
  ): Promise<boolean> => {
    stateRef.current.isValidating = true;

    const result = await validateField(field, value, schema);

    stateRef.current = {
      errors: {
        ...stateRef.current.errors,
        ...result.errors
      },
      isValid: Object.keys(result.errors).length === 0,
      isValidating: false
    };

    return result.isValid;
  }, [schema]);

  const debouncedValidateField = useCallback(async (
    field: string,
    value: any
  ): Promise<boolean> => {
    // Cancel any pending validation for this field
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Return existing promise if validation is in progress
    const pendingValidation = pendingValidationsRef.current.get(field);
    if (pendingValidation) {
      return pendingValidation;
    }

    // Create new validation promise
    const validationPromise = new Promise<boolean>((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        const result = await validateFieldWithSchema(field, value);
        pendingValidationsRef.current.delete(field);
        resolve(result);
      }, debounceMs);
    });

    pendingValidationsRef.current.set(field, validationPromise);
    return validationPromise;
  }, [validateFieldWithSchema, debounceMs]);

  const validateFormWithSchema = useCallback(async (
    values: any
  ): Promise<boolean> => {
    stateRef.current.isValidating = true;

    const result = await validateForm(values, schema);

    stateRef.current = {
      errors: result.errors,
      isValid: result.isValid,
      isValidating: false
    };

    return result.isValid;
  }, [schema]);

  const validateAllFields = useCallback(async (
    values: any
  ): Promise<boolean> => {
    stateRef.current.isValidating = true;

    const fields = Object.keys(values);
    const results = await Promise.all(
      fields.map(field => validateFieldWithSchema(field, values[field]))
    );

    stateRef.current.isValidating = false;

    return results.every(Boolean);
  }, [validateFieldWithSchema]);

  const clearValidation = useCallback(() => {
    stateRef.current = {
      errors: {},
      isValid: true,
      isValidating: false
    };
    validationCache.clear();
  }, []);

  return {
    validateField: validateOnChange ? debouncedValidateField : validateFieldWithSchema,
    validateForm: validateFormWithSchema,
    validateAllFields,
    clearValidation,
    state: stateRef.current
  };
} 