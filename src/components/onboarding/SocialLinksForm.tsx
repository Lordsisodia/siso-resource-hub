import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GradientText } from '@/components/ui/gradient-text';
import { Linkedin, Globe, Twitter } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOptimizedForm } from '@/hooks/use-optimized-form';
import { z } from 'zod';
import { withPerformanceOptimization } from '@/components/hoc/with-performance-optimization';
import { cn } from '@/lib/utils';

// Validation schema
const socialLinksSchema = z.object({
  linkedinUrl: z.string()
    .url('Please enter a valid URL')
    .refine(url => url === '' || url.includes('linkedin.com'), 'Must be a LinkedIn URL')
    .optional(),
  websiteUrl: z.string()
    .url('Please enter a valid URL')
    .optional(),
  twitterUrl: z.string()
    .url('Please enter a valid URL')
    .refine(url => url === '' || url.includes('twitter.com') || url.includes('x.com'), 'Must be a Twitter/X URL')
    .optional(),
});

type SocialLinksFormData = z.infer<typeof socialLinksSchema>;

interface SocialLinksFormProps {
  userId: string | null;
}

// Memoized social input component
const SocialInput = memo(({ 
  icon: Icon, 
  placeholder, 
  value, 
  onChange, 
  onBlur,
  tooltip, 
  error,
  isSubmitting,
}: { 
  icon: React.ElementType;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  tooltip: string;
  error?: string;
  isSubmitting?: boolean;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-siso-text/70">
            <Icon className="w-5 h-5" />
          </div>
          <Input
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={isSubmitting}
            className={cn(
              "pl-11 w-full bg-white/5 border-siso-border text-siso-text transition-colors duration-300",
              error ? "border-red-500" : "hover:border-siso-border-hover focus:border-siso-red"
            )}
            aria-invalid={!!error}
          />
          {error && (
            <p className="mt-1 text-sm text-red-500" role="alert">{error}</p>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
));

SocialInput.displayName = 'SocialInput';

function SocialLinksFormComponent({ userId }: SocialLinksFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    values,
    touched,
    errors,
    isSubmitting,
    isDirty,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
  } = useOptimizedForm<SocialLinksFormData>({
    initialValues: {
      linkedinUrl: '',
      websiteUrl: '',
      twitterUrl: '',
    },
    validationSchema: socialLinksSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      try {
        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({
              linkedin_url: values.linkedinUrl,
              website_url: values.websiteUrl,
              twitter_url: values.twitterUrl,
              has_completed_social_info: true,
              social_info_completed_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) throw error;
        }

        toast({
          title: userId ? "Social links saved!" : "Guest profile created",
          description: "Moving to the next step...",
        });

        navigate('/onboarding/congratulations');
      } catch (error: any) {
        console.error('Error saving social links:', error);
        toast({
          variant: "destructive",
          title: "Error saving social links",
          description: error.message || "Please try again",
        });
        throw error;
      }
    },
  });

  const getFilledLinksCount = useMemo(() => {
    return Object.values(values).filter(url => url.trim().length > 0).length;
  }, [values]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <GradientText className="text-2xl font-bold">
          Connect Your Social Profiles
        </GradientText>
        <p className="text-siso-text">
          {userId 
            ? "Help us personalize your experience by connecting your professional profiles"
            : "Add your social profiles to enhance your guest experience"
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <SocialInput
          icon={Linkedin}
          placeholder="LinkedIn Profile URL"
          value={values.linkedinUrl}
          onChange={(e) => setFieldValue('linkedinUrl', e.target.value)}
          onBlur={() => setFieldTouched('linkedinUrl')}
          tooltip="Connect with other professionals and showcase your expertise"
          error={touched.linkedinUrl ? errors?.linkedinUrl : undefined}
          isSubmitting={isSubmitting}
        />
        <SocialInput
          icon={Globe}
          placeholder="Website URL"
          value={values.websiteUrl}
          onChange={(e) => setFieldValue('websiteUrl', e.target.value)}
          onBlur={() => setFieldTouched('websiteUrl')}
          tooltip="Share your personal or business website"
          error={touched.websiteUrl ? errors?.websiteUrl : undefined}
          isSubmitting={isSubmitting}
        />
        <SocialInput
          icon={Twitter}
          placeholder="Twitter Profile URL"
          value={values.twitterUrl}
          onChange={(e) => setFieldValue('twitterUrl', e.target.value)}
          onBlur={() => setFieldTouched('twitterUrl')}
          tooltip="Join the conversation and stay updated with the latest trends"
          error={touched.twitterUrl ? errors?.twitterUrl : undefined}
          isSubmitting={isSubmitting}
        />

        <div className="flex justify-between items-center">
          <span className="text-sm text-siso-text">
            {getFilledLinksCount} of 3 profiles connected
          </span>
          <div className="space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/onboarding/congratulations')}
              disabled={isSubmitting}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Skip
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!isDirty && getFilledLinksCount === 0)}
              className="bg-gradient-to-r from-siso-red to-siso-orange hover:opacity-90"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Export with performance optimization
export const SocialLinksForm = withPerformanceOptimization(
  SocialLinksFormComponent,
  {
    name: 'SocialLinksForm',
    trackProps: true,
    trackRenders: true,
    slowThreshold: 16, // Target 60fps
  }
);