import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useMemo } from 'react';

export function usePermissions() {
  const user = useSelector((state: RootState) => state.auth.user);

  const permissions = useMemo(() => user?.permissions || [], [user?.permissions]);
  const role = user?.role || '';

  const hasPermission = (permission: string): boolean => {
    if (role === 'SUPER_ADMIN' || role === 'HOSPITAL_ADMIN') return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (role === 'SUPER_ADMIN' || role === 'HOSPITAL_ADMIN') return true;
    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    if (role === 'SUPER_ADMIN' || role === 'HOSPITAL_ADMIN') return true;
    return perms.every(p => permissions.includes(p));
  };

  const hasRole = (...roles: string[]): boolean => {
    return roles.includes(role);
  };

  return {
    permissions,
    role,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };
}
