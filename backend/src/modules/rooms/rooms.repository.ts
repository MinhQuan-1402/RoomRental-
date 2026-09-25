import { prisma } from '../../config/prisma';
import { RoomListItem, RoomListForLandlord } from './rooms.types';

export class RoomsRepository {
  /**
   * List all rooms with status AVAILABLE — for tenant browse screen.
   */
  async findAvailable(): Promise<RoomListItem[]> {
    const rows = await prisma.room.findMany({
      where: { status: 'AVAILABLE' },
      include: {
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: { url: true },
        },
      },
      orderBy: [{ landlordId: 'asc' }, { floor: 'asc' }, { roomNumber: 'asc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      floor: r.floor,
      price: Number(r.price),
      area: r.area ? Number(r.area) : null,
      status: r.status,
      description: r.description,
      address: r.address,
      images: r.images,
    }));
  }

  /**
   * List rooms owned by a specific landlord, with optional status filter.
   */
  async findByLandlord(
    landlordId: number,
    filters: { status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' } = {}
  ): Promise<RoomListForLandlord[]> {
    const rows = await prisma.room.findMany({
      where: {
        landlordId,
        ...(filters.status !== undefined && { status: filters.status }),
      },
      include: {
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: { url: true },
        },
        _count: { select: { images: true } },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      floor: r.floor,
      price: Number(r.price),
      area: r.area ? Number(r.area) : null,
      status: r.status,
      description: r.description,
      address: r.address,
      images: r.images,
      imageCount: r._count.images,
    }));
  }

  /**
   * Find one room by id
   */
  async findById(id: number) {
    return prisma.room.findUnique({ where: { id } });
  }

  /**
   * Find one room with images + contract count for the detail page
   */
  async findByIdWithDetail(id: number) {
    return prisma.room.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        _count: { select: { contracts: true } },
      },
    });
  }

  /**
   * Create a new room.
   */
  async create(data: {
    landlordId: number;
    roomNumber: string;
    address: string;
    floor: number | null;
    price: number;
    area: number | null;
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
    description: string | null;
  }) {
    return prisma.room.create({ data });
  }

  /**
   * Update a room by id
   */
  async update(
    id: number,
    data: {
      roomNumber?: string;
      address?: string;
      floor?: number | null;
      price?: number;
      area?: number | null;
      status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
      description?: string | null;
    }
  ) {
    return prisma.room.update({ where: { id }, data });
  }

  /**
   * Delete a room by id
   */
  async delete(id: number) {
    return prisma.room.delete({ where: { id } });
  }

  /**
   * Count active contracts on this room (safety check before delete)
   */
  async countActiveContracts(roomId: number): Promise<number> {
    return prisma.contract.count({
      where: { roomId, status: { in: ['PENDING', 'ACTIVE'] } },
    });
  }
}

export const roomsRepository = new RoomsRepository();
