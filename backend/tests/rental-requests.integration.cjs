// Run from backend: node tests/rental-requests.integration.cjs (local dev server required).
// Creates isolated fixtures and removes only records belonging to those fixtures.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const ids = [];
const stamp = randomUUID();
const base = 'http://localhost:5000/api';
async function call(path, token, body, expected = 200) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  assert.equal(response.status, expected, `${path}: ${result.message}`);
  return result.data;
}
async function account(role, label) {
  const email = `rental-test-${stamp}-${label}@example.com`;
  const password = `Test9${randomUUID()}`;
  const user = await call('/auth/register', null, { email, password, role, fullName: 'Rental Test ' + label }, 201);
  ids.push(Number(user.id));
  const login = await call('/auth/login', null, { email, password });
  return { id: Number(user.id), token: login.tokens.accessToken };
}
(async () => {
  try {
    const owner = await account('LANDLORD', 'owner');
    const stranger = await account('LANDLORD', 'stranger');
    const a = await account('TENANT', 'a');
    const b = await account('TENANT', 'b');
    const room = await db.room.create({ data: { landlordId: owner.id, roomNumber: 'TEST', address: 'Test only', price: 3000000 } });
    const body = { roomId: room.id, phone: '0900000000', expectedPrice: 3000000 };
    await call('/rental-requests', null, undefined, 401);
    await call('/rental-requests', owner.token, body, 403);
    await call('/rental-requests', a.token, { ...body, expectedPrice: 1 }, 409);
    const first = await call('/rental-requests', a.token, body, 201);
    await call('/rental-requests', a.token, body, 409);
    assert.equal((await call('/rental-requests', stranger.token)).length, 0);
    await call(`/rental-requests/${first.id}/reject`, stranger.token, {}, 404);
    await call(`/rental-requests/${first.id}/cancel`, b.token, {}, 404);
    await call(`/rental-requests/${first.id}/approve`, a.token, {}, 403);
    await call(`/rental-requests/${first.id}/cancel`, a.token, {});
    const next = await call('/rental-requests', a.token, body, 201);
    await call(`/rental-requests/${next.id}/reject`, owner.token, {});
    const finalA = await call('/rental-requests', a.token, body, 201);
    const finalB = await call('/rental-requests', b.token, body, 201);
    const terms = { startDate: '2026-10-01', endDate: '2027-10-01', deposit: 3000000, billingDay: 5 };
    await call(`/rental-requests/${finalA.id}/approve`, owner.token, { ...terms, endDate: '2026-01-01' }, 422);
    // Simultaneous approvals must yield exactly one active contract.
    const responses = await Promise.all([finalA, finalB].map(request => fetch(`${base}/rental-requests/${request.id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(terms) })));
    for (const response of responses) { if (response.status === 500) console.error((await response.json()).message); }
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    const contracts = await db.contract.findMany({ where: { roomId: room.id, status: 'ACTIVE' }, include: { tenant: true } });
    assert.equal(contracts.length, 1);
    assert.equal((await db.room.findUnique({ where: { id: room.id } })).status, 'OCCUPIED');
    const winner = contracts[0].tenant.userId === a.id ? a : b;
    const active = await call('/contracts/my-active', winner.token);
    assert.equal(active.room.address, 'Test only');
    assert.equal(Number(active.rentPrice), 3000000);
    const unavailable = await call('/rooms/available', winner.token);
    assert(!unavailable.some(r => r.id === room.id));
    await call('/rental-requests', b.token, body, 409);
    console.log('PASS: request, duplicate/price checks, authorization, cancellation, rejection, concurrent approval, active contract and occupancy.');
  } finally {
    await db.rentalRequest.deleteMany({ where: { userId: { in: ids } } });
    await db.contract.deleteMany({ where: { landlordId: { in: ids } } });
    await db.tenant.deleteMany({ where: { landlordId: { in: ids } } });
    await db.room.deleteMany({ where: { landlordId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
