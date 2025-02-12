import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';
import { useFormField } from '@/hooks/use-form-field';

interface FormCheckboxProps extends Omit<React.ComponentProps<typeof Checkbox>, 'checked' | 'onCheckedChange'> {
  label?: string;
  name: string;
  helperText?: string;
}

export const FormCheckbox = React.forwardRef<HTMLButtonElement, FormCheckboxProps>(
  (
    {
      label,
      name,
      helperText,
      className,
      ...props
    },
    ref
  ) => {
    const { value, error, touched, onChange, onBlur } = useFormField(name);
    const showError = error && touched;
    const showHelper = helperText && !showError;

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            ref={ref}
            id={name}
            checked={value as boolean}
            onCheckedChange={onChange}
            onBlur={onBlur}
            className={cn(
              showError && 'border-destructive',
              className
            )}
            aria-invalid={showError}
            aria-describedby={
              showError
                ? `${name}-error`
                : showHelper
                ? `${name}-helper`
                : undefined
            }
            {...props}
          />
          {label && (
            <Label
              htmlFor={name}
              className={cn(
                'text-sm font-medium',
                showError && 'text-destructive'
              )}
            >
              {label}
            </Label>
          )}
        </div>
        {showError && (
          <p
            id={`${name}-error`}
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}
        {showHelper && (
          <p
            id={`${name}-helper`}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox'; 