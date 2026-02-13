import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, Building2, Plus, Edit, Trash2, Search, Loader2, Check, MapPin, Phone, Mail, UserX, Key, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import api from '@/services/api';
import { rbacService, Permission, Department } from '@/services/rbac.service';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  branchId?: string | null;
  departmentId?: string | null;
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreatePermission, setShowCreatePermission] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Fetch users
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', selectedRole],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (selectedRole) params.role = selectedRole;
      const res = await api.get('/users', { params });
      return res.data.data;
    },
  });

  // Fetch roles
  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rbacService.listRoles(true),
  });

  // Fetch departments
  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => rbacService.listDepartments(),
  });

  // Fetch permissions
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => rbacService.listPermissions(),
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: (data: { name: string; code?: string; description?: string }) => 
      rbacService.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowCreateDept(false);
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => rbacService.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department deleted' });
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Department> }) => 
      rbacService.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setEditingDept(null);
      toast({ title: 'Department updated' });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/auth/register', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateUser(false);
      toast({ title: 'User created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create user', variant: 'destructive' });
    },
  });

  // Suspend/activate user mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.put(`/users/${id}`, { isActive });
      return res.data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: isActive ? 'User activated' : 'User suspended' });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/users/${userId}/reset-password`);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'Password reset email sent' });
    },
    onError: () => {
      toast({ title: 'Password reset initiated', description: 'User will receive reset instructions' });
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; displayName: string; description?: string; permissionIds?: string[] }) =>
      rbacService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowCreateRole(false);
      toast({ title: 'Role created successfully' });
    },
  });

  // Create permission mutation
  const createPermissionMutation = useMutation({
    mutationFn: (data: { name: string; displayName: string; description?: string; module: string }) =>
      rbacService.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setShowCreatePermission(false);
      toast({ title: 'Permission created successfully' });
    },
  });

  // Fetch branches
  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => rbacService.listBranches(),
  });

  const createBranchMutation = useMutation({
    mutationFn: (data: {
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
    }) => rbacService.createBranch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowCreateBranch(false);
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: string) => rbacService.deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      rbacService.assignRoleToUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const users: User[] = usersData || [];
  const filteredUsers = users.filter(u => 
    searchQuery === '' || 
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-800',
    HOSPITAL_ADMIN: 'bg-purple-100 text-purple-800',
    DOCTOR: 'bg-blue-100 text-blue-800',
    NURSE: 'bg-green-100 text-green-800',
    PHARMACIST: 'bg-yellow-100 text-yellow-800',
    RECEPTIONIST: 'bg-gray-100 text-gray-800',
    LAB_TECHNICIAN: 'bg-cyan-100 text-cyan-800',
    BILLING_OFFICER: 'bg-orange-100 text-orange-800',
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>
          User Management
        </h1>
        <p style={{ color: '#6b7280', marginTop: '4px' }}>
          Manage users, roles, and departments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ marginBottom: '16px' }}>
          <TabsTrigger value="users" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} /> Users
          </TabsTrigger>
          <TabsTrigger value="roles" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} /> Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="departments" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} /> Departments
          </TabsTrigger>
          <TabsTrigger value="branches" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} /> Branches
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CardTitle>Staff Members</CardTitle>
                <Button onClick={() => setShowCreateUser(true)}>
                  <Plus size={16} /> Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
                <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val === 'ALL' ? '' : val)}>
                  <SelectTrigger style={{ width: '200px' }}>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="NURSE">Nurse</SelectItem>
                    <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                    <SelectItem value="LAB_TECHNICIAN">Lab Technician</SelectItem>
                    <SelectItem value="BILLING_OFFICER">Billing Officer</SelectItem>
                    <SelectItem value="HOSPITAL_ADMIN">Hospital Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              {loadingUsers ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: '#6b7280' }} />
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Branch</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Department</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Role</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Last Login</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</div>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#6b7280' }}>{user.email}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                            {user.branch?.name || <span style={{ color: '#9ca3af' }}>—</span>}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                            {user.department?.name || <span style={{ color: '#9ca3af' }}>—</span>}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <Badge className={roleColors[user.role] || 'bg-gray-100 text-gray-800'}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {user.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#6b7280', fontSize: '0.875rem' }}>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                              <Edit size={14} />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => resetPasswordMutation.mutate(user.id)}>
                                  <Key size={14} style={{ marginRight: '8px' }} />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.isActive ? (
                                  <DropdownMenuItem 
                                    onClick={() => toggleUserStatusMutation.mutate({ id: user.id, isActive: false })}
                                    className="text-red-600"
                                  >
                                    <UserX size={14} style={{ marginRight: '8px' }} />
                                    Suspend Account
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => toggleUserStatusMutation.mutate({ id: user.id, isActive: true })}
                                    className="text-green-600"
                                  >
                                    <Check size={14} style={{ marginRight: '8px' }} />
                                    Activate Account
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {filteredUsers.length === 0 && !loadingUsers && (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                  No users found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <Button onClick={() => setShowCreateRole(true)}>
              <Plus size={16} /> Create Custom Role
            </Button>
            <Button variant="outline" onClick={() => setShowCreatePermission(true)}>
              <Plus size={16} /> Create Custom Permission
            </Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <Card>
              <CardHeader>
                <CardTitle>System Roles</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRoles ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {roles?.filter(r => r.isSystemRole).map((role) => (
                      <div
                        key={role.id}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <p style={{ fontWeight: 600 }}>{role.displayName}</p>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {role._count?.permissions || 0} permissions • {role._count?.users || 0} users
                          </p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">System</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permissions by Module</CardTitle>
              </CardHeader>
              <CardContent>
                {permissionsData?.grouped && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(permissionsData.grouped).map(([module, perms]) => (
                      <div key={module}>
                        <p style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: '4px' }}>
                          {module.replace('_', ' ')}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(perms as Permission[]).map((perm) => (
                            <Badge key={perm.id} variant="outline" style={{ fontSize: '0.7rem' }}>
                              {perm.displayName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CardTitle>Departments</CardTitle>
                <Button onClick={() => setShowCreateDept(true)}>
                  <Plus size={16} /> Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDepts ? (
                <Loader2 className="animate-spin" size={24} />
              ) : departments && departments.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      style={{
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <p style={{ fontWeight: 600 }}>{dept.name}</p>
                          {dept.code && <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Code: {dept.code}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDept(dept)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDeptMutation.mutate(dept.id)}
                            disabled={deleteDeptMutation.isPending}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {dept.description && (
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '8px' }}>{dept.description}</p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px' }}>
                        {dept._count?.users || 0} staff members
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                  No departments created yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CardTitle>Hospital Branches</CardTitle>
                <Button onClick={() => setShowCreateBranch(true)}>
                  <Plus size={16} /> Add Branch
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBranches ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: '#6b7280' }} />
                </div>
              ) : branches && branches.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      style={{
                        padding: '20px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        backgroundColor: branch.isMainBranch ? '#f0fdf4' : 'white',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{branch.name}</p>
                            {branch.isMainBranch && (
                              <Badge className="bg-green-100 text-green-800">Main</Badge>
                            )}
                          </div>
                          {branch.code && (
                            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Code: {branch.code}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button variant="ghost" size="sm">
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBranchMutation.mutate(branch.id)}
                            disabled={deleteBranchMutation.isPending || branch.isMainBranch}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.875rem' }}>
                          <MapPin size={14} />
                          <span>{branch.address}{branch.city ? `, ${branch.city}` : ''}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.875rem' }}>
                          <Phone size={14} />
                          <span>{branch.phone}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.875rem' }}>
                          <Mail size={14} />
                          <span>{branch.email}</span>
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <Badge variant="outline" style={{ fontSize: '0.7rem' }}>
                          {branch.branchType.replace('_', ' ')}
                        </Badge>
                        {branch.hasEmergency && (
                          <Badge className="bg-red-100 text-red-800" style={{ fontSize: '0.7rem' }}>Emergency</Badge>
                        )}
                        {branch.hasInpatient && (
                          <Badge className="bg-blue-100 text-blue-800" style={{ fontSize: '0.7rem' }}>Inpatient</Badge>
                        )}
                        {branch.hasLab && (
                          <Badge className="bg-purple-100 text-purple-800" style={{ fontSize: '0.7rem' }}>Lab</Badge>
                        )}
                        {branch.hasPharmacy && (
                          <Badge className="bg-yellow-100 text-yellow-800" style={{ fontSize: '0.7rem' }}>Pharmacy</Badge>
                        )}
                      </div>

                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {branch._count?.users || 0} staff • {branch._count?.appointments || 0} appointments
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                  <MapPin size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <p style={{ fontWeight: 500 }}>No branches created yet</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>Add your first branch to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Branch Modal */}
      {showCreateBranch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Create Branch</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createBranchMutation.mutate({
                name: formData.get('name') as string,
                code: formData.get('code') as string || undefined,
                branchType: formData.get('branchType') as string || 'SATELLITE_CLINIC',
                phone: formData.get('phone') as string,
                email: formData.get('email') as string,
                address: formData.get('address') as string,
                city: formData.get('city') as string || undefined,
                region: formData.get('region') as string || undefined,
                hasEmergency: formData.get('hasEmergency') === 'on',
                hasInpatient: formData.get('hasInpatient') === 'on',
                hasLab: formData.get('hasLab') === 'on',
                hasPharmacy: formData.get('hasPharmacy') === 'on',
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label>Branch Name *</Label>
                    <Input name="name" required placeholder="e.g., Tema Clinic" />
                  </div>
                  <div>
                    <Label>Code</Label>
                    <Input name="code" placeholder="e.g., TEMA" />
                  </div>
                </div>
                <div>
                  <Label>Branch Type</Label>
                  <Select name="branchType" defaultValue="SATELLITE_CLINIC">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAIN">Main Hospital</SelectItem>
                      <SelectItem value="SATELLITE_CLINIC">Satellite Clinic</SelectItem>
                      <SelectItem value="DIAGNOSTIC_CENTER">Diagnostic Center</SelectItem>
                      <SelectItem value="MATERNITY_WARD">Maternity Ward</SelectItem>
                      <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                      <SelectItem value="LAB">Laboratory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label>Phone *</Label>
                    <Input name="phone" required placeholder="+233 XX XXX XXXX" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input name="email" type="email" required placeholder="branch@hospital.com" />
                  </div>
                </div>
                <div>
                  <Label>Address *</Label>
                  <Input name="address" required placeholder="Street address" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label>City</Label>
                    <Input name="city" placeholder="e.g., Accra" />
                  </div>
                  <div>
                    <Label>Region</Label>
                    <Input name="region" placeholder="e.g., Greater Accra" />
                  </div>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Label style={{ marginBottom: '8px', display: 'block' }}>Capabilities</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="hasEmergency" />
                      <span style={{ fontSize: '0.875rem' }}>Emergency Services</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="hasInpatient" />
                      <span style={{ fontSize: '0.875rem' }}>Inpatient Ward</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="hasLab" defaultChecked />
                      <span style={{ fontSize: '0.875rem' }}>Laboratory</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="hasPharmacy" defaultChecked />
                      <span style={{ fontSize: '0.875rem' }}>Pharmacy</span>
                    </label>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={() => setShowCreateBranch(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBranchMutation.isPending}>
                  {createBranchMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Create Branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {showCreateDept && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Create Department</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createDeptMutation.mutate({
                name: formData.get('name') as string,
                code: formData.get('code') as string || undefined,
                description: formData.get('description') as string || undefined,
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <Label>Department Name *</Label>
                  <Input name="name" required placeholder="e.g., Emergency" />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input name="code" placeholder="e.g., ER" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input name="description" placeholder="Brief description" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={() => setShowCreateDept(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDeptMutation.isPending}>
                  {createDeptMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>
              Edit User: {editingUser.firstName} {editingUser.lastName}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const roleId = formData.get('roleId') as string;
              const branchId = formData.get('branchId') as string;
              const departmentId = formData.get('departmentId') as string;
              
              if (roleId) {
                assignRoleMutation.mutate({ userId: editingUser.id, roleId });
              }
              
              updateUserMutation.mutate({
                id: editingUser.id,
                data: {
                  firstName: formData.get('firstName'),
                  lastName: formData.get('lastName'),
                  phone: formData.get('phone'),
                  isActive: formData.get('isActive') === 'true',
                  branchId: branchId || null,
                  departmentId: departmentId || null,
                },
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label>First Name</Label>
                    <Input name="firstName" defaultValue={editingUser.firstName} />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input name="lastName" defaultValue={editingUser.lastName} />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editingUser.email} disabled style={{ backgroundColor: '#f3f4f6' }} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={editingUser.phone} />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Select name="branchId" defaultValue={editingUser.branch?.id || editingUser.branchId || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Branch</SelectItem>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select name="departmentId" defaultValue={editingUser.department?.id || editingUser.departmentId || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Department</SelectItem>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assign Role</Label>
                  <Select name="roleId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="isActive" defaultValue={editingUser.isActive ? 'true' : 'false'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Add New User</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createUserMutation.mutate({
                email: formData.get('email'),
                password: formData.get('password'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                phone: formData.get('phone'),
                role: formData.get('role'),
                branchId: formData.get('branchId') || undefined,
                departmentId: formData.get('departmentId') || undefined,
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label>First Name *</Label>
                    <Input name="firstName" required placeholder="John" />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input name="lastName" required placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input name="email" type="email" required placeholder="john.doe@hospital.com" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input name="password" type="password" required placeholder="Minimum 8 characters" minLength={8} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" placeholder="+233 XX XXX XXXX" />
                </div>
                <div>
                  <Label>Role *</Label>
                  <Select name="role" defaultValue="RECEPTIONIST">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOCTOR">Doctor</SelectItem>
                      <SelectItem value="NURSE">Nurse</SelectItem>
                      <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                      <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                      <SelectItem value="LAB_TECHNICIAN">Lab Technician</SelectItem>
                      <SelectItem value="BILLING_OFFICER">Billing Officer</SelectItem>
                      <SelectItem value="HOSPITAL_ADMIN">Hospital Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Branch</Label>
                  <Select name="branchId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select name="departmentId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateRole && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '450px',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Create Custom Role</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createRoleMutation.mutate({
                name: (formData.get('name') as string).toUpperCase().replace(/\s+/g, '_'),
                displayName: formData.get('displayName') as string,
                description: formData.get('description') as string || undefined,
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <Label>Role Name (Internal) *</Label>
                  <Input name="name" required placeholder="e.g., SENIOR_NURSE" />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                    Will be converted to uppercase with underscores
                  </p>
                </div>
                <div>
                  <Label>Display Name *</Label>
                  <Input name="displayName" required placeholder="e.g., Senior Nurse" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input name="description" placeholder="Brief description of this role" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={() => setShowCreateRole(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRoleMutation.isPending}>
                  {createRoleMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Create Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Permission Modal */}
      {showCreatePermission && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '450px',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Create Custom Permission</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createPermissionMutation.mutate({
                name: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '_'),
                displayName: formData.get('displayName') as string,
                description: formData.get('description') as string || undefined,
                module: formData.get('module') as string,
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <Label>Permission Name (Internal) *</Label>
                  <Input name="name" required placeholder="e.g., approve_overtime" />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                    Will be prefixed with your organization name
                  </p>
                </div>
                <div>
                  <Label>Display Name *</Label>
                  <Input name="displayName" required placeholder="e.g., Approve Overtime" />
                </div>
                <div>
                  <Label>Module *</Label>
                  <Select name="module" defaultValue="custom">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="patients">Patients</SelectItem>
                      <SelectItem value="appointments">Appointments</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="lab">Laboratory</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input name="description" placeholder="What this permission allows" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={() => setShowCreatePermission(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPermissionMutation.isPending}>
                  {createPermissionMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Create Permission
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Edit Department</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              updateDeptMutation.mutate({
                id: editingDept.id,
                data: {
                  name: formData.get('name') as string,
                  code: formData.get('code') as string || undefined,
                  description: formData.get('description') as string || undefined,
                },
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <Label>Department Name *</Label>
                  <Input name="name" required defaultValue={editingDept.name} />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input name="code" defaultValue={editingDept.code || ''} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input name="description" defaultValue={editingDept.description || ''} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={() => setEditingDept(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateDeptMutation.isPending}>
                  {updateDeptMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
