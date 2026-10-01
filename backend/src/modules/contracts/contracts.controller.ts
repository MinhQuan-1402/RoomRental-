import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
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

  /**
   * GET /api/contracts
   * Returns all contracts owned by the logged-in landlord.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      }

      const contracts = await contractsService.listContractsForLandlord(
        Number(req.user.userId)
      );

      sendSuccess({
        res,
        message: 'Lấy danh sách hợp đồng thành công',
        data: contracts,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/contracts/:id/file
   * Landlord uploads (or replaces) the contract PDF.
   * Multipart/form-data with `file` field.
   */
  uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      }
      if (!req.file) {
        throw new AppError('Vui lòng chọn file hợp đồng', 400, 'NO_FILE');
      }

      const contractId = Number(req.params.id);
      if (!Number.isInteger(contractId) || contractId <= 0) {
        // multer wrote a temp file even for invalid id — clean up
        await fs.promises.unlink(req.file.path).catch(() => {});
        throw new AppError('Mã hợp đồng không hợp lệ', 400, 'INVALID_ID');
      }

      const info = await contractsService.uploadContractFile({
        contractId,
        userId: Number(req.user.userId),
        file: req.file,
      });

      sendSuccess({
        res,
        message: 'Upload hợp đồng thành công',
        data: info,
      });
    } catch (error) {
      // Best-effort cleanup of temp upload on any error
      if (req.file?.path) {
        fs.promises.unlink(req.file.path).catch(() => {});
      }
      next(error);
    }
  };

  /**
   * GET /api/contracts/:id/file
   * Returns file metadata only (no binary). 200 with `data: null` if no file.
   */
  getFileInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      }

      const contractId = Number(req.params.id);
      if (!Number.isInteger(contractId) || contractId <= 0) {
        throw new AppError('Mã hợp đồng không hợp lệ', 400, 'INVALID_ID');
      }

      const info = await contractsService.getContractFileInfo({
        contractId,
        userId: Number(req.user.userId),
      });

      sendSuccess({
        res,
        message: info
          ? 'Lấy thông tin file hợp đồng thành công'
          : 'Hợp đồng chưa có file đính kèm',
        data: info,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/contracts/:id/file/download
   * Streams the file back as a download. Browser will save as `fileName`.
   */
  downloadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      }

      const contractId = Number(req.params.id);
      if (!Number.isInteger(contractId) || contractId <= 0) {
        throw new AppError('Mã hợp đồng không hợp lệ', 400, 'INVALID_ID');
      }

      const { filePath, fileName, mimeType } =
        await contractsService.getContractFileForDownload({
          contractId,
          userId: Number(req.user.userId),
        });

      // ASCII-safe fallback for Content-Disposition filename* header
      const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_');
      const encodedName = encodeURIComponent(fileName);

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Use res.sendFile so Express handles range/etag properly
      res.sendFile(path.resolve(filePath), (err) => {
        if (err && !res.headersSent) {
          next(err);
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

export const contractsController = new ContractsController();
