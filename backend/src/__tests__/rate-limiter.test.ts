import { apiLimiter, authLimiter, passwordResetLimiter, webhookLimiter } from '../common/middleware/rate-limiter';

describe('Rate Limiter Middleware', () => {
  it('apiLimiter should be defined', () => {
    expect(apiLimiter).toBeDefined();
    expect(typeof apiLimiter).toBe('function');
  });

  it('authLimiter should be defined', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('passwordResetLimiter should be defined', () => {
    expect(passwordResetLimiter).toBeDefined();
    expect(typeof passwordResetLimiter).toBe('function');
  });

  it('webhookLimiter should be defined', () => {
    expect(webhookLimiter).toBeDefined();
    expect(typeof webhookLimiter).toBe('function');
  });
});
