import api from './api';

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  branchType: string;
  parentBranchId: string | null;
  phone: string;
  email: string;
  address: string;
  city: string | null;
  region: string | null;
  isActive: boolean;
  isMainBranch: boolean;
  hasEmergency: boolean;
  hasInpatient: boolean;
  hasLab: boolean;
  hasPharmacy: boolean;
  _count?: {
    users: number;
    appointments: number;
  };
}

export interface Role {
  id: string;
  tenantId: string | null;
  name: string;
  displayName: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    permissions: number;
    users: number;
  };
  permissions?: RolePermission[];
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  module: string;
  isSystemPermission: boolean;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  description: string | null;
  headOfDepartment: string | null;
  isActive: boolean;
  _count?: {
    users: number;
  };
}

export interface UserWithRole {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleRelation?: {
    id: string;
    name: string;
    displayName: string;
  };
}

export const rbacService = {
  // Roles
  listRoles: async (includeSystem = true): Promise<Role[]> => {
    const response = await api.get('/rbac/roles', { params: { includeSystem } });
    return response.data.data;
  },

  getRoleById: async (id: string): Promise<Role> => {
    const response = await api.get(`/rbac/roles/${id}`);
    return response.data.data;
  },

  createRole: async (data: { name: string; displayName: string; description?: string; permissionIds?: string[] }): Promise<Role> => {
    const response = await api.post('/rbac/roles', data);
    return response.data.data;
  },

  updateRole: async (id: string, data: { displayName?: string; description?: string; permissionIds?: string[] }): Promise<Role> => {
    const response = await api.put(`/rbac/roles/${id}`, data);
    return response.data.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await api.delete(`/rbac/roles/${id}`);
  },

  // Permissions
  listPermissions: async (module?: string): Promise<{ permissions: Permission[]; grouped: Record<string, Permission[]> }> => {
    const response = await api.get('/rbac/permissions', { params: { module } });
    return response.data.data;
  },

  createPermission: async (data: { name: string; displayName: string; description?: string; module: string }): Promise<Permission> => {
    const response = await api.post('/rbac/permissions', data);
    return response.data.data;
  },

  // User Permissions
  getUserPermissions: async (userId: string): Promise<string[]> => {
    const response = await api.get(`/rbac/users/${userId}/permissions`);
    return response.data.data.permissions;
  },

  getMyPermissions: async (): Promise<string[]> => {
    const response = await api.get('/rbac/my-permissions');
    return response.data.data.permissions;
  },

  grantUserPermission: async (data: { userId: string; permissionId: string; reason?: string; expiresAt?: string }): Promise<void> => {
    await api.post('/rbac/users/permissions/grant', data);
  },

  revokeUserPermission: async (data: { userId: string; permissionId: string; reason?: string }): Promise<void> => {
    await api.post('/rbac/users/permissions/revoke', data);
  },

  // Departments
  listDepartments: async (): Promise<Department[]> => {
    const response = await api.get('/rbac/departments');
    return response.data.data;
  },

  createDepartment: async (data: { name: string; code?: string; description?: string; headOfDepartment?: string }): Promise<Department> => {
    const response = await api.post('/rbac/departments', data);
    return response.data.data;
  },

  updateDepartment: async (id: string, data: Partial<Department>): Promise<Department> => {
    const response = await api.put(`/rbac/departments/${id}`, data);
    return response.data.data;
  },

  deleteDepartment: async (id: string): Promise<void> => {
    await api.delete(`/rbac/departments/${id}`);
  },

  // Assign Role
  assignRoleToUser: async (userId: string, roleId: string): Promise<UserWithRole> => {
    const response = await api.post('/rbac/users/assign-role', { userId, roleId });
    return response.data.data;
  },

  // Branches
  listBranches: async (): Promise<Branch[]> => {
    const response = await api.get('/tenants/branches');
    return response.data.data;
  },

  createBranch: async (data: {
    name: string;
    code?: string;
    branchType?: string;
    phone: string;
    email: string;
    address: string;
    city?: string;
    region?: string;
    isMainBranch?: boolean;
    hasEmergency?: boolean;
    hasInpatient?: boolean;
    hasLab?: boolean;
    hasPharmacy?: boolean;
  }): Promise<Branch> => {
    const response = await api.post('/tenants/branches', data);
    return response.data.data;
  },

  updateBranch: async (id: string, data: Partial<Branch>): Promise<Branch> => {
    const response = await api.put(`/tenants/branches/${id}`, data);
    return response.data.data;
  },

  deleteBranch: async (id: string): Promise<void> => {
    await api.delete(`/tenants/branches/${id}`);
  },
};
