import { Request, Response } from 'express';
import { sendError } from '../utils/api-response.js';

export const notFoundHandler = (req: Request, res: Response): Response => {
  return sendError(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    undefined,
    'NOT_FOUND'
  );
};
