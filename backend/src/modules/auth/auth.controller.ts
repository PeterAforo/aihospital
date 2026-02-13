import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
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
      // TODO: Implement password reset via SMS
      sendSuccess(res, null, 'Password reset instructions sent');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement password reset
      sendSuccess(res, null, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  async sendMfaCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // TODO: Implement MFA code sending via SMS
      sendSuccess(res, null, 'MFA code sent');
    } catch (error) {
      next(error);
    }
  }

  async verifyMfaCode(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement MFA verification
      sendSuccess(res, null, 'MFA verified');
    } catch (error) {
      next(error);
    }
  }
}
