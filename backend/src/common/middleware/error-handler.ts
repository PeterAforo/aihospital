import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/api-response.js';

// Optional Sentry integration — only active when SENTRY_DSN is set
let Sentry: any = null;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      beforeSend(event: any) {
        // Strip sensitive data
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
    });
    logger.info('[SENTRY] Error monitoring initialized');
  } catch {
    logger.warn('[SENTRY] @sentry/node not installed — error monitoring disabled');
  }
}

export class AppError extends Error {
  statusCode: number;
  code?: string;
  isOperational: boolean;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path });

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, undefined, err.code);
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] || 'field';
      return sendError(res, `A record with this ${field} already exists`, 409, undefined, 'DUPLICATE_ENTRY');
    }
    if (prismaError.code === 'P2025') {
      return sendError(res, 'Record not found', 404, undefined, 'NOT_FOUND');
    }
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    logger.error(`ZodError details: ${JSON.stringify(err.errors)}`);
    return sendError(res, `Validation error: ${messages}`, 400, undefined, 'VALIDATION_ERROR');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return sendError(res, 'Validation failed', 400, undefined, 'VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401, undefined, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401, undefined, 'TOKEN_EXPIRED');
  }

  // Report unhandled errors to Sentry
  if (Sentry) {
    Sentry.withScope((scope: any) => {
      scope.setTag('path', req.path);
      scope.setTag('method', req.method);
      scope.setExtra('query', req.query);
      scope.setExtra('body', req.body);
      if ((req as any).user) {
        scope.setUser({ id: (req as any).user.userId, role: (req as any).user.role });
      }
      Sentry.captureException(err);
    });
  }

  // Default error
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return sendError(res, message, statusCode, undefined, 'INTERNAL_ERROR');
};
