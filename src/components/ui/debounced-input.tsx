import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { measureExecutionTime } from '@/utils/performance';

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value: initialValue,
  onChange,
  debounceMs = 500,
  className,
  onFocus,
  onBlur,
  ...props
}) => {
  const [value, setValue] = useState(initialValue);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const lastChangeTime = useRef<number>(Date.now());

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setValue(newValue);
      setIsDebouncing(true);

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      // Calculate time since last change
      const now = Date.now();
      const timeSinceLastChange = now - lastChangeTime.current;
      lastChangeTime.current = now;

      // If typing quickly, extend debounce time
      const adjustedDebounceMs = timeSinceLastChange < 100 
        ? debounceMs * 1.5 
        : debounceMs;

      debounceTimeout.current = setTimeout(async () => {
        await measureExecutionTime(
          async () => onChange(newValue),
          'debounced-input-change'
        );
        setIsDebouncing(false);
      }, adjustedDebounceMs);
    },
    [onChange, debounceMs]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          isDebouncing && 'border-siso-orange',
          className
        )}
      />
      {isDebouncing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-1 h-1 bg-siso-orange rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}; 