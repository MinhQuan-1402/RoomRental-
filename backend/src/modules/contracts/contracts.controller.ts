import { Request, Response, NextFunction } from 'express';
import { contractsService } from './contracts.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/app-error';

export class ContractsController {
  /**
   * GET /api/contracts/my-active
   * Returns the ACTIVE contract for the logged-in user (if any).
   * Returns 200 with `data: null` when the user has no active contract —
   * that's not an error, it's a real state (tenant hasn't rented yet).
   */
  getMyActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      }

      const contract = await contractsService.getMyActiveContract(Number(req.user.userId));

      sendSuccess({
        res,
        message: contract
          ? 'Lấy hợp đồng đang thuê thành công'
          : 'Bạn chưa có hợp đồng đang thuê',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const contractsController = new ContractsController();
