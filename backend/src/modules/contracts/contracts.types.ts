// ─── Contracts types ───────────────────────────────────────────────────────────
export interface MyActiveContract {
  id: number;
  startDate: Date;
  endDate: Date;
  rentPrice: number;
  deposit: number;
  billingDay: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  terms: string | null;
  room: {
    id: number;
    roomNumber: string;
    floor: number | null;
    area: number | null;
    description: string | null;
    address: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  };
  tenant: {
    id: number;
    fullName: string;
    phone: string;
    email: string | null;
  };

  // ⭐ Contract file metadata — null if landlord hasn't uploaded any file yet
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  fileVersion: number;
  fileUploadedAt: Date | null;
}

/**
 * Subset returned by GET /api/contracts/:id/file
 * (just the file metadata, no full contract payload)
 */
export interface ContractFileInfo {
  contractId: number;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  fileVersion: number;
  fileUploadedAt: Date;
  downloadUrl: string;
}
