import { randomUUID } from 'crypto';
import { Invoice, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/app-error';
import { billingToday } from '../../utils/billing-date';
import { calculateInvoice, invoiceRowSchema, monthBounds, nextMonth, InvoiceRowInput } from './invoices.validation';

function displayedStatus(invoice: Pick<Invoice, 'status' | 'dueDate'>) {
  if (invoice.status === 'PENDING' || invoice.status === 'OVERDUE') {
    return invoice.dueDate < billingToday() ? 'OVERDUE' : 'PENDING';
  }
  return invoice.status;
}

function periodBlock(latest: Pick<Invoice, 'billingMonth'> | null, month: string) {
  if (!latest || nextMonth(latest.billingMonth) === month) return null;
  if (latest.billingMonth >= month) return `Đã có hóa đơn tháng ${latest.billingMonth}. Không thể tạo lùi tháng vì sẽ làm sai chỉ số điện/nước.`;
  return `Cần tạo tháng ${nextMonth(latest.billingMonth)} trước để nối tiếp chỉ số điện/nước.`;
}

function serializeInvoice(invoice: Invoice & { room: { roomNumber: string; address: string }; tenant: { fullName: string } }) {
  return {
    ...invoice, roomNumber: invoice.room.roomNumber, roomAddress: invoice.room.address, tenantName: invoice.tenant.fullName,
    status: displayedStatus(invoice),
    roomRent: Number(invoice.roomRent), electricityUnitPrice: Number(invoice.electricityUnitPrice), electricityTotal: Number(invoice.electricityTotal),
    waterUnitPrice: Number(invoice.waterUnitPrice), waterTotal: Number(invoice.waterTotal), serviceFee: Number(invoice.serviceFee),
    otherFee: Number(invoice.otherFee), totalAmount: Number(invoice.totalAmount), dueDate: invoice.dueDate.toISOString().slice(0, 10),
  };
}

export interface BatchRowResult {
  rowIndex: number;
  contractId: number | null;
  outcome: 'CREATED' | 'SKIPPED' | 'ERROR';
  code: string;
  message: string;
  invoiceId?: number;
  invoiceNumber?: string;
  fields?: Record<string, string>;
}

export class InvoicesService {
  async list(landlordId: number, month: string) {
    const invoices = await prisma.invoice.findMany({
      where: { landlordId, billingMonth: month },
      include: { room: { select: { roomNumber: true, address: true } }, tenant: { select: { fullName: true } } },
      orderBy: [{ room: { roomNumber: 'asc' } }, { id: 'desc' }],
    });
    return invoices.map(serializeInvoice);
  }

  async candidates(landlordId: number, month: string) {
    const { start, end } = monthBounds(month);
    const contracts = await prisma.contract.findMany({
      where: { landlordId, status: 'ACTIVE', startDate: { lte: end }, endDate: { gte: start } },
      include: {
        room: { select: { roomNumber: true, address: true } }, tenant: { select: { fullName: true } },
        invoices: { orderBy: { billingMonth: 'desc' } },
      },
      orderBy: [{ room: { roomNumber: 'asc' } }, { id: 'asc' }],
    });
    return contracts.map(contract => {
      const existing = contract.invoices.find(invoice => invoice.billingMonth === month);
      const latest = contract.invoices.find(invoice => invoice.status !== 'CANCELLED' && invoice.status !== 'DRAFT') ?? null;
      const previous = latest && latest.billingMonth < month ? latest : null;
      const billingDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), Math.min(28, Math.max(1, contract.billingDay))));
      const dueDate = billingDate < contract.startDate ? contract.startDate : billingDate;
      return {
        contractId: contract.id, roomId: contract.roomId, roomNumber: contract.room.roomNumber, roomAddress: contract.room.address,
        tenantName: contract.tenant.fullName, rentPrice: Number(contract.rentPrice),
        startDate: contract.startDate.toISOString().slice(0, 10), endDate: contract.endDate.toISOString().slice(0, 10),
        partialMonth: contract.startDate > start || contract.endDate < end,
        electricityPrevious: previous?.electricityCurrent ?? null, waterPrevious: previous?.waterCurrent ?? null,
        previousBillingMonth: previous?.billingMonth ?? null,
        electricityUnitPrice: previous ? Number(previous.electricityUnitPrice) : null,
        waterUnitPrice: previous ? Number(previous.waterUnitPrice) : null,
        serviceFee: previous ? Number(previous.serviceFee) : 0,
        dueDate: dueDate.toISOString().slice(0, 10),
        existingInvoice: existing ? { id: existing.id, invoiceNumber: existing.invoiceNumber, status: displayedStatus(existing) } : null,
        blockedReason: existing ? null : periodBlock(latest, month),
      };
    });
  }

  private async createOne(landlordId: number, month: string, row: InvoiceRowInput) {
    return prisma.$transaction(async tx => {
      // Lock only an owned contract. This serializes meter history as well as same-month retries.
      const locked = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM contracts WHERE id = ${row.contractId} AND landlord_id = ${landlordId} FOR UPDATE`;
      if (!locked.length) throw new AppError('Không tìm thấy hợp đồng thuộc quyền quản lý của bạn.', 404, 'CONTRACT_NOT_FOUND');
      const contract = await tx.contract.findUniqueOrThrow({ where: { id: row.contractId } });
      const existing = await tx.invoice.findFirst({ where: { contractId: row.contractId, billingMonth: month } });
      if (existing) return { invoice: existing, created: false };
      const { start, end } = monthBounds(month);
      if (contract.status !== 'ACTIVE' || contract.startDate > end || contract.endDate < start) {
        throw new AppError('Hợp đồng không còn hiệu lực trong tháng đã chọn. Tải lại danh sách.', 409, 'CONTRACT_INELIGIBLE');
      }
      if (!contract.rentPrice.equals(row.expectedRentPrice)) throw new AppError('Giá thuê hợp đồng đã thay đổi. Tải lại danh sách và kiểm tra.', 409, 'RENT_CHANGED');
      const latest = await tx.invoice.findFirst({
        where: { contractId: contract.id, status: { notIn: ['CANCELLED', 'DRAFT'] } }, orderBy: { billingMonth: 'desc' },
      });
      const blocked = periodBlock(latest, month);
      if (blocked) throw new AppError(blocked, 409, 'BILLING_SEQUENCE');
      if (latest && (row.electricityPrevious !== latest.electricityCurrent || row.waterPrevious !== latest.waterCurrent)) {
        throw new AppError('Chỉ số đầu kỳ đã thay đổi. Tải lại danh sách để lấy chỉ số đúng.', 409, 'METER_CHANGED');
      }
      const dueDate = new Date(`${row.dueDate}T00:00:00.000Z`);
      if (dueDate < start || dueDate < contract.startDate) throw new AppError('Hạn thanh toán không được trước tháng hóa đơn hoặc ngày bắt đầu hợp đồng.', 422, 'INVALID_DUE_DATE', { dueDate: 'Kiểm tra lại hạn thanh toán' });
      const invoice = await tx.invoice.create({ data: {
        invoiceNumber: `HD-${month.replace('-', '')}-${randomUUID()}`,
        contractId: contract.id, roomId: contract.roomId, tenantId: contract.tenantId, landlordId,
        billingMonth: month, roomRent: contract.rentPrice,
        electricityPrevious: row.electricityPrevious, electricityCurrent: row.electricityCurrent, electricityUnitPrice: row.electricityUnitPrice,
        waterPrevious: row.waterPrevious, waterCurrent: row.waterCurrent, waterUnitPrice: row.waterUnitPrice,
        serviceFee: row.serviceFee, otherFee: row.otherFee, otherFeeNote: row.otherFeeNote || null,
        dueDate, status: dueDate < billingToday() ? 'OVERDUE' : 'PENDING',
        ...calculateInvoice(contract.rentPrice, row),
      } });
      return { invoice, created: true };
    }, { isolationLevel: 'ReadCommitted' });
  }

  async createBatch(landlordId: number, month: string, rows: unknown[]) {
    const results: BatchRowResult[] = [];
    const seen = new Set<number>();
    for (const [rowIndex, raw] of rows.entries()) {
      const parsed = invoiceRowSchema.safeParse(raw);
      const rawId = raw && typeof raw === 'object' && 'contractId' in raw ? raw.contractId : null;
      const contractId = typeof rawId === 'number' && Number.isSafeInteger(rawId) && rawId > 0 ? rawId : null;
      if (!parsed.success) {
        const fields = Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]));
        results.push({ rowIndex, contractId, outcome: 'ERROR', code: 'VALIDATION_ERROR', message: Object.values(fields).join('; '), fields });
        continue;
      }
      if (seen.has(parsed.data.contractId)) {
        results.push({ rowIndex, contractId, outcome: 'SKIPPED', code: 'DUPLICATE_ROW', message: 'Hợp đồng đã xuất hiện trong đợt tạo này.' });
        continue;
      }
      seen.add(parsed.data.contractId);
      try {
        const { invoice, created } = await this.createOne(landlordId, month, parsed.data);
        results.push({ rowIndex, contractId, outcome: created ? 'CREATED' : 'SKIPPED', code: created ? 'CREATED' : 'ALREADY_EXISTS',
          message: created ? 'Đã tạo hóa đơn' : 'Tháng này đã có hóa đơn, không tạo trùng.', invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber });
      } catch (error) {
        if (error instanceof AppError) {
          results.push({ rowIndex, contractId, outcome: 'ERROR', code: error.code, message: error.message, fields: error.details as Record<string, string> | undefined });
        } else {
          // Do not expose DB errors or stop processing the remaining rooms.
          console.error('[Invoices] Failed row', { rowIndex, contractId, error });
          results.push({ rowIndex, contractId, outcome: 'ERROR', code: 'CREATE_FAILED', message: 'Chưa thể xác nhận tạo hóa đơn. Tải lại trạng thái rồi thử lại phòng này.' });
        }
      }
    }
    return { created: results.filter(row => row.outcome === 'CREATED').length, skipped: results.filter(row => row.outcome === 'SKIPPED').length,
      failed: results.filter(row => row.outcome === 'ERROR').length, results };
  }
}

export const invoicesService = new InvoicesService();
