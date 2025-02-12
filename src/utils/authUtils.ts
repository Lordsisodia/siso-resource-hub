import { supabase } from '@/integrations/supabase/client';

export const initiateGoogleSignIn = async () => {
  const currentUrl = window.location.origin;
  console.log('Current origin:', currentUrl);
  
  // Clear any existing session data before starting new auth flow
  localStorage.removeItem('siso-auth-token');
  
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${currentUrl}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};

export const signOut = async () => {
  // Clear session data on sign out
  localStorage.removeItem('siso-auth-token');
  return await supabase.auth.signOut();
};

// Enhanced auth callback handler with better error handling
export const handleAuthCallback = async () => {
  console.log('Handling auth callback...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      throw error;
    }
    
    if (session) {
      console.log('Valid session found');
      localStorage.setItem('siso-auth-token', session.access_token);
      
      // Return to the last visited page or home
      const lastPath = sessionStorage.getItem('lastPath') || '/';
      window.location.replace(lastPath);
    } else {
      console.log('No session found after callback');
      window.location.replace('/?error=no_session');
    }
  } catch (error) {
    console.error('Error in auth callback:', error);
    window.location.replace('/?error=auth_callback_failed');
  }
};