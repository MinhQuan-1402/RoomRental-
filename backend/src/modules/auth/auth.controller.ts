import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from './auth.service';
import {
  googleLoginSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from './auth.validation';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/app-error';

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = registerSchema.parse(req.body); 
      const user = await this.service.register(validatedData);

      sendSuccess({
        res,
        statusCode: 201,
        message: 'Đăng ký tài khoản thành công',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await this.service.login(validatedData);

      sendSuccess({
        res,
        statusCode: 200,
        message: 'Đăng nhập thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = refreshTokenSchema.parse(req.body);
      const result = await this.service.refresh(validatedData.refreshToken);

      sendSuccess({
        res,
        statusCode: 200,
        message: 'Cấp mới access token thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      }

      await this.service.logout(req.user.userId);

      sendSuccess({
        res,
        statusCode: 200,
        message: 'Đăng xuất thành công',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      }

      const user = await this.service.getMe(req.user.userId);

      sendSuccess({
        res,
        statusCode: 200,
        message: 'Lấy thông tin người dùng thành công',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Google OAuth login.
   * Body: { idToken: string, role?: 'LANDLORD' | 'TENANT' }
   * - Verifies Google ID token
   * - If user exists (by googleId or linked email), logs them in
   * - Otherwise creates a new account
   */
  loginWithGoogle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = googleLoginSchema.parse(req.body);
      const result = await this.service.loginWithGoogle(validatedData);

      sendSuccess({
        res,
        statusCode: 200,
        message: 'Đăng nhập bằng Google thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
