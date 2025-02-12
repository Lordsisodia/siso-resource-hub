import { useCallback } from 'react';
import { useFormContext } from '@/components/ui/optimized-form/context';
import { measureExecutionTime } from '@/utils/performance';

export interface FormFieldState {
  value: unknown;
  error?: string;
  touched: boolean;
  isDirty: boolean;
  isValid: boolean;
}

export interface FormFieldResult extends FormFieldState {
  onChange: (value: unknown) => Promise<void>;
  onBlur: () => Promise<void>;
}

export function useFormField(name: string): FormFieldResult {
  const form = useFormContext();

  const {
    values,
    errors,
    touched,
    initialValues,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateOnChange,
    validateOnBlur
  } = form;

  const handleChange = useCallback(async (value: unknown) => {
    await measureExecutionTime(
      async () => {
        await setFieldValue(name, value);
        if (validateOnChange) {
          await validateField(name);
        }
      },
      'form-field-change',
      'event',
      { field: name }
    );
  }, [name, setFieldValue, validateField, validateOnChange]);

  const handleBlur = useCallback(async () => {
    await measureExecutionTime(
      async () => {
        await setFieldTouched(name);
        if (validateOnBlur) {
          await validateField(name);
        }
      },
      'form-field-blur',
      'event',
      { field: name }
    );
  }, [name, setFieldTouched, validateField, validateOnBlur]);

  const state: FormFieldState = {
    value: values[name],
    error: errors[name],
    touched: touched[name] || false,
    isDirty: values[name] !== initialValues[name],
    isValid: !errors[name]
  };

  return {
    ...state,
    onChange: handleChange,
    onBlur: handleBlur
  };
} 