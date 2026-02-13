import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/api-response.js';

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

  // Default error
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return sendError(res, message, statusCode, undefined, 'INTERNAL_ERROR');
};
