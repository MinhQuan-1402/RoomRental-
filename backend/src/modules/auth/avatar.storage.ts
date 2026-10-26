import { randomUUID } from 'node:crypto';
import { cloudinary } from '../../config/cloudinary';
import { env } from '../../config/env';
import { AppError } from '../../utils/app-error';

export interface AvatarStorage {
  upload(userId: number, buffer: Buffer): Promise<string>;
  remove(userId: number, url: string): Promise<void>;
}

/** Only remove images created by this feature for the current user. */
export function ownedAvatarPublicId(userId: number, url: string, cloudName: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;
    const prefix = `/${cloudName}/image/upload/`;
    if (!parsed.pathname.startsWith(prefix)) return null;
    const match = parsed.pathname.slice(prefix.length).match(new RegExp(`^(?:v\\d+/)?(room_rental/avatars/user-${userId}-[a-f0-9-]+)\\.webp$`));
    return match?.[1] ?? null;
  } catch { return null; }
}

export const avatarStorage: AvatarStorage = {
  upload(userId, buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: 'room_rental/avatars',
        public_id: `user-${userId}-${randomUUID()}`,
        resource_type: 'image',
        format: 'webp',
        transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'auto' }],
        quality: 'auto',
        timeout: 60000,
      }, (error, result) => {
        if (error || !result?.secure_url) {
          reject(new AppError('Không thể xử lý hoặc tải ảnh lên. Vui lòng thử ảnh khác hoặc thử lại sau.', 502, 'AVATAR_UPLOAD_FAILED'));
        } else resolve(result.secure_url);
      });
      stream.end(buffer);
    });
  },
  async remove(userId, url) {
    const publicId = ownedAvatarPublicId(userId, url, env.CLOUDINARY_CLOUD_NAME ?? '');
    if (publicId) await cloudinary.uploader.destroy(publicId, { invalidate: true });
  },
};
