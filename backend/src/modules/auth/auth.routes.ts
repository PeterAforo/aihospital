import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateBody } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/auth.js';
import { loginSchema, registerSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema, verifyMfaSchema } from './auth.schema.js';

const router = Router();
const authController = new AuthController();

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authController.logout);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/mfa/send', authController.sendMfaCode);
router.post('/mfa/verify', validateBody(verifyMfaSchema), authController.verifyMfaCode);

export default router;
