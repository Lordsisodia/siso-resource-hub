import { StoreApi, UseBoundStore } from 'zustand';

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
}

interface StoreSlice<T extends object> {
  getState: () => T;
  setState: (partial: Partial<T>, replace?: boolean) => void;
}

interface CreateSliceOptions<T extends object> {
  name: string;
  initialState: T;
}

export function createStoreSlice<T extends object>({
  name,
  initialState
}: CreateSliceOptions<T>) {
  return (
    set: (fn: (state: Record<string, any>) => Record<string, any>) => void,
    get: () => Record<string, any>
  ): StoreSlice<T> => ({
    getState: () => get()[name] as T,
    setState: (partial: Partial<T>, replace = false) =>
      set((state) => ({
        ...state,
        [name]: replace ? partial : { ...get()[name], ...partial }
      }))
  });
}

type Selector<T, U> = (state: T) => U;
type EqualityFn<T> = (a: T, b: T) => boolean;
type StateSelector<T, U> = (selector: Selector<T, U>, equals?: EqualityFn<U>) => U;

export function createStateSelector<T extends object>() {
  return function useSelector<U>(
    selector: Selector<T, U>,
    store: UseBoundStore<StoreApi<T>>,
    equalityFn?: EqualityFn<U>
  ) {
    return store(selector, equalityFn);
  };
}

export function shallowEqual<T>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is(objA[key as keyof T], objB[key as keyof T])
    ) {
      return false;
    }
  }

  return true;
} 