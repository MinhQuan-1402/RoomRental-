export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";

export interface RoomImage {
  id: number;
  roomId: number;
  url: string;
  position: number;
}

export interface RoomListItem {
  id: number;
  roomNumber: string;
  floor: number | null;
  price: number;
  area: number | null;
  status: RoomStatus;
  description: string | null;
  address: string;
  images: { url: string }[];
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
  createdAt: string;
  updatedAt: string;
  images: RoomImage[];
  contractCount: number;
}

export interface CreateRoomPayload {
  roomNumber: string;
  address: string;
  floor?: number;
  price: number;
  area?: number;
  status?: RoomStatus;
  description?: string;
}

export interface UpdateRoomPayload {
  roomNumber?: string;
  address?: string;
  floor?: number;
  price?: number;
  area?: number;
  status?: RoomStatus;
  description?: string;
}
