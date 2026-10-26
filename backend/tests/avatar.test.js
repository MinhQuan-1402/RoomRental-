process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const { validateAvatar, MAX_AVATAR_BYTES } = require('../dist/modules/auth/avatar.validation');
const { AvatarService, avatarService } = require('../dist/modules/auth/avatar.service');
const { ownedAvatarPublicId } = require('../dist/modules/auth/avatar.storage');
const { env } = require('../dist/config/env');
const { app } = require('../dist/app');

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const file = { buffer: png, mimetype: 'image/png', originalname: 'avatar.png' };
const record = (id, role = 'TENANT') => ({ id, role, email: `avatar-${id}@test.invalid`, fullName: 'Avatar test', phone: null,
  isActive: true, authProvider: 'LOCAL', avatarUrl: null, passwordHash: 'never-return-this', createdAt: new Date(), updatedAt: new Date() });

test('avatar validation rejects missing, empty, forged, SVG and oversized files', () => {
  assert.equal(validateAvatar(file), png);
  for (const invalid of [undefined, { buffer: Buffer.alloc(0), mimetype: 'image/png' },
    { buffer: Buffer.from('<svg/>'), mimetype: 'image/png' }, { buffer: png, mimetype: 'image/svg+xml' },
    { buffer: png, mimetype: 'image/jpeg' }]) {
    assert.throws(() => validateAvatar(invalid), error => error.statusCode === 400);
  }
  assert.throws(() => validateAvatar({ buffer: Buffer.alloc(MAX_AVATAR_BYTES + 1), mimetype: 'image/png' }), error => error.statusCode === 413);
});

test('cleanup only accepts avatar URLs belonging to the current account and cloud', () => {
  const url = 'https://res.cloudinary.com/test-cloud/image/upload/v123/room_rental/avatars/user-7-abc123.webp';
  assert.equal(ownedAvatarPublicId(7, url, 'test-cloud'), 'room_rental/avatars/user-7-abc123');
  assert.equal(ownedAvatarPublicId(8, url, 'test-cloud'), null);
  assert.equal(ownedAvatarPublicId(7, url, 'other-cloud'), null);
  assert.equal(ownedAvatarPublicId(7, url.replace('res.cloudinary.com', 'example.com'), 'test-cloud'), null);
  assert.equal(ownedAvatarPublicId(7, url.replace('/avatars/', '/rooms/'), 'test-cloud'), null);
  assert.equal(ownedAvatarPublicId(7, 'https://lh3.googleusercontent.com/avatar.png', 'test-cloud'), null);
});

test('failed uploads preserve the old avatar; failed database writes clean the new upload', async () => {
  const current = { ...record(7), avatarUrl: 'old-avatar' };
  const removed = [];
  let writes = 0;
  const users = { findById: async () => current, updateAvatar: async () => { writes++; throw new Error('database unavailable'); } };
  const storage = { upload: async () => { throw new Error('upload unavailable'); }, remove: async (_, url) => removed.push(url) };
  const service = new AvatarService(users, storage);
  await assert.rejects(service.upload('7', file), /upload unavailable/);
  assert.equal(writes, 0);
  assert.deepEqual(removed, []);
  storage.upload = async () => 'new-avatar';
  await assert.rejects(service.upload('7', file), /database unavailable/);
  assert.deepEqual(removed, ['new-avatar']);
  assert.equal(current.avatarUrl, 'old-avatar');
});

test('disabled or missing accounts cannot upload; cleanup failures do not fail a saved profile', async () => {
  let current = { ...record(7), isActive: false };
  let uploads = 0;
  const service = new AvatarService({ findById: async () => current, updateAvatar: async (_, avatarUrl) => ({ ...current, avatarUrl }) },
    { upload: async () => { uploads++; return 'new-avatar'; }, remove: async () => { throw new Error('cleanup failed'); } });
  await assert.rejects(service.upload('7', file), error => error.code === 'ACCOUNT_INACTIVE');
  current = null;
  await assert.rejects(service.upload('7', file), error => error.code === 'NOT_FOUND');
  assert.equal(uploads, 0);
  current = { ...record(7), avatarUrl: 'old-avatar' };
  assert.equal((await service.upload('7', file)).avatarUrl, 'new-avatar');
});

test('multipart avatar route: authentication, both roles, owner isolation, size and file validation', { timeout: 15000 }, async () => {
  const originalUsers = avatarService.users, originalStorage = avatarService.storage;
  const records = new Map([[7, record(7)], [8, record(8, 'LANDLORD')]]);
  avatarService.users = {
    findById: async id => records.get(id),
    updateAvatar: async (id, avatarUrl) => { const updated = { ...records.get(id), avatarUrl }; records.set(id, updated); return updated; },
  };
  avatarService.storage = { upload: async id => `https://images.test.invalid/avatar-${id}.webp`, remove: async () => {} };
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/auth/me/avatar`;
  async function send(id, buffer = png, mime = 'image/png', field = 'avatar', addUserId = false) {
    const body = new FormData();
    if (buffer) body.append(field, new Blob([buffer], { type: mime }), 'avatar.png');
    if (addUserId) body.append('userId', '8');
    const headers = id ? { Authorization: `Bearer ${jwt.sign({ userId: String(id), role: records.get(id).role }, env.JWT_ACCESS_SECRET, { expiresIn: '1m' })}` } : {};
    const response = await fetch(url, { method: 'POST', headers, body });
    return { status: response.status, body: await response.json() };
  }
  try {
    assert.equal((await send(null)).status, 401);
    assert.equal((await send(7, null)).status, 400);
    assert.equal((await send(7, Buffer.from('fake-image'))).status, 400);
    assert.equal((await send(7, png, 'image/svg+xml')).status, 400);
    assert.equal((await send(7, Buffer.alloc(MAX_AVATAR_BYTES + 1))).status, 413);
    assert.equal((await send(7, png, 'image/png', 'wrong-field')).status, 400);
    assert.equal((await send(7, png, 'image/png', 'avatar', true)).status, 400);
    assert.equal(records.get(8).avatarUrl, null);
    for (const id of [7, 8]) {
      const response = await send(id);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.id, id);
      assert.equal(response.body.data.avatarUrl, records.get(id).avatarUrl);
      assert.equal(response.body.data.passwordHash, undefined);
    }
  } finally {
    avatarService.users = originalUsers; avatarService.storage = originalStorage;
    await new Promise(resolve => server.close(resolve));
  }
});
