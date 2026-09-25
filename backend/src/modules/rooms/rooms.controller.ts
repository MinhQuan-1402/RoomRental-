import { Request, Response, NextFunction } from 'express';
import { roomsService } from './rooms.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/app-error';
import { createRoomSchema, updateRoomSchema } from './rooms.validation';
import { uploadToCloudinary, deleteFromCloudinary } from '../../config/cloudinary';
import { prisma } from '../../config/prisma';

const CLOUDINARY_FOLDER = 'room_rental/rooms';

export class RoomsController {
  /** GET /api/rooms/available — tenant browse */
  listAvailable = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rooms = await roomsService.listAvailable();
      sendSuccess({ res, message: 'Lấy danh sách phòng trống thành công', data: rooms });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/rooms — landlord lists their rooms (filters via query) */
  listForLandlord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');

      const statusRaw = req.query.status;
      const status =
        statusRaw === 'AVAILABLE' || statusRaw === 'OCCUPIED' || statusRaw === 'MAINTENANCE'
          ? statusRaw
          : undefined;

      const rooms = await roomsService.listForLandlord(Number(req.user.userId), { status });
      sendSuccess({ res, message: 'Lấy danh sách phòng thành công', data: rooms });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/rooms/:id — landlord */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError('ID phòng không hợp lệ', 400, 'INVALID_ID');
      }
      const room = await roomsService.getById(id, Number(req.user.userId));
      sendSuccess({ res, message: 'Lấy thông tin phòng thành công', data: room });
    } catch (error) {
      next(error);
    }
  };

  /** POST /api/rooms — landlord (multipart/form-data for images) */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');

      // Parse body (Zod expects plain object, req.body is already parsed by express)
      const dto = createRoomSchema.parse(req.body);

      // req.file(s) from multer — images uploaded before text fields arrive
      const files = req.files as Express.Multer.File[] | undefined;
      const room = await roomsService.create(Number(req.user.userId), dto, files);
      sendSuccess({ res, statusCode: 201, message: 'Tạo phòng thành công', data: room });
    } catch (error) {
      next(error);
    }
  };

  /** PUT /api/rooms/:id — landlord (multipart/form-data for images) */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError('ID phòng không hợp lệ', 400, 'INVALID_ID');
      }
      const dto = updateRoomSchema.parse(req.body);
      const files = req.files as Express.Multer.File[] | undefined;
      const room = await roomsService.update(id, Number(req.user.userId), dto, files);
      sendSuccess({ res, message: 'Cập nhật phòng thành công', data: room });
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /api/rooms/:id — landlord */
  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError('ID phòng không hợp lệ', 400, 'INVALID_ID');
      }
      await roomsService.delete(id, Number(req.user.userId));
      sendSuccess({ res, message: 'Xóa phòng thành công', data: null });
    } catch (error) {
      next(error);
    }
  };

  /** POST /api/rooms/:id/images — landlord adds more images (uploaded to Cloudinary) */
  addImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      const roomId = Number(req.params.id);
      if (!Number.isInteger(roomId) || roomId <= 0) {
        throw new AppError('ID phòng không hợp lệ', 400, 'INVALID_ID');
      }
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw new AppError('Vui lòng chọn ít nhất một ảnh', 400, 'NO_FILE');
      }

      const room = await roomsService.getById(roomId, Number(req.user.userId));

      // Upload all to Cloudinary
      let uploadedUrls: string[];
      try {
        uploadedUrls = await Promise.all(
          files.map((file) =>
            uploadToCloudinary(file.buffer, CLOUDINARY_FOLDER, file.originalname)
          )
        );
      } catch (uploadErr) {
        throw new AppError(
          `Upload ảnh thất bại: ${(uploadErr as Error).message}`,
          500,
          'UPLOAD_FAILED'
        );
      }

      const lastImage = await prisma.roomImage.findFirst({
        where: { roomId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const startPos = (lastImage?.position ?? -1) + 1;

      const images = await Promise.all(
        uploadedUrls.map((url, i) =>
          prisma.roomImage.create({
            data: {
              roomId,
              url,
              position: startPos + i,
            },
          })
        )
      );

      sendSuccess({ res, statusCode: 201, message: `Đã thêm ${images.length} ảnh`, data: images });
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /api/rooms/:roomId/images/:imageId — landlord removes one image (also delete from Cloudinary) */
  removeImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
      const roomId = Number(req.params.roomId);
      const imageId = Number(req.params.imageId);
      if (!Number.isInteger(roomId) || roomId <= 0 || !Number.isInteger(imageId) || imageId <= 0) {
        throw new AppError('ID không hợp lệ', 400, 'INVALID_ID');
      }

      // Verify ownership
      await roomsService.getById(roomId, Number(req.user.userId));

      const image = await prisma.roomImage.findUnique({ where: { id: imageId } });
      if (!image || image.roomId !== roomId) {
        throw new AppError('Ảnh không tồn tại', 404, 'NOT_FOUND');
      }

      // Delete DB record first, then attempt to remove from Cloudinary
      // (don't fail the request if Cloudinary delete fails — DB is source of truth)
      await prisma.roomImage.delete({ where: { id: imageId } });

      // Fire-and-forget Cloudinary deletion (don't await to keep response fast)
      deleteFromCloudinary(image.url).catch(() => {});

      sendSuccess({ res, message: 'Đã xóa ảnh', data: null });
    } catch (error) {
      next(error);
    }
  };
}

export const roomsController = new RoomsController();
