import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardRoute, ROLES } from '@/lib/roles';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackRoute?: string;
}

export function RoleBasedRoute({ 
  children, 
  allowedRoles, 
  fallbackRoute 
}: RoleBasedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    const dashboardRoute = fallbackRoute || getDashboardRoute(user.role);
    return <Navigate to={dashboardRoute} replace />;
  }

  return <>{children}</>;
}

// Convenience components for each role
export function SystemPersonRoute({ children }: { children: React.ReactNode }) {
  return (
    <RoleBasedRoute allowedRoles={[ROLES.SYSTEM_PERSON]}>
      {children}
    </RoleBasedRoute>
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <RoleBasedRoute allowedRoles={[ROLES.SYSTEM_PERSON, ROLES.ADMIN]}>
      {children}
    </RoleBasedRoute>
  );
}

export function InvoicingUserRoute({ children }: { children: React.ReactNode }) {
  return (
    <RoleBasedRoute allowedRoles={[ROLES.SYSTEM_PERSON, ROLES.ADMIN, ROLES.INVOICING_USER]}>
      {children}
    </RoleBasedRoute>
  );
}

export function ContactMasterRoute({ children }: { children: React.ReactNode }) {
  return (
    <RoleBasedRoute allowedRoles={[ROLES.SYSTEM_PERSON, ROLES.ADMIN, ROLES.INVOICING_USER, ROLES.CONTACT_MASTER]}>
      {children}
    </RoleBasedRoute>
  );
}
