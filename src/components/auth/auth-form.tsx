import React from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { OptimizedForm } from '@/components/ui/optimized-form';
import { OptimizedFormField } from '@/components/ui/optimized-form-field';
import { withPerformanceOptimization } from '@/components/hoc/with-performance-optimization';
import { useOptimizedForm } from '@/hooks/use-optimized-form';
import { Mail, Lock } from 'lucide-react';

const authSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must include uppercase, lowercase, number and special character'
    )
});

type AuthFormData = z.infer<typeof authSchema>;

interface AuthFormProps {
  onSubmit: (data: AuthFormData) => Promise<void>;
  onSkip: () => void;
  isLoading?: boolean;
}

function AuthFormComponent({ onSubmit, onSkip, isLoading }: AuthFormProps) {
  const form = useOptimizedForm<AuthFormData>({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: authSchema,
    onSubmit,
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300
  });

  return (
    <OptimizedForm form={form}>
      <div className="space-y-4">
        <OptimizedFormField
          name="email"
          label="Work Email"
          type="email"
          placeholder="Enter your work email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          className="w-full bg-white/5 border-siso-border text-siso-text placeholder:text-siso-text-muted focus:border-siso-red"
        />

        <OptimizedFormField
          name="password"
          label="Password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          className="w-full bg-white/5 border-siso-border text-siso-text placeholder:text-siso-text-muted focus:border-siso-red"
        />

        <div className="flex gap-2">
          <Button 
            type="submit"
            disabled={isLoading || !form.isValid}
            className="flex-1 bg-gradient-to-r from-siso-red to-siso-orange hover:opacity-90 text-white"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
          <Button 
            type="button"
            onClick={onSkip}
            variant="outline"
            disabled={isLoading}
            className="flex-1 border-siso-border text-siso-text hover:bg-white/5"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </OptimizedForm>
  );
}

export const AuthForm = withPerformanceOptimization<AuthFormProps>({
  name: 'AuthForm',
  trackProps: true,
  trackRenders: true,
  metricType: 'render',
  slowThreshold: 100
})(React.memo(AuthFormComponent)); 