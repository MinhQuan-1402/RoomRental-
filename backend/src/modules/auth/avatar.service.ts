import { userRepository, type UserRepository } from '../users/user.repository';
import { avatarStorage, type AvatarStorage } from './avatar.storage';
import { validateAvatar } from './avatar.validation';
import { AppError } from '../../utils/app-error';

export class AvatarService {
  constructor(
    private users: Pick<UserRepository, 'findById' | 'updateAvatar'> = userRepository,
    private storage: AvatarStorage = avatarStorage,
  ) {}

  async upload(userId: string, file: Express.Multer.File | undefined) {
    const id = Number(userId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError('Phiên đăng nhập không hợp lệ', 401, 'UNAUTHORIZED');
    const buffer = validateAvatar(file);
    const current = await this.users.findById(id);
    if (!current) throw new AppError('Người dùng không tồn tại', 404, 'NOT_FOUND');
    if (!current.isActive) throw new AppError('Tài khoản đã bị vô hiệu hóa', 403, 'ACCOUNT_INACTIVE');
    const url = await this.storage.upload(id, buffer);
    let updated;
    try { updated = await this.users.updateAvatar(id, url); }
    catch (error) {
      await this.storage.remove(id, url).catch(() => undefined);
      throw error;
    }
    // A failed cleanup must not undo a successfully saved profile.
    if (current.avatarUrl) await this.storage.remove(id, current.avatarUrl).catch(() => undefined);
    return updated;
  }
}

export const avatarService = new AvatarService();
