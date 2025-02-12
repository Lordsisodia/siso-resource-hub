import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';
import { useFormField } from '@/hooks/use-form-field';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface FormSelectProps extends Omit<React.ComponentProps<typeof Select>, 'value' | 'onValueChange'> {
  label?: string;
  name: string;
  options: SelectOption[];
  helperText?: string;
  placeholder?: string;
}

export const FormSelect = React.forwardRef<HTMLButtonElement, FormSelectProps>(
  (
    {
      label,
      name,
      options,
      helperText,
      placeholder = 'Select an option',
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
            htmlFor={name}
            className={cn(
              'text-sm font-medium',
              showError && 'text-destructive'
            )}
          >
            {label}
          </Label>
        )}
        <Select
          value={value as string}
          onValueChange={onChange}
          onOpenChange={(open) => {
            if (!open) onBlur();
          }}
        >
          <SelectTrigger
            ref={ref}
            id={name}
            className={cn(
              showError && 'border-destructive ring-destructive',
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
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map(({ label, value, disabled }) => (
              <SelectItem
                key={value}
                value={value}
                disabled={disabled}
              >
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

FormSelect.displayName = 'FormSelect'; 