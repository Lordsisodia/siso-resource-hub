import { useState, useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';
import { useStore } from '@/store/root-store';
import { measureExecutionTime } from '@/utils/performance';
import { useValidationCache } from './use-form-validation-cache';

export type FieldValue = string | number | boolean | null | undefined;
export type FormErrors<T> = Partial<Record<keyof T, string>>;
export type TouchedFields<T> = Partial<Record<keyof T, boolean>>;

export interface FormState<T extends Record<string, FieldValue>> {
  values: T;
  errors: FormErrors<T>;
  touched: TouchedFields<T>;
  isDirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
  submitCount: number;
}

export interface FormOptions<T extends Record<string, FieldValue>> {
  initialValues: T;
  validationSchema?: z.ZodObject<z.ZodRawShape>;
  onSubmit: (values: T) => Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
  shouldResetOnSubmit?: boolean;
  validationCacheOptions?: {
    maxAge?: number;
    maxSize?: number;
  };
}

export function useForm<T extends Record<string, FieldValue>>({
  initialValues,
  validationSchema,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
  validateOnMount = false,
  shouldResetOnSubmit = false,
  validationCacheOptions
}: FormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<TouchedFields<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const initialRender = useRef(true);
  const { addToast } = useStore(state => ({ addToast: state.addToast }));

  const { validateFieldWithCache, clearCache } = useValidationCache(validationCacheOptions);

  // Track form performance
  const startTimeRef = useRef(Date.now());
  const interactionCountRef = useRef(0);

  // Validate single field
  const validateField = useCallback(async (
    field: keyof T,
    value: FieldValue
  ): Promise<boolean> => {
    if (!validationSchema) return true;

    const { isValid, error } = await validateFieldWithCache(field, value, validationSchema);

    setErrors(prev => ({
      ...prev,
      [field]: error
    }));

    return isValid;
  }, [validationSchema, validateFieldWithCache]);

  // Validate entire form
  const validateForm = useCallback(async (): Promise<boolean> => {
    if (!validationSchema) return true;

    try {
      await validationSchema.parseAsync(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors<T> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as keyof T;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [validationSchema, values]);

  // Handle field change
  const handleChange = useCallback(
    async (name: keyof T, value: FieldValue) => {
      interactionCountRef.current++;
      const newValues = { ...values, [name]: value };
      setValues(newValues);

      if (validateOnChange) {
        await validateField(name, value);
      }

      setTouched(prev => ({
        ...prev,
        [name]: true,
      }));
    },
    [values, validateOnChange, validateField]
  );

  // Handle field blur
  const handleBlur = useCallback(
    async (name: keyof T) => {
      if (validateOnBlur) {
        await validateField(name, values[name]);
      }

      setTouched(prev => ({
        ...prev,
        [name]: true,
      }));
    },
    [values, validateOnBlur, validateField]
  );

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setIsSubmitting(true);
    setSubmitCount(prev => prev + 1);

    try {
      const isValid = await validateForm();
      if (!isValid) {
        return;
      }

      await onSubmit(values);

      if (shouldResetOnSubmit) {
        setValues(initialValues);
        setTouched({});
        setErrors({});
        clearCache();
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Form submission failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, onSubmit, values, shouldResetOnSubmit, initialValues, clearCache, addToast]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    interactionCountRef.current = 0;
    startTimeRef.current = Date.now();
    clearCache();
  }, [initialValues, clearCache]);

  // Initial validation
  useEffect(() => {
    if (validateOnMount && initialRender.current) {
      validateForm();
      initialRender.current = false;
    }
  }, [validateOnMount, validateForm]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty: JSON.stringify(values) !== JSON.stringify(initialValues),
    isValid: Object.keys(errors).length === 0,
    submitCount,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setErrors,
    setTouched,
  };
} 