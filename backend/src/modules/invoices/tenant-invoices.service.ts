import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/app-error';
import { billingToday } from '../../utils/billing-date';
import { TenantInvoiceQuery } from './invoices.validation';

// Explicitly select public billing information; never return payment metadata or user records.
const invoiceSelect = {
  id: true, invoiceNumber: true, billingMonth: true, contractId: true,
  roomRent: true, electricityPrevious: true, electricityCurrent: true, electricityUsage: true,
  electricityUnitPrice: true, electricityTotal: true, waterPrevious: true, waterCurrent: true,
  waterUsage: true, waterUnitPrice: true, waterTotal: true, serviceFee: true,
  otherFee: true, otherFeeNote: true, totalAmount: true, dueDate: true, paidAt: true, status: true,
  room: { select: { roomNumber: true, address: true } },
  tenant: { select: { fullName: true } },
} satisfies Prisma.InvoiceSelect;

type SelectedInvoice = Prisma.InvoiceGetPayload<{ select: typeof invoiceSelect }>;

function serialize(invoice: SelectedInvoice, today: Date) {
  const { room, tenant, ...fields } = invoice;
  return {
    ...fields,
    roomNumber: room.roomNumber, roomAddress: room.address, tenantName: tenant.fullName,
    roomRent: Number(invoice.roomRent), electricityUnitPrice: Number(invoice.electricityUnitPrice),
    electricityTotal: Number(invoice.electricityTotal), waterUnitPrice: Number(invoice.waterUnitPrice),
    waterTotal: Number(invoice.waterTotal), serviceFee: Number(invoice.serviceFee),
    otherFee: Number(invoice.otherFee), totalAmount: Number(invoice.totalAmount),
    dueDate: invoice.dueDate.toISOString().slice(0, 10), paidAt: invoice.paidAt?.toISOString() ?? null,
    status: invoice.status === 'PENDING' || invoice.status === 'OVERDUE'
      ? (invoice.dueDate < today ? 'OVERDUE' : 'PENDING') : invoice.status,
  };
}

export const tenantInvoicesService = {
  async list(userId: number, query: TenantInvoiceQuery) {
    const today = billingToday();
    // Scope by linked account, across all tenant profiles and historical contracts.
    const owned: Prisma.InvoiceWhereInput = { tenant: { userId }, status: { not: 'DRAFT' } };
    const unpaid: Prisma.InvoiceWhereInput = { ...owned, status: { in: ['PENDING', 'OVERDUE'] } };
    const where: Prisma.InvoiceWhereInput = { ...owned, billingMonth: query.billingMonth };
    if (query.status === 'PENDING' || query.status === 'OVERDUE') {
      where.status = { in: ['PENDING', 'OVERDUE'] };
      where.dueDate = query.status === 'OVERDUE' ? { lt: today } : { gte: today };
    } else if (query.status) where.status = query.status;

    const [items, total, outstanding, overdue, months] = await prisma.$transaction([
      prisma.invoice.findMany({ where, select: invoiceSelect,
        orderBy: [{ billingMonth: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({ where: unpaid, _sum: { totalAmount: true }, _count: { _all: true } }),
      prisma.invoice.aggregate({ where: { ...unpaid, dueDate: { lt: today } }, _sum: { totalAmount: true }, _count: { _all: true } }),
      prisma.invoice.groupBy({ by: ['billingMonth'], where: owned, orderBy: { billingMonth: 'desc' } }),
    ]);

    return {
      items: items.map(invoice => serialize(invoice, today)),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
      // Summary always covers all periods, independently of list filters and pagination.
      summary: {
        outstandingAmount: Number(outstanding._sum.totalAmount ?? 0), outstandingCount: outstanding._count._all,
        overdueAmount: Number(overdue._sum.totalAmount ?? 0), overdueCount: overdue._count._all,
      },
      months: months.map(row => row.billingMonth),
    };
  },

  async detail(userId: number, id: number) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenant: { userId }, status: { not: 'DRAFT' } }, select: invoiceSelect,
    });
    // Identical response for another user's invoice, a draft, or a missing ID.
    if (!invoice) throw new AppError('Không tìm thấy hóa đơn.', 404, 'INVOICE_NOT_FOUND');
    return serialize(invoice, billingToday());
  },
};
