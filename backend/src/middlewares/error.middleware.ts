import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';
import { env } from '../config/env';

export const errorMiddleware: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Something went wrong';
  let details: unknown = undefined;

  // Handle operational AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.flatten();
  }
  // Handle generic error
  else if (err instanceof Error) {
    message = err.message;
  }

  // Development logging
  if (env.NODE_ENV === 'development') {
    console.error('❌ [Error Handler]:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === 'development' && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
};
