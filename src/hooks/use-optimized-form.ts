import { useState, useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';
import { useValidationCache } from './use-form-validation-cache';
import { measureExecutionTime } from '@/utils/performance';
import { useStore } from '@/store/root-store';

interface FormOptions<T> {
  initialValues: T;
  validationSchema?: z.ZodType<T>;
  onSubmit: (values: T) => Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
  resetOnSubmit?: boolean;
  onError?: (error: z.ZodError) => void;
}

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
  isValid: boolean;
}

interface FormResult<T> extends Omit<FormState<T>, 'setErrors'> {
  setFieldValue: (field: keyof T, value: any) => Promise<void>;
  setFieldTouched: (field: keyof T) => Promise<void>;
  setValues: (values: T) => Promise<void>;
  setTouched: (touched: Partial<Record<keyof T, boolean>>) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
}

export function useOptimizedForm<T extends Record<string, any>>(
  options: FormOptions<T>
): FormResult<T> {
  const {
    initialValues,
    validationSchema,
    onSubmit,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
    resetOnSubmit = false,
    onError
  } = options;

  const { isRecording } = useStore(state => ({
    isRecording: state.isRecording
  }));

  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isDirty: false,
    submitCount: 0,
    isValid: true
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const validationCache = useValidationCache<T>({
    maxAge: 5000,
    maxSize: 100
  });

  const validateField = useCallback(async (field: keyof T): Promise<boolean> => {
    if (!validationSchema) return true;

    return await measureExecutionTime(
      async () => {
        try {
          const value = state.values[field];
          const isValid = await validationCache.validateWithCache(
            field,
            value,
            validationSchema
          );

          setState(prev => ({
            ...prev,
            errors: {
              ...prev.errors,
              [field]: isValid ? undefined : 'Invalid field'
            },
            isValid: Object.values(prev.errors).every(error => !error)
          }));

          return isValid;
        } catch (error) {
          if (error instanceof z.ZodError) {
            const fieldError = error.errors.find(err => 
              err.path[0] === field
            )?.message;

            setState(prev => ({
              ...prev,
              errors: {
                ...prev.errors,
                [field]: fieldError
              },
              isValid: false
            }));

            return false;
          }
          return false;
        }
      },
      'form-field-validation',
      'event'
    );
  }, [state.values, validationSchema]);

  const validateForm = useCallback(async (): Promise<boolean> => {
    if (!validationSchema) return true;

    return await measureExecutionTime(
      async () => {
        try {
          await validationSchema.parseAsync(state.values);
          setState(prev => ({ ...prev, errors: {}, isValid: true }));
          return true;
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errors = error.errors.reduce(
              (acc, err) => ({
                ...acc,
                [err.path[0]]: err.message
              }),
              {}
            );

            setState(prev => ({
              ...prev,
              errors,
              isValid: false
            }));

            onError?.(error);
            return false;
          }
          return false;
        }
      },
      'form-validation',
      'event'
    );
  }, [state.values, validationSchema, onError]);

  const setFieldValue = useCallback(async (field: keyof T, value: any) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [field]: value },
      isDirty: true
    }));

    if (validateOnChange) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        validateField(field);
      }, debounceMs);
    }
  }, [validateOnChange, debounceMs, validateField]);

  const setFieldTouched = useCallback(async (field: keyof T) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: true }
    }));

    if (validateOnBlur) {
      await validateField(field);
    }
  }, [validateOnBlur, validateField]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setState(prev => ({
      ...prev,
      isSubmitting: true,
      submitCount: prev.submitCount + 1
    }));

    try {
      const isValid = await validateForm();
      if (!isValid) {
        setState(prev => ({ ...prev, isSubmitting: false }));
        return;
      }

      await measureExecutionTime(
        () => onSubmit(state.values),
        'form-submit',
        'event'
      );

      if (resetOnSubmit) {
        setState({
          values: initialValues,
          errors: {},
          touched: {},
          isSubmitting: false,
          isDirty: false,
          submitCount: state.submitCount,
          isValid: true
        });
      } else {
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          isDirty: false
        }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, isSubmitting: false }));
      throw error;
    }
  }, [state.values, validateForm, onSubmit, resetOnSubmit, initialValues]);

  const resetForm = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isDirty: false,
      submitCount: 0,
      isValid: true
    });
    validationCache.clear();
  }, [initialValues]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    setFieldValue,
    setFieldTouched,
    setValues: async (values: T) => {
      setState(prev => ({
        ...prev,
        values,
        isDirty: true
      }));
      await validateForm();
    },
    setTouched: (touched: Partial<Record<keyof T, boolean>>) => {
      setState(prev => ({
        ...prev,
        touched: { ...prev.touched, ...touched }
      }));
    },
    handleSubmit,
    resetForm,
    validateField,
    validateForm
  };
} 