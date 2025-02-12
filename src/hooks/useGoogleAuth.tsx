import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { initiateGoogleSignIn, signOut } from '@/utils/authUtils';
import { measureExecutionTime } from '@/utils/performance';

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      await measureExecutionTime(async () => {
        console.log('Initiating Google sign in...');
        
        // Store current path for post-auth navigation
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth') {
          sessionStorage.setItem('lastPath', currentPath);
        }
        
        const { error } = await initiateGoogleSignIn();
        if (error) {
          console.error('Google sign in error:', error);
          throw error;
        }
      }, 'handleGoogleSignIn');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Error signing in",
        description: error.message || "There was a problem signing in with Google",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSignOut = useCallback(async () => {
    try {
      setLoading(true);
      await measureExecutionTime(async () => {
        console.log('Initiating sign out...');
        
        const { error } = await signOut();
        if (error) throw error;
        
        navigate('/');
        toast({
          title: "Signed out",
          description: "Come back soon!",
        });
      }, 'handleSignOut');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message || "There was a problem signing out",
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  return {
    loading,
    handleGoogleSignIn,
    handleSignOut
  };
};