import { AppError } from '../../utils/app-error';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateAvatar(file: Pick<Express.Multer.File, 'buffer' | 'mimetype'> | undefined): Buffer {
  if (!file?.buffer.length) throw new AppError('Vui lòng chọn ảnh đại diện', 400, 'AVATAR_REQUIRED');
  const { buffer, mimetype } = file;
  if (buffer.length > MAX_AVATAR_BYTES) throw new AppError('Ảnh đại diện không được vượt quá 5 MB', 413, 'FILE_TOO_LARGE');
  const valid = (mimetype === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    || (mimetype === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (mimetype === 'image/webp' && buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP');
  if (!valid) throw new AppError('Ảnh không hợp lệ. Vui lòng chọn ảnh JPEG, PNG hoặc WebP', 400, 'INVALID_AVATAR');
  return buffer;
}
