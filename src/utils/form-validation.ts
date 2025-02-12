import { z } from 'zod';
import { measureExecutionTime } from './performance';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export async function validateField<T>(
  field: keyof T,
  value: unknown,
  schema: z.ZodType<T>
): Promise<ValidationResult> {
  return await measureExecutionTime(
    async () => {
      try {
        await schema.parseAsync({ [field]: value });
        return {
          isValid: true,
          errors: {}
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.errors.reduce(
            (acc, err) => ({
              ...acc,
              [err.path[0]]: err.message
            }),
            {}
          );
          return {
            isValid: false,
            errors
          };
        }
        return {
          isValid: false,
          errors: {
            [field as string]: 'Validation failed'
          }
        };
      }
    },
    'field-validation',
    'event',
    { field }
  );
}

export async function validateForm<T>(
  values: T,
  schema: z.ZodType<T>
): Promise<ValidationResult> {
  return await measureExecutionTime(
    async () => {
      try {
        await schema.parseAsync(values);
        return {
          isValid: true,
          errors: {}
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.errors.reduce(
            (acc, err) => ({
              ...acc,
              [err.path[0]]: err.message
            }),
            {}
          );
          return {
            isValid: false,
            errors
          };
        }
        return {
          isValid: false,
          errors: {
            form: 'Form validation failed'
          }
        };
      }
    },
    'form-validation',
    'event',
    { formValues: Object.keys(values) }
  );
}

export function getInitialTouched<T>(fields: (keyof T)[]): Partial<Record<keyof T, boolean>> {
  return fields.reduce(
    (acc, field) => ({
      ...acc,
      [field]: false
    }),
    {}
  );
}

export function getFieldError<T>(
  field: keyof T,
  touched: Partial<Record<keyof T, boolean>>,
  errors: Partial<Record<keyof T, string>>,
  showUntouched: boolean = false
): string | undefined {
  if (!showUntouched && !touched[field]) {
    return undefined;
  }
  return errors[field];
}

export function isFormValid<T>(errors: Partial<Record<keyof T, string>>): boolean {
  return Object.keys(errors).length === 0;
}

export function hasFieldChanged<T>(
  field: keyof T,
  values: T,
  initialValues: T
): boolean {
  return values[field] !== initialValues[field];
}

export function getChangedFields<T>(
  values: T,
  initialValues: T
): Array<keyof T> {
  return Object.keys(values).filter(
    key => values[key as keyof T] !== initialValues[key as keyof T]
  ) as Array<keyof T>;
}

export function getDirtyFields<T>(
  values: T,
  initialValues: T,
  touched: Partial<Record<keyof T, boolean>>
): Array<keyof T> {
  return Object.keys(values).filter(
    key => touched[key as keyof T] && values[key as keyof T] !== initialValues[key as keyof T]
  ) as Array<keyof T>;
} 