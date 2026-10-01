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
}
