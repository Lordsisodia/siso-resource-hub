import { useCallback } from 'react';
import { useFormContext } from '@/components/ui/optimized-form/context';
import { measureExecutionTime } from '@/utils/performance';

export interface FormArrayHelpers<T> {
  fields: T[];
  append: (value: T) => Promise<void>;
  prepend: (value: T) => Promise<void>;
  insert: (index: number, value: T) => Promise<void>;
  remove: (index: number) => Promise<void>;
  move: (from: number, to: number) => Promise<void>;
  swap: (indexA: number, indexB: number) => Promise<void>;
  replace: (index: number, value: T) => Promise<void>;
  update: (index: number, updater: (value: T) => T) => Promise<void>;
  clear: () => Promise<void>;
  validateField: (index: number) => Promise<boolean>;
  validateAll: () => Promise<boolean>;
  touchAll: () => void;
  isDirty: boolean;
  isValid: boolean;
  errors: Array<string | undefined>;
  touched: Array<boolean>;
}

export function useFormArray<T>(name: string, initialValue: T[] = []): FormArrayHelpers<T> {
  const form = useFormContext();

  const getFieldArray = useCallback((): T[] => {
    const value = form.values[name];
    return Array.isArray(value) ? value : initialValue;
  }, [form.values, name, initialValue]);

  const getArrayErrors = useCallback((): Array<string | undefined> => {
    const errors = form.errors[name];
    if (!errors) return [];
    if (Array.isArray(errors)) return errors as Array<string | undefined>;
    return [];
  }, [form.errors, name]);

  const getArrayTouched = useCallback((): Array<boolean> => {
    const touched = form.touched[name];
    if (!touched) return [];
    if (Array.isArray(touched)) return touched as Array<boolean>;
    return [];
  }, [form.touched, name]);

  const validateArrayField = useCallback(async (index: number): Promise<boolean> => {
    return await measureExecutionTime(
      async () => {
        const isValid = await form.validateField(`${name}.${index}`);
        return isValid;
      },
      'form-array-validate-field',
      'event',
      { field: name, index }
    );
  }, [form, name]);

  const validateArray = useCallback(async (): Promise<boolean> => {
    return await measureExecutionTime(
      async () => {
        const isValid = await form.validateField(name);
        return isValid;
      },
      'form-array-validate',
      'event',
      { field: name }
    );
  }, [form, name]);

  const setArray = useCallback(async (newArray: T[]) => {
    await measureExecutionTime(
      async () => {
        await form.setFieldValue(name, newArray);
        if (form.validateOnChange) {
          await validateArray();
        }
      },
      'form-array-update',
      'event',
      { field: name }
    );
  }, [form, name, validateArray]);

  const append = useCallback(async (value: T) => {
    const array = getFieldArray();
    await setArray([...array, value]);
  }, [getFieldArray, setArray]);

  const prepend = useCallback(async (value: T) => {
    const array = getFieldArray();
    await setArray([value, ...array]);
  }, [getFieldArray, setArray]);

  const insert = useCallback(async (index: number, value: T) => {
    const array = getFieldArray();
    await setArray([
      ...array.slice(0, index),
      value,
      ...array.slice(index)
    ]);
  }, [getFieldArray, setArray]);

  const remove = useCallback(async (index: number) => {
    const array = getFieldArray();
    await setArray([
      ...array.slice(0, index),
      ...array.slice(index + 1)
    ]);
  }, [getFieldArray, setArray]);

  const move = useCallback(async (from: number, to: number) => {
    const array = getFieldArray();
    const newArray = [...array];
    const [movedItem] = newArray.splice(from, 1);
    newArray.splice(to, 0, movedItem);
    await setArray(newArray);
  }, [getFieldArray, setArray]);

  const swap = useCallback(async (indexA: number, indexB: number) => {
    const array = getFieldArray();
    const newArray = [...array];
    [newArray[indexA], newArray[indexB]] = [newArray[indexB], newArray[indexA]];
    await setArray(newArray);
  }, [getFieldArray, setArray]);

  const replace = useCallback(async (index: number, value: T) => {
    const array = getFieldArray();
    await setArray([
      ...array.slice(0, index),
      value,
      ...array.slice(index + 1)
    ]);
  }, [getFieldArray, setArray]);

  const update = useCallback(async (index: number, updater: (value: T) => T) => {
    const array = getFieldArray();
    const oldValue = array[index];
    const newValue = updater(oldValue);
    await replace(index, newValue);
  }, [getFieldArray, replace]);

  const clear = useCallback(async () => {
    await setArray([]);
  }, [setArray]);

  const touchAll = useCallback(() => {
    const array = getFieldArray();
    array.forEach((_, index) => {
      form.setFieldTouched(`${name}.${index}`);
    });
  }, [form, name, getFieldArray]);

  const isDirty = useCallback((): boolean => {
    const currentArray = getFieldArray();
    if (currentArray.length !== initialValue.length) return true;
    return currentArray.some((value, index) => value !== initialValue[index]);
  }, [getFieldArray, initialValue]);

  const isValid = useCallback((): boolean => {
    const errors = getArrayErrors();
    return errors.every(error => !error);
  }, [getArrayErrors]);

  return {
    fields: getFieldArray(),
    append,
    prepend,
    insert,
    remove,
    move,
    swap,
    replace,
    update,
    clear,
    validateField: validateArrayField,
    validateAll: validateArray,
    touchAll,
    isDirty: isDirty(),
    isValid: isValid(),
    errors: getArrayErrors(),
    touched: getArrayTouched()
  };
} 