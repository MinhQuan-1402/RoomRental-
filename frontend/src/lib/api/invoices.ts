import { api } from '@/lib/api-client';

export interface InvoiceCandidate {
  contractId: number;
  roomId: number;
  roomNumber: string;
  roomAddress: string;
  tenantName: string;
  rentPrice: number;
  startDate: string;
  endDate: string;
  partialMonth: boolean;
  electricityPrevious: number | null;
  waterPrevious: number | null;
  previousBillingMonth: string | null;
  electricityUnitPrice: number | null;
  waterUnitPrice: number | null;
  serviceFee: number;
  dueDate: string;
  existingInvoice: { id: number; invoiceNumber: string; status: string } | null;
  blockedReason: string | null;
}

export interface LandlordInvoice {
  id: number;
  contractId: number;
  invoiceNumber: string;
  roomNumber: string;
  roomAddress: string;
  tenantName: string;
  billingMonth: string;
  roomRent: number;
  electricityPrevious: number;
  electricityCurrent: number;
  electricityUsage: number;
  electricityUnitPrice: number;
  electricityTotal: number;
  waterPrevious: number;
  waterCurrent: number;
  waterUsage: number;
  waterUnitPrice: number;
  waterTotal: number;
  serviceFee: number;
  otherFee: number;
  otherFeeNote: string | null;
  totalAmount: number;
  dueDate: string;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
}

export interface InvoiceRowResult {
  rowIndex: number;
  contractId: number | null;
  outcome: 'CREATED' | 'SKIPPED' | 'ERROR';
  code: string;
  message: string;
  invoiceId?: number;
  invoiceNumber?: string;
  fields?: Record<string, string>;
}

export interface InvoiceBatchResult {
  created: number;
  skipped: number;
  failed: number;
  results: InvoiceRowResult[];
}

export const invoicesApi = {
  candidates: (month: string) => api.get<InvoiceCandidate[]>(`/invoices/candidates?billingMonth=${encodeURIComponent(month)}`),
  list: (month: string) => api.get<LandlordInvoice[]>(`/invoices?billingMonth=${encodeURIComponent(month)}`),
  create: (month: string, rows: unknown[]) => api.post<InvoiceBatchResult>('/invoices/bulk', { billingMonth: month, rows }),
};

export type TenantInvoiceStatus = 'PENDING' | 'OVERDUE' | 'PAID' | 'CANCELLED';
export interface TenantInvoice extends Omit<LandlordInvoice, 'status'> {
  status: TenantInvoiceStatus;
  paidAt: string | null;
}
export interface TenantInvoiceList {
  items: TenantInvoice[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { outstandingAmount: number; outstandingCount: number; overdueAmount: number; overdueCount: number };
  months: string[];
}

export const tenantInvoicesApi = {
  list: (query: string, signal?: AbortSignal) => api.get<TenantInvoiceList>(`/invoices/my?${query}`, { signal }),
  detail: (id: string, signal?: AbortSignal) => api.get<TenantInvoice>(`/invoices/my/${encodeURIComponent(id)}`, { signal }),
};
