import { useCallback } from 'react';
import { useFormContext } from '@/components/ui/optimized-form/context';
import { measureExecutionTime } from '@/utils/performance';

export interface FormGroupHelpers<T extends Record<string, any>> {
  fields: T;
  setFields: (fields: Partial<T>) => Promise<void>;
  resetFields: () => Promise<void>;
  validateGroup: () => Promise<boolean>;
  touchAll: () => void;
  isDirty: boolean;
  isValid: boolean;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
}

export function useFormGroup<T extends Record<string, any>>(
  name: string,
  initialValues: T
): FormGroupHelpers<T> {
  const form = useFormContext();

  const getGroupFields = useCallback((): T => {
    const value = form.values[name];
    return (value || initialValues) as T;
  }, [form.values, name, initialValues]);

  const getGroupErrors = useCallback((): Partial<Record<keyof T, string>> => {
    const errors = form.errors[name] || {};
    return errors as Partial<Record<keyof T, string>>;
  }, [form.errors, name]);

  const getGroupTouched = useCallback((): Partial<Record<keyof T, boolean>> => {
    const touched = form.touched[name] || {};
    return touched as Partial<Record<keyof T, boolean>>;
  }, [form.touched, name]);

  const setFields = useCallback(async (fields: Partial<T>) => {
    await measureExecutionTime(
      async () => {
        const currentFields = getGroupFields();
        const newFields = {
          ...currentFields,
          ...fields
        };

        await form.setFieldValue(name, newFields);
        if (form.validateOnChange) {
          await form.validateField(name);
        }
      },
      'form-group-update',
      'event',
      { field: name, operation: 'set' }
    );
  }, [form, name, getGroupFields]);

  const resetFields = useCallback(async () => {
    await measureExecutionTime(
      async () => {
        await form.setFieldValue(name, initialValues);
        if (form.validateOnChange) {
          await form.validateField(name);
        }
      },
      'form-group-reset',
      'event',
      { field: name }
    );
  }, [form, name, initialValues]);

  const validateGroup = useCallback(async (): Promise<boolean> => {
    return await measureExecutionTime(
      async () => {
        const isValid = await form.validateField(name);
        return isValid;
      },
      'form-group-validate',
      'event',
      { field: name }
    );
  }, [form, name]);

  const touchAll = useCallback(() => {
    const fields = getGroupFields();
    Object.keys(fields).forEach(key => {
      form.setFieldTouched(`${name}.${key}`);
    });
  }, [form, name, getGroupFields]);

  const isDirty = useCallback((): boolean => {
    const currentFields = getGroupFields();
    return Object.keys(currentFields).some(
      key => currentFields[key] !== initialValues[key]
    );
  }, [getGroupFields, initialValues]);

  const isValid = useCallback((): boolean => {
    const errors = getGroupErrors();
    return Object.keys(errors).length === 0;
  }, [getGroupErrors]);

  return {
    fields: getGroupFields(),
    setFields,
    resetFields,
    validateGroup,
    touchAll,
    isDirty: isDirty(),
    isValid: isValid(),
    errors: getGroupErrors(),
    touched: getGroupTouched()
  };
} 