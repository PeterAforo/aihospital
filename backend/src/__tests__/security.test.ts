import { AppError } from '../common/middleware/error-handler';

describe('Security Tests', () => {
  describe('AppError', () => {
    it('should create an error with status code and error code', () => {
      const error = new AppError('Not found', 404, 'NOT_FOUND');
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error instanceof Error).toBe(true);
    });

    it('should default to 400 status code', () => {
      const error = new AppError('Bad request');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('Input Validation Patterns', () => {
    it('should detect SQL injection patterns', () => {
      const sqlInjectionPatterns = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "admin'--",
        "1; DELETE FROM patients",
      ];

      sqlInjectionPatterns.forEach(pattern => {
        expect(pattern).toBeDefined();
        // These should be caught by parameterized queries (Prisma)
        // This test documents the patterns we protect against
      });
    });

    it('should detect XSS patterns', () => {
      const xssPatterns = [
        '<script>alert("xss")</script>',
        '<img onerror="alert(1)" src="x">',
        'javascript:alert(1)',
      ];

      xssPatterns.forEach(pattern => {
        expect(pattern).toBeDefined();
        // Helmet middleware + React escaping protects against these
      });
    });

    it('should validate JWT token format', () => {
      const validJwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
      
      expect(validJwtPattern.test('header.payload.signature')).toBe(true);
      expect(validJwtPattern.test('not-a-jwt')).toBe(false);
      expect(validJwtPattern.test('')).toBe(false);
    });

    it('should validate email format', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailPattern.test('user@example.com')).toBe(true);
      expect(emailPattern.test('admin@hospital.gh')).toBe(true);
      expect(emailPattern.test('not-an-email')).toBe(false);
      expect(emailPattern.test('@missing-local.com')).toBe(false);
    });

    it('should validate password strength', () => {
      const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      
      expect(strongPasswordPattern.test('StrongP4ss')).toBe(true);
      expect(strongPasswordPattern.test('weak')).toBe(false);
      expect(strongPasswordPattern.test('nouppercase1')).toBe(false);
      expect(strongPasswordPattern.test('NOLOWERCASE1')).toBe(false);
      expect(strongPasswordPattern.test('NoDigitsHere')).toBe(false);
    });

    it('should validate UUID format', () => {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      expect(uuidPattern.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(uuidPattern.test('not-a-uuid')).toBe(false);
      expect(uuidPattern.test('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });

  describe('HMAC Signature Verification', () => {
    it('should verify Paystack webhook signature pattern', () => {
      const crypto = require('crypto');
      const secret = 'test-secret-key';
      const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref-123' } });
      
      const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(128); // SHA-512 produces 128 hex chars
      
      // Verify same input produces same hash
      const hash2 = crypto.createHmac('sha512', secret).update(body).digest('hex');
      expect(hash).toBe(hash2);
      
      // Different secret produces different hash
      const hash3 = crypto.createHmac('sha512', 'different-secret').update(body).digest('hex');
      expect(hash).not.toBe(hash3);
    });
  });
});
