import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/app-error';

export class DashboardController {
  /**
   * GET /api/dashboard/landlord-stats
   * Trả về thống kê tổng quan cho landlord.
   */
  getLandlordStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Vui lòng đăng nhập', 401, 'UNAUTHORIZED');
      if (req.user.role !== 'LANDLORD' && req.user.role !== 'ADMIN') {
        throw new AppError('Chỉ chủ trọ mới có thể xem dashboard', 403, 'FORBIDDEN');
      }
      const stats = await dashboardService.getLandlordStats(Number(req.user.userId));
      sendSuccess({ res, message: 'Lấy thống kê dashboard thành công', data: stats });
    } catch (error) {
      next(error);
    }
  };
}

export const dashboardController = new DashboardController();
