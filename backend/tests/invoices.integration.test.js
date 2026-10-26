// Run against local development MySQL only. Every fixture is tagged with a unique run ID
// and removed in finally; existing users, contracts and invoices are never changed.
process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('../dist/config/prisma');
const { env } = require('../dist/config/env');
const { app } = require('../dist/app');
const { DashboardService } = require('../dist/modules/dashboard/dashboard.service');

test('invoice HTTP flow: partial success, authorization, retries, concurrency, meter history and dashboard', { timeout: 60000 }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.DATABASE_URL).hostname), 'Integration tests only run against local MySQL');
  const run = randomUUID();
  const users = [];
  let server;
  try {
    const landlord = await prisma.user.create({ data: { email: `invoice-owner-${run}@test.invalid`, fullName: 'Invoice Test Owner', role: 'LANDLORD' } }); users.push(landlord.id);
    const other = await prisma.user.create({ data: { email: `invoice-other-${run}@test.invalid`, fullName: 'Other Owner', role: 'LANDLORD' } }); users.push(other.id);
    const tenantUser = await prisma.user.create({ data: { email: `invoice-tenant-${run}@test.invalid`, fullName: 'Invoice Tenant', role: 'TENANT' } }); users.push(tenantUser.id);
    const tenant = await prisma.tenant.create({ data: { landlordId: landlord.id, userId: tenantUser.id, fullName: 'Invoice Tenant', phone: '0900000000' } });
    const contracts = [];
    for (let index = 0; index < 6; index++) {
      const room = await prisma.room.create({ data: { landlordId: landlord.id, roomNumber: `TEST-${index}`, address: 'Invoice Test Address', price: 5000000, status: 'OCCUPIED' } });
      contracts.push(await prisma.contract.create({ data: { landlordId: landlord.id, roomId: room.id, tenantId: tenant.id,
        rentPrice: 3000000, deposit: 3000000, billingDay: 10,
        startDate: new Date(index === 4 ? '2099-01-01' : '2020-01-01'), endDate: new Date('2100-12-31'), status: index === 5 ? 'PENDING' : 'ACTIVE' } }));
    }
    const token = user => jwt.sign({ userId: user.id, role: user.role, email: user.email }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/invoices`;
    async function request(url = '', method = 'GET', body, user = landlord) {
      const response = await fetch(`${base}${url}`, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: response.status, body: await response.json() };
    }
    const makeRow = (contractId, values = {}) => ({ contractId, expectedRentPrice: 3000000,
      electricityPrevious: 100, electricityCurrent: 125, electricityUnitPrice: 3500,
      waterPrevious: 10, waterCurrent: 14, waterUnitPrice: 15000,
      serviceFee: 100000, otherFee: 20000, otherFeeNote: 'Vệ sinh', dueDate: '2020-01-15', ...values });
    const bulk = (rows, month = '2020-01', user = landlord) => request('/bulk', 'POST', { billingMonth: month, rows }, user);

    assert.equal((await request('?billingMonth=2020-01', 'GET', undefined, null)).status, 401);
    assert.equal((await request('?billingMonth=2020-01', 'GET', undefined, tenantUser)).status, 403);
    assert.equal((await request('?billingMonth=2020-13')).status, 422);
    const firstCandidates = (await request('/candidates?billingMonth=2020-01')).body.data;
    assert.equal(firstCandidates.length, 4); // exclude future and pending contracts
    assert.equal(firstCandidates[0].electricityPrevious, null);
    assert.equal(firstCandidates[0].rentPrice, 3000000); // contract rent, not room.price
    assert.deepEqual((await request('/candidates?billingMonth=2020-01', 'GET', undefined, other)).body.data, []);
    assert.deepEqual((await request('?billingMonth=2020-01', 'GET', undefined, other)).body.data, []);

    const first = await bulk([makeRow(contracts[0].id), { ...makeRow(contracts[1].id), waterCurrent: null }, makeRow(contracts[2].id, { electricityCurrent: 99 }), makeRow(contracts[3].id)]);
    assert.equal(first.status, 200);
    assert.deepEqual([first.body.data.created, first.body.data.failed], [2, 2]);
    assert.equal(first.body.data.results[1].fields.waterCurrent, 'Cần nhập chỉ số điện/nước');
    let invoices = (await request('?billingMonth=2020-01')).body.data;
    assert.equal(invoices.length, 2);
    assert.equal(invoices[0].totalAmount, 3267500);
    assert.equal(invoices[0].status, 'OVERDUE');
    assert.equal((await bulk([makeRow(contracts[0].id)])).body.data.skipped, 1);
    assert.equal((await bulk([makeRow(contracts[1].id)], '2020-01', other)).body.data.results[0].code, 'CONTRACT_NOT_FOUND');
    assert.equal((await bulk([makeRow(contracts[4].id)])).body.data.results[0].code, 'CONTRACT_INELIGIBLE');
    assert.equal((await bulk([makeRow(contracts[5].id)])).body.data.results[0].code, 'CONTRACT_INELIGIBLE');
    assert.equal((await bulk([makeRow(contracts[1].id, { expectedRentPrice: 1 })])).body.data.results[0].code, 'RENT_CHANGED');
    assert.equal((await bulk([makeRow(contracts[1].id, { dueDate: '2019-12-31' })])).body.data.results[0].code, 'INVALID_DUE_DATE');

    const races = await Promise.all([bulk([makeRow(contracts[1].id)]), bulk([makeRow(contracts[1].id)])]);
    assert.equal(races.reduce((count, response) => count + response.body.data.created, 0), 1);
    assert.equal(races.reduce((count, response) => count + response.body.data.skipped, 0), 1);
    assert.equal(await prisma.invoice.count({ where: { contractId: contracts[1].id, billingMonth: '2020-01' } }), 1);

    const nextCandidates = (await request('/candidates?billingMonth=2020-02')).body.data;
    const next = nextCandidates.find(row => row.contractId === contracts[0].id);
    assert.equal(next.electricityPrevious, 125); assert.equal(next.waterPrevious, 14); assert.equal(next.electricityUnitPrice, 3500);
    assert.equal((await bulk([makeRow(contracts[0].id, { dueDate: '2020-03-15' })], '2020-03')).body.data.results[0].code, 'BILLING_SEQUENCE');
    assert.equal((await bulk([makeRow(contracts[0].id, { dueDate: '2020-02-15' })], '2020-02')).body.data.results[0].code, 'METER_CHANGED');
    const second = await bulk([makeRow(contracts[0].id, { electricityPrevious: 125, electricityCurrent: 130, waterPrevious: 14, waterCurrent: 16, dueDate: '2020-02-15' })], '2020-02');
    assert.equal(second.body.data.created, 1);
    assert.equal((await bulk([makeRow(contracts[0].id, { dueDate: '2019-12-15' })], '2019-12')).body.data.results[0].code, 'CONTRACT_INELIGIBLE');

    // Database unique constraint protects callers outside this service too.
    const existing = await prisma.invoice.findFirstOrThrow({ where: { contractId: contracts[0].id, billingMonth: '2020-01' } });
    const { id, createdAt, updatedAt, ...copy } = existing;
    await assert.rejects(prisma.invoice.create({ data: { ...copy, invoiceNumber: `TEST-${randomUUID()}` } }), error => error.code === 'P2002');

    // Expired pending invoices are recognized by the dashboard without a cron job.
    await prisma.invoice.update({ where: { id: existing.id }, data: { status: 'PENDING' } });
    const stats = await new DashboardService().getLandlordStats(landlord.id);
    const total = await prisma.invoice.aggregate({ where: { landlordId: landlord.id }, _sum: { totalAmount: true } });
    assert.equal(stats.overdueInvoiceAmount, Number(total._sum.totalAmount));
    assert.equal(stats.pendingInvoiceAmount, Number(total._sum.totalAmount));
    assert.equal(stats.collectedRevenue, 0);
    assert.equal(stats.expectedRevenue, 12000000); // agreed rent, excluding future and pending contracts

    // The cancelled invoice still occupies its month; creating again does not revive it.
    await prisma.invoice.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } });
    assert.equal((await bulk([makeRow(contracts[0].id)])).body.data.skipped, 1);
    assert.equal((await request('/candidates?billingMonth=2020-01')).body.data.find(row => row.contractId === contracts[0].id).existingInvoice.status, 'CANCELLED');
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
