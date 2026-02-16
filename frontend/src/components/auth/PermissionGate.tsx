import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permission?: string | string[];
  role?: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirect?: string;
  requireAll?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  role,
  children,
  fallback = null,
  redirect,
  requireAll = false,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermissions();

  let hasAccess = true;

  if (permission) {
    if (typeof permission === 'string') {
      hasAccess = hasPermission(permission);
    } else if (Array.isArray(permission)) {
      hasAccess = requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission);
    }
  }

  if (role && hasAccess) {
    if (typeof role === 'string') {
      hasAccess = hasRole(role);
    } else if (Array.isArray(role)) {
      hasAccess = role.some(r => hasRole(r));
    }
  }

  if (!hasAccess) {
    if (redirect) {
      return <Navigate to={redirect} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
