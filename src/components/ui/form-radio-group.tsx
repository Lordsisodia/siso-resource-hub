import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/utils/cn';
import { useFormField } from '@/hooks/use-form-field';

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface FormRadioGroupProps extends Omit<React.ComponentProps<typeof RadioGroup>, 'value' | 'onValueChange'> {
  label?: string;
  name: string;
  options: RadioOption[];
  helperText?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const FormRadioGroup = React.forwardRef<HTMLDivElement, FormRadioGroupProps>(
  (
    {
      label,
      name,
      options,
      helperText,
      orientation = 'vertical',
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
        {label && (
          <Label
            className={cn(
              'text-sm font-medium',
              showError && 'text-destructive'
            )}
          >
            {label}
          </Label>
        )}
        <RadioGroup
          ref={ref}
          value={value as string}
          onValueChange={onChange}
          onBlur={onBlur}
          className={cn(
            'gap-2',
            orientation === 'horizontal' ? 'flex' : 'flex flex-col',
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
        >
          {options.map(({ label, value, disabled }) => (
            <div key={value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={value}
                id={`${name}-${value}`}
                disabled={disabled}
              />
              <Label
                htmlFor={`${name}-${value}`}
                className="text-sm"
              >
                {label}
              </Label>
            </div>
          ))}
        </RadioGroup>
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

FormRadioGroup.displayName = 'FormRadioGroup'; 