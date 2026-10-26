import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../../utils/app-error';

export const monthSchema = z.string().regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/, 'Tháng phải có dạng YYYY-MM (2000–2100)');
export const tenantInvoiceQuerySchema = z.object({
  billingMonth: monthSchema.optional(),
  status: z.enum(['PENDING', 'OVERDUE', 'PAID', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export const invoiceIdSchema = z.coerce.number().int().positive().max(2147483647);
export type TenantInvoiceQuery = z.infer<typeof tenantInvoiceQuerySchema>;
const money = (max: number) => z.number({ error: 'Cần nhập số tiền' }).min(0, 'Số tiền không được âm').max(max, 'Số tiền vượt giới hạn').refine(
  value => new Prisma.Decimal(value).decimalPlaces() <= 2, 'Số tiền chỉ có tối đa 2 chữ số thập phân',
);
const meter = z.number({ error: 'Cần nhập chỉ số điện/nước' }).int('Chỉ số phải là số nguyên').min(0, 'Chỉ số không được âm').max(2147483647, 'Chỉ số vượt giới hạn');

export const invoiceRowSchema = z.object({
  contractId: z.number().int().positive(),
  expectedRentPrice: money(9999999999.99),
  electricityPrevious: meter,
  electricityCurrent: meter,
  electricityUnitPrice: money(99999999.99),
  waterPrevious: meter,
  waterCurrent: meter,
  waterUnitPrice: money(99999999.99),
  serviceFee: money(9999999999.99).default(0),
  otherFee: money(9999999999.99).default(0),
  otherFeeNote: z.string().trim().max(255, 'Ghi chú tối đa 255 ký tự').optional(),
  dueDate: z.iso.date({ error: 'Hạn thanh toán không hợp lệ' }),
}).superRefine((row, ctx) => {
  if (row.electricityCurrent < row.electricityPrevious) ctx.addIssue({ code: 'custom', path: ['electricityCurrent'], message: 'Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ' });
  if (row.waterCurrent < row.waterPrevious) ctx.addIssue({ code: 'custom', path: ['waterCurrent'], message: 'Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ' });
  if (row.otherFee > 0 && !row.otherFeeNote) ctx.addIssue({ code: 'custom', path: ['otherFeeNote'], message: 'Nhập lý do thu khoản phí khác' });
});

// Validate rows separately so a malformed room does not reject the entire batch.
export const batchSchema = z.object({ billingMonth: monthSchema, rows: z.array(z.unknown()).min(1).max(100, 'Mỗi lần tạo tối đa 100 hóa đơn') });
export type InvoiceRowInput = z.infer<typeof invoiceRowSchema>;

export function monthBounds(month: string) {
  const [year, index] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(year, index - 1, 1)), end: new Date(Date.UTC(year, index, 0)) };
}

export function nextMonth(month: string) {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, index, 1));
  return date.toISOString().slice(0, 7);
}

export function calculateInvoice(rent: Prisma.Decimal, row: InvoiceRowInput) {
  const electricityUsage = row.electricityCurrent - row.electricityPrevious;
  const waterUsage = row.waterCurrent - row.waterPrevious;
  const electricityTotal = new Prisma.Decimal(row.electricityUnitPrice).mul(electricityUsage);
  const waterTotal = new Prisma.Decimal(row.waterUnitPrice).mul(waterUsage);
  const totalAmount = rent.add(electricityTotal).add(waterTotal).add(row.serviceFee).add(row.otherFee);
  if ([rent, electricityTotal, waterTotal, totalAmount].some(amount => amount.gt('9999999999.99'))) {
    throw new AppError('Tổng tiền vượt giới hạn lưu trữ. Kiểm tra lại chỉ số và đơn giá.', 422, 'AMOUNT_TOO_LARGE');
  }
  return { electricityUsage, waterUsage, electricityTotal, waterTotal, totalAmount };
}
