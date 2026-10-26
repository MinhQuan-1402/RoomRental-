import type { InvoiceCandidate } from './api/invoices';

export const draftFields = ['electricityPrevious', 'electricityCurrent', 'electricityUnitPrice', 'waterPrevious', 'waterCurrent', 'waterUnitPrice', 'serviceFee', 'otherFee', 'otherFeeNote', 'dueDate'] as const;
export type DraftField = typeof draftFields[number];
export type InvoiceDraft = Record<DraftField, string>;

export function newInvoiceDraft(candidate: InvoiceCandidate): InvoiceDraft {
  const value = (number: number | null) => number === null ? '' : String(number);
  return {
    electricityPrevious: value(candidate.electricityPrevious), electricityCurrent: '', electricityUnitPrice: value(candidate.electricityUnitPrice),
    waterPrevious: value(candidate.waterPrevious), waterCurrent: '', waterUnitPrice: value(candidate.waterUnitPrice),
    serviceFee: String(candidate.serviceFee), otherFee: '0', otherFeeNote: '', dueDate: candidate.dueDate,
  };
}

export function validateDraft(draft: InvoiceDraft, candidate: InvoiceCandidate, month: string) {
  const errors: Partial<Record<DraftField, string>> = {};
  for (const field of draftFields) {
    if (field === 'otherFeeNote' || field === 'dueDate') continue;
    const input = draft[field].trim();
    if (!input) { errors[field] = 'Chưa nhập'; continue; }
    const number = Number(input);
    const isMeter = field.endsWith('Previous') || field.endsWith('Current');
    const max = isMeter ? 2147483647 : field.endsWith('UnitPrice') ? 99999999.99 : 9999999999.99;
    if (!Number.isFinite(number) || number < 0 || number > max || (isMeter && !Number.isInteger(number))) {
      errors[field] = isMeter ? 'Nhập số nguyên không âm' : 'Số tiền không hợp lệ';
    } else if (!isMeter && Math.abs(number * 100 - Math.round(number * 100)) > 0.0001) {
      errors[field] = 'Tối đa 2 số thập phân';
    }
  }
  if (!errors.electricityPrevious && !errors.electricityCurrent && Number(draft.electricityCurrent) < Number(draft.electricityPrevious)) errors.electricityCurrent = 'Phải ≥ chỉ số cũ';
  if (!errors.waterPrevious && !errors.waterCurrent && Number(draft.waterCurrent) < Number(draft.waterPrevious)) errors.waterCurrent = 'Phải ≥ chỉ số cũ';
  if (draft.otherFeeNote.length > 255) errors.otherFeeNote = 'Tối đa 255 ký tự';
  if (Number(draft.otherFee) > 0 && !draft.otherFeeNote.trim()) errors.otherFeeNote = 'Cần ghi lý do thu phí';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) || draft.dueDate < `${month}-01` || draft.dueDate < candidate.startDate) errors.dueDate = 'Hạn thanh toán không hợp lệ';
  return errors;
}

export function draftTotal(draft: InvoiceDraft, rent: number) {
  return rent + (Number(draft.electricityCurrent) - Number(draft.electricityPrevious)) * Number(draft.electricityUnitPrice)
    + (Number(draft.waterCurrent) - Number(draft.waterPrevious)) * Number(draft.waterUnitPrice) + Number(draft.serviceFee) + Number(draft.otherFee);
}

export function invoicePayload(draft: InvoiceDraft, candidate: InvoiceCandidate) {
  return {
    contractId: candidate.contractId, expectedRentPrice: candidate.rentPrice,
    ...Object.fromEntries(draftFields.map(field => [field, field === 'dueDate' || field === 'otherFeeNote' ? draft[field] : draft[field].trim() === '' ? null : Number(draft[field])])),
  };
}
