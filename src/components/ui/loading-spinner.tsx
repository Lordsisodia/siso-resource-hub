import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  ...props
}) => {
  return (
    <div
      role="status"
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
      {...props}
    >
      <Loader2 className="w-full h-full" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}; 