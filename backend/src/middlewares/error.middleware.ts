import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';
import { env } from '../config/env';

/**
 * Detect a Multer error and translate it to a friendly AppError so the
 * client gets a proper 4xx instead of a 500.
 */
function mapMulterError(err: unknown): AppError | null {
  if (!(err instanceof multer.MulterError)) return null;

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError(
        'File vượt quá dung lượng cho phép (tối đa 10MB)',
        413,
        'FILE_TOO_LARGE'
      );
    case 'LIMIT_FILE_COUNT':
      return new AppError(
        'Chỉ được upload một file mỗi lần',
        400,
        'TOO_MANY_FILES'
      );
    case 'LIMIT_UNEXPECTED_FILE':
      return new AppError(
        `Trường upload không hợp lệ: ${err.field}`,
        400,
        'UNEXPECTED_FILE_FIELD'
      );
    case 'LIMIT_FIELD_COUNT':
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
      return new AppError(
        'Dữ liệu form không hợp lệ',
        400,
        'INVALID_FORM'
      );
    default:
      return new AppError(
        `Lỗi upload: ${err.message}`,
        400,
        'UPLOAD_ERROR'
      );
  }
}

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

  // Multer errors first — they're a special kind of Error
  const multerErr = mapMulterError(err);
  if (multerErr) {
    statusCode = multerErr.statusCode;
    code = multerErr.code;
    message = multerErr.message;
  }
  // Handle operational AppError
  else if (err instanceof AppError) {
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
  // Handle generic Error — try to recognize multer's fileFilter rejection
  // (when we pass a non-MulterError to its callback, multer forwards it as a
  // plain Error with the message we set.)
  else if (err instanceof Error) {
    // Heuristic: multer fileFilter rejections bubble up as plain Error here.
    if (/PDF|pdf/i.test(err.message) && /chỉ|chấp/i.test(err.message)) {
      statusCode = 400;
      code = 'INVALID_FILE_TYPE';
      message = err.message;
    } else {
      message = err.message;
    }
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
