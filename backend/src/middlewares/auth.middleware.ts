import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';
import { JWTPayload } from '../modules/auth/auth.types';

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  // khi FE gửi req lên thì nó sẽ có header Authorization: Bearer <access_token>, thì authHeader sẽ là "Bearer <access_token>"

  // 1. Check if Authorization header is present and properly formatted
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  // tách chuỗi tại dấu " " rồi sẽ thành 1 mảng là ["Bearer", "<access_token>"] và lấy phần tử thứ 2 là <access_token>
  if (!token) {
    throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
  }

  // 2. Verify Access Token
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;

    if (!payload.userId || !payload.role) {
      throw new AppError('Access token không hợp lệ', 401, 'INVALID_TOKEN');
    }

    // 3. Gửi thông tin user đã xác thực vào req
    req.user = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    };

    next();
  } catch (error) { // instanceof là để kiểm tra object này có thuộc class AppError không
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Access token đã hết hạn', 401, 'TOKEN_EXPIRED'));
      return;
    }
    next(new AppError('Access token không hợp lệ', 401, 'INVALID_TOKEN'));
  }
};
