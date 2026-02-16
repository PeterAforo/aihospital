import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';

const BACKUP_CODE_COUNT = 10;
const APP_NAME = 'AIHospital';

export class MFAService {
  /**
   * Generate a new TOTP secret and QR code for a user
   */
  async setupMFA(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true, tenant: { select: { name: true } } },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.mfaEnabled) {
      throw new AppError('MFA is already enabled. Disable it first to reconfigure.', 400, 'MFA_ALREADY_ENABLED');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${user.tenant?.name || 'Hospital'})`,
      issuer: APP_NAME,
      length: 20,
    });

    // Store the secret temporarily (not yet enabled until verified)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    // Generate QR code as data URL
    const otpauthUrl = secret.otpauth_url || '';
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret: secret.base32,
      otpauthUrl,
      qrCode: qrCodeDataUrl,
      message: 'Scan the QR code with your authenticator app, then verify with a code to enable MFA.',
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  async verifyAndEnableMFA(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaSecret: true, mfaEnabled: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.mfaSecret) {
      throw new AppError('MFA setup not initiated. Call setup first.', 400, 'MFA_NOT_SETUP');
    }

    if (user.mfaEnabled) {
      throw new AppError('MFA is already enabled.', 400, 'MFA_ALREADY_ENABLED');
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step tolerance (30 seconds)
    });

    if (!verified) {
      throw new AppError('Invalid verification code. Please try again.', 400, 'INVALID_MFA_TOKEN');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Enable MFA and store backup codes
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    return {
      enabled: true,
      backupCodes,
      message: 'MFA enabled successfully. Save your backup codes in a safe place. They will not be shown again.',
    };
  }

  /**
   * Validate a TOTP token during login
   */
  async validateMFAToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    // Try TOTP verification first
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (verified) return true;

    // Try backup codes
    const backupCodes = (user as any).mfaBackupCodes as string[] || [];
    const hashedToken = this.hashBackupCode(token);
    const backupIndex = backupCodes.findIndex(code => code === hashedToken);

    if (backupIndex >= 0) {
      // Remove used backup code
      const updatedCodes = [...backupCodes];
      updatedCodes.splice(backupIndex, 1);
      await prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: updatedCodes },
      });
      return true;
    }

    return false;
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaSecret: true, mfaEnabled: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.mfaEnabled) {
      throw new AppError('MFA is not enabled.', 400, 'MFA_NOT_ENABLED');
    }

    // Verify current token before disabling
    const verified = await this.validateMFAToken(userId, token);
    if (!verified) {
      throw new AppError('Invalid MFA token. Cannot disable MFA.', 400, 'INVALID_MFA_TOKEN');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });

    return { disabled: true, message: 'MFA has been disabled.' };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, token: string) {
    const verified = await this.validateMFAToken(userId, token);
    if (!verified) {
      throw new AppError('Invalid MFA token.', 400, 'INVALID_MFA_TOKEN');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    await prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: hashedBackupCodes },
    });

    return {
      backupCodes,
      message: 'New backup codes generated. Save them in a safe place.',
    };
  }

  /**
   * Check if MFA is required for a user's role
   */
  isMFARequired(role: string): boolean {
    const mfaRequiredRoles = [
      'SUPER_ADMIN',
      'HOSPITAL_ADMIN',
      'MEDICAL_DIRECTOR',
      'ACCOUNTANT',
    ];
    return mfaRequiredRoles.includes(role);
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        role: true,
        mfaBackupCodes: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const backupCodes = (user as any).mfaBackupCodes as string[] || [];

    return {
      mfaEnabled: user.mfaEnabled,
      mfaRequired: this.isMFARequired(user.role),
      backupCodesRemaining: backupCodes.length,
    };
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      // Generate 8-character alphanumeric codes in format XXXX-XXXX
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.replace('-', '')).digest('hex');
  }
}

export const mfaService = new MFAService();
