import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import { UserRole } from '../modules/users/user.types';

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // 1. Check if user is authenticated
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    // 2. Check if user's role is allowed
    if (!roles.includes(req.user.role)) {
      throw new AppError('Bạn không có quyền truy cập tài nguyên này', 403, 'FORBIDDEN');
    }

    next();
  };
};
