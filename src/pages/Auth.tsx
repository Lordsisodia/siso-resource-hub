import React, { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useToast } from '@/hooks/use-toast';
import { Waves } from '@/components/ui/waves-background';
import { supabase } from '@/integrations/supabase/client';
import { measureExecutionTime } from '@/utils/performance';
import { withPerformanceOptimization } from '@/components/hoc/with-performance-optimization';
import { performanceConfig } from '@/config/performance-test-config';
import { AuthForm } from '@/components/auth/auth-form';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';

function AuthComponent() {
  const { user, handleSignIn } = useAuthSession();
  const { handleGoogleSignIn, loading } = useGoogleAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Memoize navigation check
  const shouldNavigateToProfile = useMemo(() => {
    const currentPath = window.location.pathname;
    return user && currentPath === '/auth';
  }, [user]);

  useEffect(() => {
    if (shouldNavigateToProfile) {
      const lastPath = sessionStorage.getItem('lastPath');
      navigate(lastPath || '/profile');
      sessionStorage.removeItem('lastPath');
    }
  }, [shouldNavigateToProfile, navigate]);

  const handleSubmit = useCallback(async (data: { email: string; password: string }) => {
    await measureExecutionTime(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;

        if (session) {
          await handleSignIn(session);
          toast({
            title: "Account created!",
            description: "Let's set up your profile...",
          });
          navigate('/onboarding/social');
        }
      } catch (error: any) {
        console.error('Auth error:', error);
        toast({
          variant: "destructive",
          title: "Error signing up",
          description: error.message || "Please try again",
        });
      }
    }, 'handleSubmit');
  }, [handleSignIn, navigate, toast]);

  const handleDemoGoogleSignIn = useCallback(async () => {
    await measureExecutionTime(async () => {
      try {
        await handleGoogleSignIn();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error signing in",
          description: error.message || "Please try again",
        });
      }
    }, 'handleGoogleSignIn');
  }, [handleGoogleSignIn, toast]);

  const handleDemoGitHubSignIn = useCallback(() => {
    toast({
      title: "Demo Mode",
      description: "Proceeding with demo account...",
    });
    navigate('/onboarding/social');
  }, [navigate, toast]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-black to-siso-bg z-0" />
      
      <Waves 
        lineColor="rgba(255, 87, 34, 0.1)"
        backgroundColor="rgba(255, 87, 34, 0.01)"
        waveSpeedX={0.025}
        waveSpeedY={0.015}
        waveAmpX={80}
        waveAmpY={40}
        friction={0.85}
        tension={0.02}
        maxCursorMove={150}
        xGap={8}
        yGap={24}
        className="z-10"
      />
      
      <div className="relative z-20 w-full max-w-md p-8">
        <div className="backdrop-blur-xl bg-black/40 rounded-lg shadow-xl p-8 border border-siso-border/60 space-y-6">
          <div className="absolute -top-10 left-0 w-full flex justify-center text-siso-text/70">
            <span className="px-4 py-1 rounded-full bg-siso-bg-alt border border-siso-border text-sm">
              Step 1 of 3
            </span>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-siso-red to-siso-orange bg-clip-text text-transparent">
              Welcome to SISO Agency
            </h1>
            <p className="text-siso-text">Let's get started with your account setup</p>
          </div>

          <AuthForm 
            onSubmit={handleSubmit}
            onSkip={() => navigate('/onboarding/social')}
            isLoading={loading}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-siso-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/20 px-2 text-siso-text-muted">Or continue with</span>
            </div>
          </div>

          <SocialAuthButtons
            onGoogleClick={handleDemoGoogleSignIn}
            onGitHubClick={handleDemoGitHubSignIn}
            isLoading={loading}
          />

          <div className="text-center text-sm text-siso-text/70">
            Already have an account?{" "}
            <button 
              onClick={() => navigate('/login')} 
              className="text-siso-red hover:text-siso-orange transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Apply performance optimization to the main component
export default withPerformanceOptimization({
  name: 'Auth',
  trackProps: true,
  trackRenders: true,
  trackEffects: true,
  slowThreshold: performanceConfig.componentThresholds.Auth.renderTime,
})(AuthComponent);
