import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateBody } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/auth.js';
import { loginSchema, registerSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema.js';
import { authLimiter, passwordResetLimiter } from '../../common/middleware/rate-limiter';

const router = Router();
const authController = new AuthController();

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authController.logout);
router.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', authenticate, authController.changePassword);
// MFA routes
router.post('/mfa/setup', authenticate, authController.setupMFA);
router.post('/mfa/enable', authenticate, authController.verifyAndEnableMFA);
router.post('/mfa/verify-login', authController.verifyMFALogin);
router.post('/mfa/disable', authenticate, authController.disableMFA);
router.post('/mfa/backup-codes', authenticate, authController.regenerateBackupCodes);
router.get('/mfa/status', authenticate, authController.getMFAStatus);

export default router;
