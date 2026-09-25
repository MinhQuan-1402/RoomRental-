export interface PropertySummary {
  id: number;
  name: string;
  address: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  roomCount: number;
  contractCount: number;
}

export interface PropertyDetail {
  id: number;
  name: string;
  address: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  rooms: {
    id: number;
    roomNumber: string;
    floor: number | null;
    price: number;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  }[];
  contractCount: number;
}

export interface CreatePropertyPayload {
  name: string;
  address: string;
  description?: string;
}

export interface UpdatePropertyPayload {
  name?: string;
  address?: string;
  description?: string;
}
