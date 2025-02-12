import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/root-store';

interface RouteGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  roles?: string[];
  permissions?: string[];
}

interface GuardConfig {
  isAuthenticated: boolean;
  userRoles?: string[];
  userPermissions?: string[];
  publicPaths?: string[];
}

const defaultConfig: GuardConfig = {
  isAuthenticated: false,
  userRoles: [],
  userPermissions: [],
  publicPaths: ['/login', '/register', '/forgot-password']
};

export function createRouteGuard(config: Partial<GuardConfig> = {}) {
  const guardConfig = { ...defaultConfig, ...config };

  return function RouteGuard({
    children,
    redirectTo = '/login',
    requireAuth = true,
    roles = [],
    permissions = []
  }: RouteGuardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, userRoles, userPermissions } = useStore(state => ({
      isAuthenticated: state.isAuthenticated,
      userRoles: state.user?.roles || [],
      userPermissions: state.user?.permissions || []
    }));

    const checkAccess = () => {
      // Allow public paths
      if (guardConfig.publicPaths?.includes(location.pathname)) {
        return true;
      }

      // Check authentication
      if (requireAuth && !isAuthenticated) {
        return false;
      }

      // Check roles
      if (roles.length > 0 && !roles.some(role => userRoles?.includes(role))) {
        return false;
      }

      // Check permissions
      if (permissions.length > 0 && !permissions.some(perm => userPermissions?.includes(perm))) {
        return false;
      }

      return true;
    };

    useEffect(() => {
      if (!checkAccess()) {
        navigate(redirectTo, {
          state: { from: location.pathname },
          replace: true
        });
      }
    }, [location.pathname, isAuthenticated, userRoles, userPermissions]);

    if (!checkAccess()) {
      return null;
    }

    return <>{children}</>;
  };
}

interface WithAuthProps {
  roles?: string[];
  permissions?: string[];
  redirectTo?: string;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  { roles = [], permissions = [], redirectTo }: WithAuthProps = {}
) {
  return function AuthenticatedComponent(props: P) {
    const RouteGuard = createRouteGuard();

    return (
      <RouteGuard
        requireAuth={true}
        roles={roles}
        permissions={permissions}
        redirectTo={redirectTo}
      >
        <Component {...props} />
      </RouteGuard>
    );
  };
}

export function useGuardedNavigate() {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore(state => ({
    isAuthenticated: state.isAuthenticated
  }));

  return (to: string, options?: { requireAuth?: boolean; redirectTo?: string }) => {
    const { requireAuth = true, redirectTo = '/login' } = options || {};

    if (requireAuth && !isAuthenticated) {
      navigate(redirectTo, {
        state: { from: to },
        replace: true
      });
      return;
    }

    navigate(to);
  };
} 