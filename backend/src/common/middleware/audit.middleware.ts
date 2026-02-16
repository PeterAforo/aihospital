import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { AuditService } from '../services/audit.service.js';

/**
 * Middleware that automatically logs all mutating API requests (POST, PUT, DELETE, PATCH)
 * to the audit_logs table. Runs AFTER the response is sent so it doesn't slow down requests.
 */
export function auditLogger(req: AuthRequest, res: Response, next: NextFunction) {
  // Only audit mutating methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Skip auth endpoints (login/register) — they handle their own logging
  const skipPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];
  if (skipPaths.some(p => req.originalUrl.startsWith(p))) {
    return next();
  }

  // Capture the original res.json to intercept the response
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Log asynchronously after response is sent
    setImmediate(async () => {
      try {
        // Determine resource type and ID from the URL
        const urlParts = req.originalUrl.replace(/\?.*$/, '').split('/').filter(Boolean);
        // e.g. /api/patients/123 → resourceType=patients, resourceId=123
        // e.g. /api/emr/encounters/123/diagnoses → resourceType=encounters, resourceId=123
        let resourceType = '';
        let resourceId = '';

        for (let i = 0; i < urlParts.length; i++) {
          const part = urlParts[i];
          // Skip 'api' prefix
          if (part === 'api') continue;
          // If next part looks like a UUID or ID, this part is the resource type
          const nextPart = urlParts[i + 1];
          if (nextPart && /^[0-9a-f-]{8,}$/i.test(nextPart)) {
            resourceType = part;
            resourceId = nextPart;
          }
        }

        // Fallback: use the last meaningful path segment as resource type
        if (!resourceType) {
          const meaningful = urlParts.filter(p => p !== 'api');
          resourceType = meaningful[meaningful.length - 1] || 'unknown';
        }

        // Derive action from method + resource
        const actionMap: Record<string, string> = {
          POST: 'CREATE',
          PUT: 'UPDATE',
          PATCH: 'UPDATE',
          DELETE: 'DELETE',
        };
        const action = `${actionMap[req.method]}_${resourceType.toUpperCase().replace(/-/g, '_')}`;

        // Redact sensitive fields from request body
        const safeBody = redactSensitive(req.body);

        await AuditService.log({
          tenantId: req.tenantId || req.user?.tenantId,
          branchId: req.user?.branchId,
          departmentId: req.user?.departmentId,
          userId: req.user?.userId,
          action,
          resourceType,
          resourceId: resourceId || body?.data?.id || undefined,
          newData: safeBody,
          ipAddress: req.ip || req.socket?.remoteAddress,
          userAgent: req.headers['user-agent'],
          requestMethod: req.method,
          requestPath: req.originalUrl,
          responseStatus: res.statusCode,
        });
      } catch (error) {
        // Never let audit logging break the application
        console.error('Audit middleware error:', error);
      }
    });

    return originalJson(body);
  };

  next();
}

/**
 * Redact sensitive fields from request body before logging
 */
function redactSensitive(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sensitiveKeys = ['password', 'newPassword', 'oldPassword', 'confirmPassword', 'token', 'refreshToken', 'accessToken', 'secret', 'mfaSecret', 'creditCard', 'cvv'];
  const result: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
