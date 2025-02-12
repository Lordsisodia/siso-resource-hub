import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { measureExecutionTime } from '@/utils/performance';

export const useAuthSession = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkProfile = useCallback(async (userId: string) => {
    return await measureExecutionTime(async () => {
      try {
        console.log('Checking profile for user:', userId);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error('Error checking profile:', error);
          return null;
        }
        console.log('Profile found:', profile);
        return profile;
      } catch (error) {
        console.error('Error in checkProfile:', error);
        return null;
      }
    }, 'checkProfile');
  }, []);

  const handleSignIn = useCallback(async (session: any) => {
    try {
      await measureExecutionTime(async () => {
        console.log('Handling sign in for session:', session);
        setUser(session.user);
        
        // Wait for profile creation
        console.log('Waiting for profile creation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const profile = await checkProfile(session.user.id);
        
        if (profile) {
          console.log('Profile verified');
          toast({
            title: "Successfully signed in",
            description: "Welcome to SISO Resource Hub!",
          });
        } else {
          console.error('Profile not found after waiting');
          throw new Error('Profile creation failed');
        }
      }, 'handleSignIn');
    } catch (error) {
      console.error('Error in sign in handler:', error);
      toast({
        variant: "destructive",
        title: "Error signing in",
        description: "There was a problem signing you in. Please try again.",
      });
    }
  }, [checkProfile, toast]);

  const handleSignOut = useCallback(() => {
    measureExecutionTime(async () => {
      console.log('Handling sign out');
      setUser(null);
      toast({
        title: "Signed out",
        description: "Come back soon!",
      });
      navigate('/');
    }, 'handleSignOut');
  }, [navigate, toast]);

  // Memoize the return value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    setUser,
    loading,
    setLoading,
    handleSignIn,
    handleSignOut,
  }), [user, loading, handleSignIn, handleSignOut]);

  return value;
};