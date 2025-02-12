import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { useFormField, FormFieldState } from '@/hooks/use-form-field';

type FormFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> & {
  label?: string;
  name: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      name,
      helperText,
      leftIcon,
      rightIcon,
      className,
      ...props
    },
    ref
  ) => {
    const { value, error, touched, onChange, onBlur } = useFormField(name);
    const showError = error && touched;
    const showHelper = helperText && !showError;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      onChange(newValue);
    };

    return (
      <div className="space-y-2">
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
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <Input
            ref={ref}
            id={name}
            name={name}
            value={value as string}
            className={cn(
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              showError && 'border-destructive focus-visible:ring-destructive',
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
            onChange={handleChange}
            onBlur={onBlur}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
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

FormField.displayName = 'FormField'; 