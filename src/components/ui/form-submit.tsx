import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useFormContext } from '@/components/ui/form';
import { cn } from '@/utils/cn';

interface FormSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loadingText?: string;
}

export const FormSubmit = React.forwardRef<HTMLButtonElement, FormSubmitProps>(
  ({ children, loadingText = 'Submitting...', className, ...props }, ref) => {
    const form = useFormContext();
    const isSubmitting = form.isSubmitting;

    return (
      <Button
        ref={ref}
        type="submit"
        disabled={isSubmitting}
        className={cn('relative', className)}
        {...props}
      >
        {isSubmitting && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {isSubmitting ? loadingText : children}
      </Button>
    );
  }
);

FormSubmit.displayName = 'FormSubmit'; 