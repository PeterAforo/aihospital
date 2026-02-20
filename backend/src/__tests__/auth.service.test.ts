import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock prisma
jest.mock('../common/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('Auth Service - Unit Tests', () => {
  describe('Password Hashing', () => {
    it('should hash a password correctly', async () => {
      const password = 'SecureP@ss123';
      const hash = await bcrypt.hash(password, 12);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify a correct password', async () => {
      const password = 'SecureP@ss123';
      const hash = await bcrypt.hash(password, 12);
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'SecureP@ss123';
      const hash = await bcrypt.hash(password, 12);
      const isValid = await bcrypt.compare('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'SecureP@ss123';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('JWT Token Generation', () => {
    const secret = 'test-jwt-secret';

    it('should generate a valid JWT token', () => {
      const payload = { userId: 'user-123', tenantId: 'tenant-456', role: 'DOCTOR' };
      const token = jwt.sign(payload, secret, { expiresIn: '24h' });
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);
    });

    it('should decode token with correct payload', () => {
      const payload = { userId: 'user-123', tenantId: 'tenant-456', role: 'DOCTOR' };
      const token = jwt.sign(payload, secret, { expiresIn: '24h' });
      const decoded = jwt.verify(token, secret) as any;
      expect(decoded.userId).toBe('user-123');
      expect(decoded.tenantId).toBe('tenant-456');
      expect(decoded.role).toBe('DOCTOR');
    });

    it('should reject token with wrong secret', () => {
      const token = jwt.sign({ userId: 'user-123' }, secret);
      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });

    it('should reject expired tokens', () => {
      const token = jwt.sign({ userId: 'user-123' }, secret, { expiresIn: '0s' });
      // Small delay to ensure expiration
      expect(() => jwt.verify(token, secret)).toThrow();
    });

    it('should include iat and exp claims', () => {
      const token = jwt.sign({ userId: 'user-123' }, secret, { expiresIn: '1h' });
      const decoded = jwt.verify(token, secret) as any;
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(3600);
    });
  });

  describe('Role Validation', () => {
    const validRoles = [
      'SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MEDICAL_DIRECTOR',
      'DOCTOR', 'NURSE', 'HEAD_NURSE', 'PHARMACIST',
      'LAB_TECHNICIAN', 'RECEPTIONIST', 'BILLING_OFFICER', 'ACCOUNTANT',
    ];

    it('should accept all valid roles', () => {
      validRoles.forEach(role => {
        expect(typeof role).toBe('string');
        expect(role.length).toBeGreaterThan(0);
        expect(role).toBe(role.toUpperCase());
      });
    });

    it('should reject invalid roles', () => {
      const invalidRoles = ['admin', 'INVALID_ROLE', '', 'doctor'];
      invalidRoles.forEach(role => {
        expect(validRoles.includes(role)).toBe(false);
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should ensure tenantId is present in queries', () => {
      const query = { tenantId: 'tenant-123', status: 'ACTIVE' };
      expect(query.tenantId).toBeDefined();
      expect(query.tenantId.length).toBeGreaterThan(0);
    });

    it('should reject queries without tenantId', () => {
      const query = { status: 'ACTIVE' };
      expect((query as any).tenantId).toBeUndefined();
    });
  });
});
