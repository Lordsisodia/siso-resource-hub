import { createContext, useContext } from 'react';

export interface FormContextValue<T = any> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  initialValues: T;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  validateOnChange: boolean;
  validateOnBlur: boolean;
  setFieldValue: (field: keyof T, value: any) => Promise<void>;
  setFieldTouched: (field: keyof T) => Promise<void>;
  setValues: (values: T) => Promise<void>;
  setTouched: (touched: Partial<Record<keyof T, boolean>>) => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  resetForm: () => void;
}

export const FormContext = createContext<FormContextValue | undefined>(undefined);

export function useFormContext<T = any>(): FormContextValue<T> {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }

  return context as FormContextValue<T>;
} 