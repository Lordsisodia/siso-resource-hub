import { useCallback, useReducer, useRef } from 'react';
import { z } from 'zod';
import {
  FormState,
  FormStateOptions,
  getInitialFormState,
  updateFormState,
  setFieldValue,
  setFieldTouched,
  setFieldError,
  handleValidationResult,
  handleSubmitAttempt,
  resetFormState,
  touchAllFields
} from '@/utils/form-state';
import {
  validateField,
  validateForm,
  ValidationResult
} from '@/utils/form-validation';
import { useValidationCache } from './use-form-validation-cache';
import { debounce } from '@/utils/performance';

type FormAction<T> =
  | { type: 'SET_FIELD_VALUE'; field: keyof T; value: any }
  | { type: 'SET_FIELD_TOUCHED'; field: keyof T }
  | { type: 'SET_FIELD_ERROR'; field: keyof T; error?: string }
  | { type: 'SET_VALUES'; values: T }
  | { type: 'SET_TOUCHED'; touched: Partial<Record<keyof T, boolean>> }
  | { type: 'VALIDATE_FIELD_RESULT'; field: keyof T; result: ValidationResult }
  | { type: 'VALIDATE_FORM_RESULT'; result: ValidationResult }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET_FORM' };

function formReducer<T>(state: FormState<T>, action: FormAction<T>): FormState<T> {
  switch (action.type) {
    case 'SET_FIELD_VALUE':
      return setFieldValue(state, action.field, action.value);
    case 'SET_FIELD_TOUCHED':
      return setFieldTouched(state, action.field);
    case 'SET_FIELD_ERROR':
      return setFieldError(state, action.field, action.error);
    case 'SET_VALUES':
      return updateFormState(state, { values: action.values, isDirty: true });
    case 'SET_TOUCHED':
      return updateFormState(state, { touched: action.touched });
    case 'VALIDATE_FIELD_RESULT':
      return handleValidationResult(state, action.result);
    case 'VALIDATE_FORM_RESULT':
      return handleValidationResult(state, action.result);
    case 'SUBMIT_START':
      return updateFormState(state, {
        isSubmitting: true,
        submitCount: state.submitCount + 1
      });
    case 'SUBMIT_SUCCESS':
      return updateFormState(state, {
        isSubmitting: false,
        isDirty: false
      });
    case 'SUBMIT_ERROR':
      return updateFormState(state, {
        isSubmitting: false,
        errors: {
          ...state.errors,
          submit: action.error
        }
      });
    case 'RESET_FORM':
      return resetFormState(state, state.values);
    default:
      return state;
  }
}

export function useFormState<T extends Record<string, any>>(
  options: FormStateOptions<T>
) {
  const {
    initialValues,
    validationSchema,
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit
  } = options;

  const [state, dispatch] = useReducer(
    formReducer<T>,
    getInitialFormState(options)
  );

  const validationCache = useValidationCache({
    maxAge: 5000,
    maxSize: 100
  });

  const validateFieldWithSchema = useCallback(async (
    field: keyof T
  ): Promise<boolean> => {
    if (!validationSchema) return true;

    const result = await validateField(
      field,
      state.values[field],
      validationSchema
    );

    dispatch({
      type: 'VALIDATE_FIELD_RESULT',
      field,
      result
    });

    return result.isValid;
  }, [validationSchema, state.values]);

  const debouncedValidateField = useRef(
    debounce(validateFieldWithSchema, 300)
  ).current;

  const validateFormWithSchema = useCallback(async (): Promise<boolean> => {
    if (!validationSchema) return true;

    const result = await validateForm(state.values, validationSchema);
    dispatch({
      type: 'VALIDATE_FORM_RESULT',
      result
    });

    return result.isValid;
  }, [validationSchema, state.values]);

  const setFieldValueAndValidate = useCallback(async (
    field: keyof T,
    value: any
  ) => {
    dispatch({
      type: 'SET_FIELD_VALUE',
      field,
      value
    });

    if (validateOnChange) {
      await debouncedValidateField(field);
    }
  }, [validateOnChange, debouncedValidateField]);

  const setFieldTouchedAndValidate = useCallback(async (
    field: keyof T
  ) => {
    dispatch({
      type: 'SET_FIELD_TOUCHED',
      field
    });

    if (validateOnBlur) {
      await validateFieldWithSchema(field);
    }
  }, [validateOnBlur, validateFieldWithSchema]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    dispatch({ type: 'SUBMIT_START' });

    const isValid = await validateFormWithSchema();
    if (!isValid) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: 'Form validation failed'
      });
      return;
    }

    try {
      await onSubmit(state.values);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (error) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: error instanceof Error ? error.message : 'Submit failed'
      });
    }
  }, [validateFormWithSchema, onSubmit, state.values]);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
    validationCache.clear();
  }, []);

  return {
    ...state,
    setFieldValue: setFieldValueAndValidate,
    setFieldTouched: setFieldTouchedAndValidate,
    setValues: useCallback((values: T) => {
      dispatch({ type: 'SET_VALUES', values });
    }, []),
    setTouched: useCallback((touched: Partial<Record<keyof T, boolean>>) => {
      dispatch({ type: 'SET_TOUCHED', touched });
    }, []),
    validateField: validateFieldWithSchema,
    validateForm: validateFormWithSchema,
    handleSubmit,
    resetForm
  };
} 