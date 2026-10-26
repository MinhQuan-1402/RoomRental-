const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const { invoiceRowSchema, batchSchema, monthSchema, calculateInvoice, monthBounds, nextMonth } = require('../dist/modules/invoices/invoices.validation');
const { billingToday } = require('../dist/utils/billing-date');

const input = {
  contractId: 1, expectedRentPrice: 3000000,
  electricityPrevious: 100, electricityCurrent: 125, electricityUnitPrice: 3500,
  waterPrevious: 10, waterCurrent: 14, waterUnitPrice: 15000,
  serviceFee: 100000, otherFee: 20000, otherFeeNote: 'Vệ sinh', dueDate: '2026-10-15',
};

test('month format, leap-year boundaries and year rollover', () => {
  assert.equal(monthSchema.safeParse('2026-13').success, false);
  assert.equal(monthSchema.safeParse('2026-1').success, false);
  assert.equal(monthBounds('2024-02').end.toISOString().slice(0, 10), '2024-02-29');
  assert.equal(nextMonth('2026-12'), '2027-01');
});

test('calculate money with decimals, rather than floating-point rounding', () => {
  const totals = calculateInvoice(new Prisma.Decimal(3000000), invoiceRowSchema.parse(input));
  assert.equal(totals.totalAmount.toString(), '3267500');
  const fractional = calculateInvoice(new Prisma.Decimal('0.1'), { ...input, electricityPrevious: 0, electricityCurrent: 3, electricityUnitPrice: 0.1, waterCurrent: 10, serviceFee: 0.2, otherFee: 0 });
  assert.equal(fractional.totalAmount.toString(), '0.6');
});

test('missing readings do not become zero; zero usage is valid', () => {
  assert.equal(invoiceRowSchema.safeParse({ ...input, waterCurrent: null }).success, false);
  assert.equal(invoiceRowSchema.safeParse({ ...input, electricityCurrent: 100, waterCurrent: 10 }).success, true);
});

test('reject decreasing, fractional, negative and overflowing readings', () => {
  for (const value of [99, 125.5, -1, 2147483648]) assert.equal(invoiceRowSchema.safeParse({ ...input, electricityCurrent: value }).success, false);
});

test('reject invalid rates, excessive precision, dates, unexplained fees and amount overflow', () => {
  for (const value of [-1, 1.001, 100000000]) assert.equal(invoiceRowSchema.safeParse({ ...input, electricityUnitPrice: value }).success, false);
  assert.equal(invoiceRowSchema.safeParse({ ...input, dueDate: '2026-02-30' }).success, false);
  assert.equal(invoiceRowSchema.safeParse({ ...input, otherFeeNote: '' }).success, false);
  assert.throws(() => calculateInvoice(new Prisma.Decimal(3000000), { ...input, electricityCurrent: 2147483647, electricityUnitPrice: 99999999 }), /vượt giới hạn/);
});

test('batch validates the envelope but keeps malformed rows for individual errors', () => {
  assert.equal(batchSchema.safeParse({ billingMonth: '2026-10', rows: [input, null] }).success, true);
  assert.equal(batchSchema.safeParse({ billingMonth: '2026-10', rows: [] }).success, false);
  assert.equal(batchSchema.safeParse({ billingMonth: '2026-10', rows: Array(101).fill(input) }).success, false);
});

test('overdue business date follows Vietnam midnight even on a UTC server', () => {
  assert.equal(billingToday(new Date('2026-10-12T16:59:00Z')).toISOString(), '2026-10-12T00:00:00.000Z');
  assert.equal(billingToday(new Date('2026-10-12T17:00:00Z')).toISOString(), '2026-10-13T00:00:00.000Z');
});

// Compile this pure frontend helper in memory, without importing React or creating build files.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('../../frontend/node_modules/typescript');
const draftPath = path.resolve(__dirname, '../../frontend/src/lib/invoice-draft.ts');
const draftModule = new Module(draftPath, module);
draftModule.filename = draftPath;
draftModule.paths = module.paths;
draftModule._compile(ts.transpileModule(fs.readFileSync(draftPath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, draftPath);
const { newInvoiceDraft, validateDraft, draftTotal, invoicePayload } = draftModule.exports;
const candidate = { contractId: 1, rentPrice: 3000000, electricityPrevious: null, waterPrevious: null, electricityUnitPrice: null, waterUnitPrice: null, serviceFee: 0, dueDate: '2026-10-15', startDate: '2026-01-01' };

test('frontend requires a first baseline and preserves blank inputs in the API payload', () => {
  const draft = newInvoiceDraft(candidate);
  assert.equal(draft.electricityPrevious, '');
  assert.equal(invoicePayload(draft, candidate).electricityPrevious, null);
  assert.equal(validateDraft(draft, candidate, '2026-10').electricityPrevious, 'Chưa nhập');
});

test('frontend zero readings and rates are valid and preview matches the API', () => {
  const draft = newInvoiceDraft({ ...candidate, electricityPrevious: 0, waterPrevious: 0, electricityUnitPrice: 0, waterUnitPrice: 0 });
  draft.electricityCurrent = '0'; draft.waterCurrent = '0';
  assert.deepEqual(validateDraft(draft, candidate, '2026-10'), {});
  assert.equal(draftTotal(draft, candidate.rentPrice), 3000000);
  assert.equal(invoiceRowSchema.safeParse(invoicePayload(draft, candidate)).success, true);
});
