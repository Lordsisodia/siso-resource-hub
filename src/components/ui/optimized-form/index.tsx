import React from 'react';
import { cn } from '@/lib/utils';
import { FormContext, FormContextValue } from './context';

interface OptimizedFormProps<T> extends React.FormHTMLAttributes<HTMLFormElement> {
  form: FormContextValue<T>;
  children: React.ReactNode;
}

export function OptimizedForm<T>({
  form,
  children,
  className,
  ...props
}: OptimizedFormProps<T>) {
  return (
    <FormContext.Provider value={form}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit(e);
        }}
        className={cn('space-y-4', className)}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

OptimizedForm.displayName = 'OptimizedForm';

export * from './context'; 