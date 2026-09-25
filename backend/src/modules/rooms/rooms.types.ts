// ─── Room image ────────────────────────────────────────────────────────────────
export interface RoomImage {
  id: number;
  roomId: number;
  url: string;
  position: number;
  createdAt: Date;
}

// ─── Tenant-facing list ────────────────────────────────────────────────────────
export interface RoomListItem {
  id: number;
  roomNumber: string;
  floor: number | null;
  price: number;
  area: number | null;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  description: string | null;
  address: string;
  images: { url: string }[];
}

// ─── Landlord CRUD types ───────────────────────────────────────────────────────
export const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export interface CreateRoomDTO {
  roomNumber: string;
  address: string;
  floor?: number;
  price: number;
  area?: number;
  status?: RoomStatus;
  description?: string;
}

export interface UpdateRoomDTO {
  roomNumber?: string;
  address?: string;
  floor?: number;
  price?: number;
  area?: number;
  status?: RoomStatus;
  description?: string;
}

export interface RoomDetail {
  id: number;
  roomNumber: string;
  floor: number | null;
  price: number;
  area: number | null;
  status: RoomStatus;
  description: string | null;
  address: string;
  createdAt: Date;
  updatedAt: Date;
  images: RoomImage[];
  contractCount: number;
}

export interface RoomListForLandlord {
  id: number;
  roomNumber: string;
  floor: number | null;
  price: number;
  area: number | null;
  status: RoomStatus;
  description: string | null;
  address: string;
  images: { url: string }[];
  imageCount: number;
}
