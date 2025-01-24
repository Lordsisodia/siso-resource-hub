import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://fzuwsjxjymwcjsbpwfsl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dXdzanhqeW13Y2pzYnB3ZnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5MDY2MjUsImV4cCI6MjA1MjQ4MjYyNX0.bScMyPLJ-J4EiTI0TOcmc1GAPcZhM8vurOx1fGIYP5g";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
    }
  }
);