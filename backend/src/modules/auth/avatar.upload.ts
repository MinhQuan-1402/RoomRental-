import type { RequestHandler } from 'express';
import multer from 'multer';
import { AppError } from '../../utils/app-error';
import { AVATAR_MIME_TYPES, MAX_AVATAR_BYTES } from './avatar.validation';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP', 400, 'INVALID_AVATAR'));
  },
}).single('avatar');

export const uploadAvatar: RequestHandler = (req, res, next) => {
  upload(req, res, error => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Ảnh đại diện không được vượt quá 5 MB', 413, 'FILE_TOO_LARGE'));
    }
    next(error);
  });
};
