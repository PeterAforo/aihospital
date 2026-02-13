import { Router } from 'express';
import { RBACController } from './rbac.controller.js';
import { authenticate, tenantGuard, requirePermission } from '../../common/middleware/auth.js';

const router: ReturnType<typeof Router> = Router();
const rbacController = new RBACController();

router.use(authenticate);
router.use(tenantGuard);

// ==================== ROLES ====================
router.get('/roles', requirePermission('VIEW_USERS', 'MANAGE_ROLES'), rbacController.listRoles);
router.get('/roles/:id', requirePermission('VIEW_USERS', 'MANAGE_ROLES'), rbacController.getRoleById);
router.post('/roles', requirePermission('MANAGE_ROLES'), rbacController.createRole);
router.put('/roles/:id', requirePermission('MANAGE_ROLES'), rbacController.updateRole);
router.delete('/roles/:id', requirePermission('MANAGE_ROLES'), rbacController.deleteRole);

// ==================== PERMISSIONS ====================
router.get('/permissions', requirePermission('VIEW_USERS', 'MANAGE_PERMISSIONS'), rbacController.listPermissions);
router.post('/permissions', requirePermission('MANAGE_PERMISSIONS'), rbacController.createPermission);

// ==================== USER PERMISSIONS ====================
router.get('/users/:userId/permissions', requirePermission('VIEW_USERS', 'MANAGE_PERMISSIONS'), rbacController.getUserPermissions);
router.get('/my-permissions', rbacController.getUserPermissions); // Any authenticated user can see their own permissions
router.post('/users/permissions/grant', requirePermission('MANAGE_PERMISSIONS'), rbacController.grantUserPermission);
router.post('/users/permissions/revoke', requirePermission('MANAGE_PERMISSIONS'), rbacController.revokeUserPermission);
router.delete('/users/:userId/permissions/:permissionId', requirePermission('MANAGE_PERMISSIONS'), rbacController.removeUserPermissionOverride);

// ==================== DEPARTMENTS ====================
router.get('/departments', requirePermission('VIEW_USERS', 'MANAGE_DEPARTMENTS'), rbacController.listDepartments);
router.post('/departments', requirePermission('MANAGE_DEPARTMENTS'), rbacController.createDepartment);
router.put('/departments/:id', requirePermission('MANAGE_DEPARTMENTS'), rbacController.updateDepartment);
router.delete('/departments/:id', requirePermission('MANAGE_DEPARTMENTS'), rbacController.deleteDepartment);

// ==================== ASSIGN ROLE ====================
router.post('/users/assign-role', requirePermission('ASSIGN_ROLE'), rbacController.assignRoleToUser);

export default router;
