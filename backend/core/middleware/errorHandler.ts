import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ZodError } from 'zod';
import { logger } from '../logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { statusCode: err.statusCode });
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.details || {})
    });
    return;
  }

  if (err instanceof ZodError || err.name === 'ZodError') {
    const zodErr = err as ZodError;
    logger.warn(`Validation Error: ${zodErr.message}`);
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: zodErr.issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
    });
    return;
  }

  logger.error(`Unhandled Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
};
