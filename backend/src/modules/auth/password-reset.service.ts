import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';

const PASSWORD_HISTORY_LIMIT = 5;
const RESET_TOKEN_EXPIRY_MINUTES = 30;

export class PasswordResetService {
  /**
   * Initiate password reset — generate token and return it
   * (Caller is responsible for sending via email/SMS)
   */
  async initiateReset(email: string, tenantId?: string) {
    const where: any = { email };
    if (tenantId) where.tenantId = tenantId;

    const user = await prisma.user.findFirst({
      where,
      select: { id: true, email: true, phone: true, firstName: true, tenantId: true },
    });

    if (!user) {
      // Don't reveal whether user exists
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    return {
      message: 'If the email exists, a reset link has been sent.',
      // These are returned so the caller (controller/email service) can send the token
      _internal: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        resetToken, // Plain token to send to user
        expiresAt,
      },
    };
  }

  /**
   * Validate a reset token
   */
  async validateToken(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    return { valid: true, userId: user.id, email: user.email };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    // Check password history
    await this.checkPasswordHistory(user.id, newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Save to password history
    await this.addToPasswordHistory(user.id, hashedPassword);

    return { message: 'Password reset successful. You can now log in with your new password.' };
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // Check password history
    await this.checkPasswordHistory(userId, newPassword);

    // Hash and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Save to password history
    await this.addToPasswordHistory(userId, hashedPassword);

    return { message: 'Password changed successfully.' };
  }

  /**
   * Check if new password was used in the last N passwords
   */
  private async checkPasswordHistory(userId: string, newPassword: string) {
    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_LIMIT,
    });

    for (const entry of history) {
      const matches = await bcrypt.compare(newPassword, entry.passwordHash);
      if (matches) {
        throw new AppError(
          `Cannot reuse any of your last ${PASSWORD_HISTORY_LIMIT} passwords.`,
          400,
          'PASSWORD_RECENTLY_USED'
        );
      }
    }
  }

  /**
   * Add password hash to history, keeping only the last N entries
   */
  private async addToPasswordHistory(userId: string, hashedPassword: string) {
    await prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash: hashedPassword,
      },
    });

    // Clean up old entries beyond the limit
    const allHistory = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (allHistory.length > PASSWORD_HISTORY_LIMIT) {
      const toDelete = allHistory.slice(PASSWORD_HISTORY_LIMIT).map(h => h.id);
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  }
}

export const passwordResetService = new PasswordResetService();
