// Local database fixtures only; cleanup is scoped to users created by this test.
process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('../dist/config/prisma');
const { env } = require('../dist/config/env');
const { app } = require('../dist/app');
const { billingToday } = require('../dist/utils/billing-date');

test('tenant invoices: ownership, history, filters, debt summary, pagination and detail', { timeout: 60000 }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.DATABASE_URL).hostname), 'Only local MySQL is allowed');
  const run = randomUUID();
  const users = [];
  let server;
  try {
    async function user(role, name) {
      const record = await prisma.user.create({ data: { role, email: `${name}-${run}@test.invalid`, fullName: name } });
      users.push(record.id); return record;
    }
    const owner = await user('LANDLORD', 'tenant-invoice-owner');
    const owner2 = await user('LANDLORD', 'tenant-invoice-owner2');
    const renter = await user('TENANT', 'tenant-invoice-renter');
    const stranger = await user('TENANT', 'tenant-invoice-stranger');
    const emptyRenter = await user('TENANT', 'tenant-invoice-empty');

    async function contract(landlord, account, name, status) {
      const room = await prisma.room.create({ data: { landlordId: landlord.id, roomNumber: name, address: 'Tenant invoice integration test', price: 100 } });
      const tenant = await prisma.tenant.create({ data: { landlordId: landlord.id, userId: account?.id ?? null,
        fullName: name, phone: '0900000000', email: renter.email } });
      return prisma.contract.create({ data: { landlordId: landlord.id, roomId: room.id, tenantId: tenant.id,
        startDate: new Date('2019-01-01'), endDate: new Date('2020-12-31'), rentPrice: 100, deposit: 0, billingDay: 10, status } });
    }
    const old = await contract(owner, renter, 'OLD', 'TERMINATED');
    const historical = await contract(owner2, renter, 'HISTORY', 'EXPIRED');
    const foreign = await contract(owner, stranger, 'FOREIGN', 'ACTIVE');
    const unlinked = await contract(owner, null, 'UNLINKED', 'ACTIVE');
    async function invoice(contract, billingMonth, status, rent, dueDate = '2020-01-10') {
      return prisma.invoice.create({ data: {
        contractId: contract.id, roomId: contract.roomId, tenantId: contract.tenantId, landlordId: contract.landlordId,
        invoiceNumber: `TENANT-TEST-${randomUUID()}`, billingMonth, status, roomRent: rent, totalAmount: rent,
        electricityPrevious: 100, electricityCurrent: 100, electricityUsage: 0, electricityUnitPrice: 3500, electricityTotal: 0,
        waterPrevious: 10, waterCurrent: 10, waterUsage: 0, waterUnitPrice: 15000, waterTotal: 0,
        serviceFee: 0, otherFee: 0, otherFeeNote: 'Kiểm tra chi tiết', dueDate: new Date(dueDate),
        paidAt: status === 'PAID' ? new Date('2020-02-10T03:00:00Z') : null,
      } });
    }
    const overdue = await invoice(old, '2020-01', 'PENDING', 110.25);
    const paid = await invoice(old, '2020-02', 'PAID', 220.5);
    const cancelled = await invoice(old, '2020-03', 'CANCELLED', 330);
    const draft = await invoice(old, '2020-04', 'DRAFT', 440);
    const pending = await invoice(old, '2099-01', 'OVERDUE', 550.75, '2099-01-10');
    const oldOwnerInvoice = await invoice(historical, '2021-01', 'PENDING', 660.25);
    const foreignInvoice = await invoice(foreign, '2022-01', 'PENDING', 9999);
    const unlinkedInvoice = await invoice(unlinked, '2023-01', 'PENDING', 8888);

    const token = account => jwt.sign({ userId: account.id, role: account.role, email: account.email }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/invoices`;
    async function request(path = '/my', account = renter, method = 'GET', body) {
      const res = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json',
        ...(account ? { Authorization: `Bearer ${token(account)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: res.status, body: await res.json() };
    }
    assert.equal((await request('/my', null)).status, 401);
    assert.equal((await request(`/my/${overdue.id}`, null)).status, 401);
    assert.equal((await request('/my', owner)).status, 403);
    assert.equal((await request(`/my/${overdue.id}`, owner)).status, 403);
    assert.equal((await request('?billingMonth=2020-01')).status, 403);
    assert.equal((await request('/candidates?billingMonth=2020-01')).status, 403);
    assert.equal((await request('/bulk', renter, 'POST', { billingMonth: '2020-01', rows: [] })).status, 403);

    const list = await request();
    assert.equal(list.status, 200);
    assert.equal(list.body.data.pagination.total, 5);
    assert.deepEqual(list.body.data.items.map(item => item.id), [pending.id, oldOwnerInvoice.id, cancelled.id, paid.id, overdue.id]);
    assert.deepEqual(list.body.data.months, ['2099-01', '2021-01', '2020-03', '2020-02', '2020-01']);
    const summary = { outstandingAmount: 1321.25, outstandingCount: 3, overdueAmount: 770.5, overdueCount: 2 };
    assert.deepEqual(list.body.data.summary, summary);
    assert.equal(list.body.data.items[0].status, 'PENDING');
    assert.equal(list.body.data.items.at(-1).status, 'OVERDUE');

    for (const [status, count] of [['PENDING', 1], ['OVERDUE', 2], ['PAID', 1], ['CANCELLED', 1]]) {
      const response = await request(`/my?status=${status}`);
      assert.equal(response.body.data.pagination.total, count);
      assert.ok(response.body.data.items.every(item => item.status === status));
      assert.deepEqual(response.body.data.summary, summary);
    }
    const filtered = (await request('/my?billingMonth=2020-02&status=PAID')).body.data;
    assert.deepEqual(filtered.items.map(item => item.id), [paid.id]);
    assert.deepEqual(filtered.summary, summary);
    assert.equal((await request('/my?billingMonth=2020-02&status=OVERDUE')).body.data.items.length, 0);
    const first = (await request('/my?limit=2')).body.data;
    const second = (await request('/my?limit=2&page=2')).body.data;
    assert.deepEqual(first.pagination, { page: 1, limit: 2, total: 5, totalPages: 3 });
    assert.ok(second.items.every(item => !first.items.some(other => item.id === other.id)));
    assert.deepEqual((await request('/my?page=99')).body.data.items, []);

    for (const id of [foreignInvoice.id, unlinkedInvoice.id, draft.id, 2147483647]) {
      const response = await request(`/my/${id}`);
      assert.equal(response.status, 404);
      assert.equal(response.body.error.code, 'INVOICE_NOT_FOUND');
    }
    // Caller-controlled IDs and matching email addresses must never expand ownership.
    assert.equal((await request(`/my?userId=${stranger.id}&tenantId=${foreign.tenantId}`)).body.data.pagination.total, 5);
    assert.equal((await request(`/my/${overdue.id}`, stranger)).status, 404);
    const detail = (await request(`/my/${paid.id}`)).body.data;
    assert.equal(detail.roomNumber, 'OLD'); assert.equal(detail.tenantName, 'OLD');
    assert.equal(detail.totalAmount, 220.5); assert.equal(detail.paidAt, '2020-02-10T03:00:00.000Z');
    assert.equal(detail.electricityPrevious, 100); assert.equal(detail.waterUnitPrice, 15000);
    assert.equal(detail.otherFeeNote, 'Kiểm tra chi tiết');
    for (const field of ['landlordId', 'tenantId', 'payments', 'tenant', 'room', 'user']) assert.equal(field in detail, false);
    assert.equal((await request(`/my/${oldOwnerInvoice.id}`)).status, 200);

    const empty = (await request('/my', emptyRenter)).body.data;
    assert.deepEqual(empty.items, []); assert.deepEqual(empty.months, []);
    assert.deepEqual(empty.summary, { outstandingAmount: 0, outstandingCount: 0, overdueAmount: 0, overdueCount: 0 });
    for (const query of ['status=DRAFT', 'status=UNKNOWN', 'billingMonth=2026-13', 'page=0', 'page=1.5', 'limit=51', 'billingMonth=2026-01&billingMonth=2026-02']) {
      assert.equal((await request(`/my?${query}`)).status, 422, query);
    }
    for (const id of ['abc', '0', '-1', '1.5', '2147483648']) assert.equal((await request(`/my/${id}`)).status, 422);

    // A due date of today is still pending, even if the stored status was overdue.
    await prisma.invoice.update({ where: { id: pending.id }, data: { dueDate: billingToday() } });
    assert.equal((await request(`/my/${pending.id}`)).body.data.status, 'PENDING');
    assert.equal((await request('/my?status=OVERDUE')).body.data.pagination.total, 2);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (users.length) {
      await prisma.invoice.deleteMany({ where: { landlordId: { in: users } } });
      await prisma.contract.deleteMany({ where: { landlordId: { in: users } } });
      await prisma.room.deleteMany({ where: { landlordId: { in: users } } });
      await prisma.tenant.deleteMany({ where: { landlordId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    await prisma.$disconnect();
  }
});
