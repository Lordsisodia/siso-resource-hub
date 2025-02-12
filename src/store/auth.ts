import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { measureExecutionTime } from '@/utils/performance';

interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        loading: true,
        initialized: false,

        setUser: (user) => set({ user }),
        setLoading: (loading) => set({ loading }),

        checkAuth: async () => {
          await measureExecutionTime(async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Error checking auth:', error);
              set({ user: null, loading: false, initialized: true });
              return;
            }

            if (session?.user) {
              set({ 
                user: {
                  id: session.user.id,
                  email: session.user.email,
                  user_metadata: session.user.user_metadata
                },
                loading: false,
                initialized: true
              });
            } else {
              set({ user: null, loading: false, initialized: true });
            }
          }, 'checkAuth');
        },

        signOut: async () => {
          await measureExecutionTime(async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error('Error signing out:', error);
              return;
            }
            set({ user: null });
          }, 'signOut');
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ user: state.user }),
      }
    )
  )
); 