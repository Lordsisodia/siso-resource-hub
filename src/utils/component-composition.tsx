import React, { createContext, useContext, useMemo } from 'react';
import { cn } from '@/utils/cn';

interface ComposeOptions {
  className?: string;
  displayName?: string;
  defaultProps?: Record<string, unknown>;
  shouldMemoize?: boolean;
}

interface ComposedComponent<P = {}> extends React.FC<P> {
  displayName?: string;
  SubComponent?: React.FC<P>;
}

export function compose<P extends object>(
  Component: React.ComponentType<P>,
  options: ComposeOptions = {}
): ComposedComponent<P> {
  const {
    className,
    displayName,
    defaultProps,
    shouldMemoize = true
  } = options;

  const ComposedComponent: ComposedComponent<P> = (props: P) => {
    const composedProps = useMemo(() => ({
      ...defaultProps,
      ...props,
      className: cn(className, (props as any).className)
    }), [props]);

    return <Component {...composedProps} />;
  };

  if (displayName) {
    ComposedComponent.displayName = displayName;
  }

  return shouldMemoize ? React.memo(ComposedComponent) : ComposedComponent;
}

interface CompoundComponentContext<T = any> {
  value: T;
  setValue: (value: T) => void;
}

export function createCompoundComponent<T, P = {}>(
  initialValue: T
): [React.Context<CompoundComponentContext<T>>, () => CompoundComponentContext<T>, React.FC<P & { children: React.ReactNode }>] {
  const CompoundContext = createContext<CompoundComponentContext<T>>({
    value: initialValue,
    setValue: () => {}
  });

  const useCompound = () => {
    const context = useContext(CompoundContext);
    if (!context) {
      throw new Error('useCompound must be used within a CompoundProvider');
    }
    return context;
  };

  const CompoundProvider: React.FC<P & { children: React.ReactNode }> = ({ children, ...props }) => {
    const [value, setValue] = React.useState(initialValue);

    const contextValue = useMemo(() => ({
      value,
      setValue
    }), [value]);

    return (
      <CompoundContext.Provider value={contextValue}>
        {children}
      </CompoundContext.Provider>
    );
  };

  return [CompoundContext, useCompound, CompoundProvider];
}

interface WithContextProps<T> {
  context: T;
  children: React.ReactNode;
}

export function withContext<T, P extends object>(
  Component: React.ComponentType<P>,
  useContextHook: () => T
): React.FC<Omit<P, keyof WithContextProps<T>>> {
  return function ContextWrapper(props: Omit<P, keyof WithContextProps<T>>) {
    const context = useContextHook();
    return <Component {...(props as P)} context={context} />;
  };
}

export function createControlledComponent<P extends { value: any; onChange: (value: any) => void }>(
  Component: React.ComponentType<P>,
  options: ComposeOptions = {}
): React.FC<Omit<P, 'value' | 'onChange'> & { defaultValue?: P['value'] }> {
  return function ControlledComponent({ defaultValue, ...props }) {
    const [value, setValue] = React.useState(defaultValue);

    const handleChange = (newValue: P['value']) => {
      setValue(newValue);
    };

    const controlledProps = {
      ...props,
      value,
      onChange: handleChange
    } as P;

    return <Component {...controlledProps} />;
  };
} 