import React from 'react';
import { cn } from '@/lib/utils';
import { FormResult } from '@/hooks/use-optimized-form';

interface OptimizedFormProps<T> extends React.FormHTMLAttributes<HTMLFormElement> {
  form: FormResult<T>;
  children: React.ReactNode;
}

export function OptimizedForm<T>({
  form,
  children,
  className,
  ...props
}: OptimizedFormProps<T>) {
  return (
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
  );
}

OptimizedForm.displayName = 'OptimizedForm'; 