import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { mfaService } from './mfa.service.js';
import { passwordResetService } from './password-reset.service.js';
import { sendSuccess, sendError } from '../../common/utils/api-response.js';
import { AuthRequest } from '../../common/middleware/auth.js';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      sendSuccess(res, user, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        sendError(res, 'Not authenticated', 401);
        return;
      }
      const user = await authService.getMe(req.user.userId);
      sendSuccess(res, user, 'User profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user?.userId) {
        await authService.logout(req.user.userId);
      }
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, tenantId } = req.body;
      if (!email) {
        sendError(res, 'Email is required', 400);
        return;
      }
      const result = await passwordResetService.initiateReset(email, tenantId);
      // TODO: Send email/SMS with reset token via notification service
      sendSuccess(res, { message: result.message }, 'Password reset initiated');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        sendError(res, 'Token and new password are required', 400);
        return;
      }
      const result = await passwordResetService.resetPassword(token, newPassword);
      sendSuccess(res, result, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        sendError(res, 'Not authenticated', 401);
        return;
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        sendError(res, 'Current password and new password are required', 400);
        return;
      }
      const result = await passwordResetService.changePassword(req.user.userId, currentPassword, newPassword);
      sendSuccess(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async setupMFA(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        sendError(res, 'Not authenticated', 401);
        return;
      }
      const result = await mfaService.setupMFA(req.user.userId);
      sendSuccess(res, result, 'MFA setup initiated');
    } catch (error) {
      next(error);
    }
  }

  async verifyAndEnableMFA(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        sendError(res, 'Not authenticated', 401);
        return;
      }
      const { token } = req.body;
      if (!token) {
        sendError(res, 'MFA token is required', 400);
        return;
      }
      const result = await mfaService.verifyAndEnableMFA(req.user.userId, token);
      sendSuccess(res, result, 'MFA enabled successfully');
    } catch (error) {
      next(error);
    }
  }

  async verifyMFALogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) {
        sendError(res, 'userId and token are required', 400);
        return;
      }

      const valid = await mfaService.validateMFAToken(userId, token);
      if (!valid) {
        sendError(res, 'Invalid MFA code', 401);
        return;
      }

      // MFA verified — complete login by issuing tokens
      const result = await authService.completeMFALogin(userId);
      sendSuccess(res, result, 'MFA verified. Login successful');
    } catch (error) {
      next(error);
    }
  }

  async disableMFA(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        sendError(res, 'Not authenticated', 401);
        return;
      }
      const { token } = req.body;
      if (!token) {
        sendError(res, 'MFA token is required', 400);
        return;
      }
      const result = await mfaService.disableMFA(req.user.userId, token);
      sendSuccess(res, result, 'MFA disabled');
    } catch (error) {
      next(error);
    }
  }

  async regenerateBackupCodes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        sendError(res, 'Not authenticated', 401);
        return;
      }
      const { token } = req.body;
      if (!token) {
        sendError(res, 'MFA token is required', 400);
        return;
      }
      const result = await mfaService.regenerateBackupCodes(req.user.userId, token);
      sendSuccess(res, result, 'Backup codes regenerated');
    } catch (error) {
      next(error);
    }
  }

  async getMFAStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        sendError(res, 'Not authenticated', 401);
        return;
      }
      const status = await mfaService.getMFAStatus(req.user.userId);
      sendSuccess(res, status, 'MFA status retrieved');
    } catch (error) {
      next(error);
    }
  }
}
