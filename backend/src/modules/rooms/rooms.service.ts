import { AppError } from '../../utils/app-error';
import { roomsRepository } from './rooms.repository';
import { prisma } from '../../config/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '../../config/cloudinary';
import {
  CreateRoomDTO,
  RoomDetail,
  RoomListForLandlord,
  UpdateRoomDTO,
} from './rooms.types';

const CLOUDINARY_FOLDER = 'room_rental/rooms';

export class RoomsService {
  /** Public-ish listing of all rooms currently marked AVAILABLE */
  async listAvailable() {
    return roomsRepository.findAvailable();
  }

  /** Landlord's room list with optional filters */
  async listForLandlord(
    landlordId: number,
    filters: { status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' }
  ): Promise<RoomListForLandlord[]> {
    return roomsRepository.findByLandlord(landlordId, filters);
  }

  /** Get one room with detail, verifying landlord ownership */
  async getById(id: number, landlordId: number): Promise<RoomDetail> {
    const room = await roomsRepository.findByIdWithDetail(id);
    if (!room) throw new AppError('Phòng không tồn tại', 404, 'NOT_FOUND');
    if (room.landlordId !== landlordId) {
      throw new AppError('Bạn không có quyền truy cập phòng này', 403, 'FORBIDDEN');
    }

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      price: Number(room.price),
      area: room.area ? Number(room.area) : null,
      status: room.status,
      description: room.description,
      address: room.address,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      images: room.images,
      contractCount: room._count.contracts,
    };
  }

  /** Create a new room + upload images to Cloudinary */
  async create(
    landlordId: number,
    dto: CreateRoomDTO,
    files?: Express.Multer.File[]
  ): Promise<RoomListForLandlord> {
    // Check duplicate roomNumber for this landlord
    const existing = await prisma.room.findUnique({
      where: {
        uq_landlord_room_number: {
          landlordId,
          roomNumber: dto.roomNumber.trim(),
        },
      },
    });
    if (existing) {
      throw new AppError(
        `Số phòng "${dto.roomNumber}" đã tồn tại trong danh mục của bạn`,
        409,
        'ROOM_NUMBER_DUPLICATE'
      );
    }

    // Upload images to Cloudinary first (sequential to avoid rate limits)
    let imageRecords: { url: string; position: number }[] = [];
    if (files && files.length > 0) {
      try {
        const uploads = await Promise.all(
          files.map((file, i) =>
            uploadToCloudinary(file.buffer, CLOUDINARY_FOLDER, file.originalname).then((url) => ({
              url,
              position: i,
            }))
          )
        );
        imageRecords = uploads;
      } catch (uploadErr) {
        throw new AppError(
          `Upload ảnh thất bại: ${(uploadErr as Error).message}`,
          500,
          'UPLOAD_FAILED'
        );
      }
    }

    // Create room + image records in one transaction
    const room = await prisma.room.create({
      data: {
        landlordId,
        roomNumber: dto.roomNumber.trim(),
        address: dto.address.trim(),
        floor: dto.floor ?? null,
        price: dto.price,
        area: dto.area ?? null,
        status: dto.status ?? 'AVAILABLE',
        description: dto.description?.trim() ?? null,
        images:
          imageRecords.length > 0
            ? {
                create: imageRecords,
              }
            : undefined,
      },
      include: { _count: { select: { images: true } } },
    });

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      price: Number(room.price),
      area: room.area ? Number(room.area) : null,
      status: room.status,
      description: room.description,
      address: room.address,
      imageCount: room._count.images,
    };
  }

  /** Update a room + optionally upload new images to Cloudinary */
  async update(
    id: number,
    landlordId: number,
    dto: UpdateRoomDTO,
    files?: Express.Multer.File[]
  ): Promise<RoomListForLandlord> {
    const room = await roomsRepository.findById(id);
    if (!room) throw new AppError('Phòng không tồn tại', 404, 'NOT_FOUND');
    if (room.landlordId !== landlordId) {
      throw new AppError('Bạn không có quyền cập nhật phòng này', 403, 'FORBIDDEN');
    }

    // If changing roomNumber, check duplicate
    if (dto.roomNumber !== undefined && dto.roomNumber.trim() !== room.roomNumber) {
      const dup = await prisma.room.findUnique({
        where: {
          uq_landlord_room_number: {
            landlordId,
            roomNumber: dto.roomNumber.trim(),
          },
        },
      });
      if (dup && dup.id !== id) {
        throw new AppError(
          `Số phòng "${dto.roomNumber}" đã tồn tại trong danh mục của bạn`,
          409,
          'ROOM_NUMBER_DUPLICATE'
        );
      }
    }

    // Upload new images if any
    let newImageRecords: { url: string; position: number }[] = [];
    if (files && files.length > 0) {
      try {
        const lastImage = await prisma.roomImage.findFirst({
          where: { roomId: id },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const startPos = (lastImage?.position ?? -1) + 1;

        const uploads = await Promise.all(
          files.map((file, i) =>
            uploadToCloudinary(file.buffer, CLOUDINARY_FOLDER, file.originalname).then((url) => ({
              url,
              position: startPos + i,
            }))
          )
        );
        newImageRecords = uploads;
      } catch (uploadErr) {
        throw new AppError(
          `Upload ảnh thất bại: ${(uploadErr as Error).message}`,
          500,
          'UPLOAD_FAILED'
        );
      }
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        roomNumber: dto.roomNumber?.trim(),
        address: dto.address?.trim(),
        floor: dto.floor !== undefined ? dto.floor : undefined,
        price: dto.price,
        area: dto.area !== undefined ? dto.area : undefined,
        status: dto.status,
        description: dto.description?.trim() ?? undefined,
        images:
          newImageRecords.length > 0
            ? { create: newImageRecords }
            : undefined,
      },
      include: { _count: { select: { images: true } } },
    });

    return {
      id: updated.id,
      roomNumber: updated.roomNumber,
      floor: updated.floor,
      price: Number(updated.price),
      area: updated.area ? Number(updated.area) : null,
      status: updated.status,
      description: updated.description,
      address: updated.address,
      imageCount: updated._count.images,
    };
  }

  /** Delete a room — refuses if it has active contracts. Cleans up Cloudinary images too. */
  async delete(id: number, landlordId: number): Promise<void> {
    const room = await roomsRepository.findById(id);
    if (!room) throw new AppError('Phòng không tồn tại', 404, 'NOT_FOUND');
    if (room.landlordId !== landlordId) {
      throw new AppError('Bạn không có quyền xóa phòng này', 403, 'FORBIDDEN');
    }

    const activeContracts = await roomsRepository.countActiveContracts(id);
    if (activeContracts > 0) {
      throw new AppError(
        `Không thể xóa phòng đang có ${activeContracts} hợp đồng (chờ duyệt hoặc đang hiệu lực).`,
        400,
        'ROOM_HAS_ACTIVE_CONTRACTS'
      );
    }

    // Get image URLs BEFORE deleting room (CASCADE will delete DB rows)
    const images = await prisma.roomImage.findMany({
      where: { roomId: id },
      select: { url: true },
    });

    await roomsRepository.delete(id);

    // Fire-and-forget cleanup of Cloudinary images
    Promise.all(images.map((img) => deleteFromCloudinary(img.url))).catch(() => {});
  }
}

export const roomsService = new RoomsService();
