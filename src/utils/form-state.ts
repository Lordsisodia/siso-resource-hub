import { z } from 'zod';
import { ValidationResult } from './form-validation';
import { measureExecutionTime } from './performance';

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  submitCount: number;
}

export interface FormStateOptions<T> {
  initialValues: T;
  validationSchema?: z.ZodType<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit: (values: T) => Promise<void>;
}

export function getInitialFormState<T>(options: FormStateOptions<T>): FormState<T> {
  return {
    values: options.initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isDirty: false,
    isValid: true,
    submitCount: 0
  };
}

export function updateFormState<T>(
  prevState: FormState<T>,
  updates: Partial<FormState<T>>
): FormState<T> {
  return {
    ...prevState,
    ...updates
  };
}

export function setFieldValue<T>(
  state: FormState<T>,
  field: keyof T,
  value: any
): FormState<T> {
  return updateFormState(state, {
    values: {
      ...state.values,
      [field]: value
    },
    isDirty: true
  });
}

export function setFieldTouched<T>(
  state: FormState<T>,
  field: keyof T,
  isTouched: boolean = true
): FormState<T> {
  return updateFormState(state, {
    touched: {
      ...state.touched,
      [field]: isTouched
    }
  });
}

export function setFieldError<T>(
  state: FormState<T>,
  field: keyof T,
  error?: string
): FormState<T> {
  const newErrors = { ...state.errors };
  if (error) {
    newErrors[field] = error;
  } else {
    delete newErrors[field];
  }

  return updateFormState(state, {
    errors: newErrors,
    isValid: Object.keys(newErrors).length === 0
  });
}

export function handleValidationResult<T>(
  state: FormState<T>,
  result: ValidationResult
): FormState<T> {
  return updateFormState(state, {
    errors: result.errors,
    isValid: result.isValid
  });
}

export async function handleSubmitAttempt<T>(
  state: FormState<T>,
  onSubmit: (values: T) => Promise<void>
): Promise<FormState<T>> {
  return await measureExecutionTime(
    async () => {
      const newState = updateFormState(state, {
        isSubmitting: true,
        submitCount: state.submitCount + 1
      });

      try {
        await onSubmit(state.values);
        return updateFormState(newState, {
          isSubmitting: false,
          isDirty: false
        });
      } catch (error) {
        return updateFormState(newState, {
          isSubmitting: false,
          errors: {
            ...newState.errors,
            submit: error instanceof Error ? error.message : 'Submit failed'
          }
        });
      }
    },
    'form-submit',
    'event',
    {
      submitCount: state.submitCount + 1,
      isDirty: state.isDirty,
      isValid: state.isValid
    }
  );
}

export function resetFormState<T>(
  state: FormState<T>,
  initialValues: T
): FormState<T> {
  return {
    ...getInitialFormState({ initialValues } as FormStateOptions<T>),
    submitCount: state.submitCount
  };
}

export function touchAllFields<T>(state: FormState<T>): FormState<T> {
  const touched = Object.keys(state.values).reduce(
    (acc, key) => ({
      ...acc,
      [key]: true
    }),
    {}
  );

  return updateFormState(state, { touched });
}

export function isFieldValid<T>(
  state: FormState<T>,
  field: keyof T
): boolean {
  return !state.errors[field];
}

export function getFieldState<T>(
  state: FormState<T>,
  field: keyof T
) {
  return {
    value: state.values[field],
    error: state.errors[field],
    touched: state.touched[field] || false,
    isValid: isFieldValid(state, field)
  };
}

export function hasFormChanged<T>(
  state: FormState<T>,
  initialValues: T
): boolean {
  return Object.keys(state.values).some(
    key => state.values[key as keyof T] !== initialValues[key as keyof T]
  );
} 