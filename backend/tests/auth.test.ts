/**
 * Task 6 — User Authentication & Authorization tests.
 *
 * Run with:
 *   npx tsx tests/auth.test.ts
 *
 * Pre-requisites:
 *   - MySQL is reachable via DATABASE_URL
 *   - The migration `add_user_auth` has been applied
 *   - Server is NOT running on port 5002
 */
import jsonwebtoken from 'jsonwebtoken';
import { app } from '../src/app';
import { connectDB, disconnectDB, prisma } from '../src/config/prisma';
import { env } from '../src/config/env';

const BASE_PORT = 5002;
const LANDLORD_EMAIL = 'landlord-task6@test.com';
const TENANT_EMAIL = 'tenant-task6@test.com';
const PASSWORD = 'Password123';

async function run() {
  console.log('🧪 Task 6 — User Authentication & Authorization Tests\n');
  await connectDB();

  // Clean up test users
  await prisma.user.deleteMany({
    where: { email: { in: [LANDLORD_EMAIL, TENANT_EMAIL] } },
  });

  const server = app.listen(BASE_PORT, async () => {
    const base = `http://localhost:${BASE_PORT}/api`;
    const failures: string[] = [];

    const assert = (cond: boolean, msg: string) => {
      if (!cond) failures.push(msg);
    };

    try {
      // ============================================================
      // 1. REGISTER: Valid LANDLORD
      // ============================================================
      console.log('1. Register LANDLORD → success');
      const regRes = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Phạm Minh Quân',
          email: LANDLORD_EMAIL,
          password: PASSWORD,
          phone: '0123456789',
          role: 'LANDLORD',
        }),
      });
      const regData = await regRes.json();
      console.log(`   status=${regRes.status} role=${regData.data?.role}`);
      assert(regRes.status === 201, 'Register LANDLORD: expected 201');
      assert(regData.success === true, 'Register LANDLORD: success flag');
      assert(regData.data?.email === LANDLORD_EMAIL, 'Register LANDLORD: email');
      assert(regData.data?.role === 'LANDLORD', 'Register LANDLORD: role');
      assert(regData.data?.phone === '0123456789', 'Register LANDLORD: phone');
      assert(!('password' in (regData.data || {})), 'Register LANDLORD: no password leaked');
      assert(!('passwordHash' in (regData.data || {})), 'Register LANDLORD: no passwordHash leaked');
      assert(!('refreshToken' in (regData.data || {})), 'Register LANDLORD: no refreshToken leaked');
      // isActive MAY be returned to the client (so they know their account is active),
      // but the client cannot SET it. We test the SETTING restriction below.

      // Verify DB row
      const landlordRow = await prisma.user.findUnique({ where: { email: LANDLORD_EMAIL } });
      assert(!!landlordRow, 'Register LANDLORD: row exists in DB');
      assert(landlordRow!.passwordHash.startsWith('$2'), 'Register LANDLORD: password is bcrypt-hashed');
      assert(landlordRow!.passwordHash !== PASSWORD, 'Register LANDLORD: plaintext NOT stored');
      assert(landlordRow!.isActive === true, 'Register LANDLORD: default isActive=true');

      // ============================================================
      // 2. REGISTER: Valid TENANT
      // ============================================================
      console.log('\n2. Register TENANT → success');
      const tenantRegRes = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Nguyễn Văn A',
          email: TENANT_EMAIL,
          password: PASSWORD,
          role: 'TENANT',
        }),
      });
      const tenantRegData = await tenantRegRes.json();
      assert(tenantRegRes.status === 201, 'Register TENANT: expected 201');
      assert(tenantRegData.data?.role === 'TENANT', 'Register TENANT: role');

      // ============================================================
      // 3. REGISTER: Duplicate email
      // ============================================================
      console.log('\n3. Register duplicate email → 409');
      const dupRes = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Trùng Email',
          email: LANDLORD_EMAIL,
          password: PASSWORD,
          role: 'TENANT',
        }),
      });
      const dupData = await dupRes.json();
      assert(dupRes.status === 409, 'Duplicate: expected 409');
      assert(dupData.error?.code === 'EMAIL_ALREADY_EXISTS', 'Duplicate: code');

      // ============================================================
      // 4. REGISTER: Invalid email
      // ============================================================
      console.log('\n4. Register invalid email → 422');
      const badEmailRes = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test User',
          email: 'not-an-email',
          password: PASSWORD,
          role: 'TENANT',
        }),
      });
      assert(badEmailRes.status === 422, 'Invalid email: expected 422');

      // ============================================================
      // 5. REGISTER: Invalid password (too short, no letter, no number)
      // ============================================================
      console.log('\n5. Register weak password → 422');
      const weakPwRes = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test User',
          email: 'weak@test.com',
          password: 'abc',
          role: 'TENANT',
        }),
      });
      assert(weakPwRes.status === 422, 'Weak password: expected 422');

      // ============================================================
      // 6. REGISTER: ADMIN role → REJECTED
      // ============================================================
      console.log('\n6. Register ADMIN → 422 (forbidden)');
      const adminRes = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Sneaky Admin',
          email: 'admin@test.com',
          password: PASSWORD,
          role: 'ADMIN',
        }),
      });
      const adminData = await adminRes.json();
      assert(adminRes.status === 422, 'ADMIN register: expected 422');
      assert(adminData.error?.code === 'VALIDATION_ERROR', 'ADMIN register: code');

      // ============================================================
      // 7. REGISTER: Mass-assignment protection (isActive=false)
      //
      // The schema is .strict() → unknown keys are rejected at validation
      // with HTTP 422. The client CANNOT control isActive/refreshToken/etc.
      // ============================================================
      console.log('\n7. Register with isActive=false → rejected by .strict()');
      const massAssignRes = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Mass Assign Tester',
          email: 'massassign@test.com',
          password: PASSWORD,
          role: 'TENANT',
          isActive: false,
        }),
      });
      const massAssignData = await massAssignRes.json();
      assert(massAssignRes.status === 422, 'Mass assign: expected 422 (extra field rejected)');
      assert(massAssignData.error?.code === 'VALIDATION_ERROR', 'Mass assign: code');

      // Confirm no user was created
      const massRow = await prisma.user.findUnique({ where: { email: 'massassign@test.com' } });
      assert(massRow === null, 'Mass assign: NO user created in DB');

      // ============================================================
      // 8. LOGIN: Correct credentials
      // ============================================================
      console.log('\n8. Login correct credentials → success');
      const loginRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: LANDLORD_EMAIL, password: PASSWORD }),
      });
      const loginData = await loginRes.json();
      assert(loginRes.status === 200, 'Login: expected 200');
      assert(!!loginData.data?.tokens?.accessToken, 'Login: accessToken present');
      assert(!!loginData.data?.tokens?.refreshToken, 'Login: refreshToken present');
      assert(!('passwordHash' in (loginData.data?.user || {})), 'Login: passwordHash not leaked');
      const accessToken = loginData.data.tokens.accessToken;
      const refreshToken = loginData.data.tokens.refreshToken;

      // ============================================================
      // 9. LOGIN: Wrong password → 401
      // ============================================================
      console.log('\n9. Login wrong password → 401');
      const wrongRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: LANDLORD_EMAIL, password: 'WrongPassword' }),
      });
      assert(wrongRes.status === 401, 'Wrong password: expected 401');

      // ============================================================
      // 10. LOGIN: Unknown email → 401
      // ============================================================
      console.log('\n10. Login unknown email → 401');
      const noUserRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@nowhere.com', password: PASSWORD }),
      });
      assert(noUserRes.status === 401, 'Unknown email: expected 401');

      // ============================================================
      // 11. LOGIN: Inactive account → 403 ACCOUNT_INACTIVE
      // ============================================================
      console.log('\n11. Login inactive account → 403');
      await prisma.user.update({ where: { email: TENANT_EMAIL }, data: { isActive: false } });
      const inactiveRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TENANT_EMAIL, password: PASSWORD }),
      });
      const inactiveData = await inactiveRes.json();
      assert(inactiveRes.status === 403, 'Inactive: expected 403');
      assert(inactiveData.error?.code === 'ACCOUNT_INACTIVE', 'Inactive: code');
      // restore
      await prisma.user.update({ where: { email: TENANT_EMAIL }, data: { isActive: true } });

      // ============================================================
      // 12. AUTH MIDDLEWARE: No Authorization header → 401
      // ============================================================
      console.log('\n12. /auth/me without token → 401');
      const noAuthRes = await fetch(`${base}/auth/me`);
      assert(noAuthRes.status === 401, 'No token: expected 401');

      // ============================================================
      // 13. AUTH MIDDLEWARE: Malformed Bearer → 401
      // ============================================================
      console.log('\n13. /auth/me with malformed Bearer → 401');
      const malformedRes = await fetch(`${base}/auth/me`, {
        headers: { Authorization: 'NotBearer xyz' },
      });
      assert(malformedRes.status === 401, 'Malformed: expected 401');

      // ============================================================
      // 14. AUTH MIDDLEWARE: Invalid token → 401
      // ============================================================
      console.log('\n14. /auth/me with invalid token → 401');
      const invalidRes = await fetch(`${base}/auth/me`, {
        headers: { Authorization: 'Bearer not.a.real.jwt' },
      });
      const invalidData = await invalidRes.json();
      assert(invalidRes.status === 401, 'Invalid token: expected 401');
      assert(invalidData.error?.code === 'INVALID_TOKEN', 'Invalid token: code');

      // ============================================================
      // 15. AUTH MIDDLEWARE: Expired token → 401 TOKEN_EXPIRED
      // ============================================================
      console.log('\n15. /auth/me with expired token → 401 TOKEN_EXPIRED');
      const landlordForToken = await prisma.user.findUnique({ where: { email: LANDLORD_EMAIL } });
      const expired = jsonwebtoken.sign(
        { userId: landlordForToken!.id.toString(), role: 'LANDLORD', email: landlordForToken!.email },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '0s' }
      );
      const expiredRes = await fetch(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${expired}` },
      });
      const expiredData = await expiredRes.json();
      assert(expiredRes.status === 401, 'Expired: expected 401');
      assert(expiredData.error?.code === 'TOKEN_EXPIRED', 'Expired: code');

      // ============================================================
      // 16. AUTH MIDDLEWARE: Valid token → 200
      // ============================================================
      console.log('\n16. /auth/me with valid token → 200');
      const meRes = await fetch(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      assert(meRes.status === 200, 'Valid token: expected 200');
      assert(meData.data?.email === LANDLORD_EMAIL, 'Valid token: email matches');
      assert(!('passwordHash' in (meData.data || {})), 'Valid token: no passwordHash leaked');
      assert(!('refreshToken' in (meData.data || {})), 'Valid token: no refreshToken leaked');

      // ============================================================
      // 17. REFRESH: Valid refresh token → new access token
      // ============================================================
      console.log('\n17. /auth/refresh with valid token → new access token');
      const refreshRes = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const refreshData = await refreshRes.json();
      assert(refreshRes.status === 200, 'Refresh valid: expected 200');
      assert(!!refreshData.data?.accessToken, 'Refresh valid: accessToken present');

      // ============================================================
      // 18. REFRESH: Invalid token → 401
      // ============================================================
      console.log('\n18. /auth/refresh with invalid token → 401');
      const fakeRefreshRes = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'fake.token.here' }),
      });
      assert(fakeRefreshRes.status === 401, 'Refresh invalid: expected 401');

      // ============================================================
      // 19. ROLE: LANDLORD can access landlord-only
      // ============================================================
      console.log('\n19. LANDLORD → /test/landlord-only → 200');
      const landlordOnlyRes = await fetch(`${base}/test/landlord-only`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert(landlordOnlyRes.status === 200, 'LANDLORD → landlord-only: expected 200');

      // ============================================================
      // 20. ROLE: TENANT cannot access landlord-only → 403
      // ============================================================
      console.log('\n20. TENANT → /test/landlord-only → 403');
      const tenantLoginRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TENANT_EMAIL, password: PASSWORD }),
      });
      const tenantAccessToken = (await tenantLoginRes.json()).data.tokens.accessToken;
      const forbiddenRes = await fetch(`${base}/test/landlord-only`, {
        headers: { Authorization: `Bearer ${tenantAccessToken}` },
      });
      const forbiddenData = await forbiddenRes.json();
      assert(forbiddenRes.status === 403, 'TENANT → landlord-only: expected 403');
      assert(forbiddenData.error?.code === 'FORBIDDEN', 'TENANT → landlord-only: code');

      // ============================================================
      // 21. LOGOUT: Revokes refresh token
      // ============================================================
      console.log('\n21. Logout → old refresh token rejected');
      const logoutRes = await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert(logoutRes.status === 200, 'Logout: expected 200');

      const reUseRes = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      assert(reUseRes.status === 401, 'Refresh after logout: expected 401');

      // ============================================================
      // RESULT
      // ============================================================
      console.log('\n────────────────────────────────────────────');
      if (failures.length === 0) {
        console.log(`🎉 ALL 21 TESTS PASSED`);
      } else {
        console.log(`❌ ${failures.length} TEST(S) FAILED:`);
        for (const f of failures) console.log(`   - ${f}`);
        process.exitCode = 1;
      }
    } catch (err) {
      console.error('❌ Test execution error:', err);
      process.exitCode = 1;
    } finally {
      // Clean up
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [LANDLORD_EMAIL, TENANT_EMAIL, 'massassign@test.com'],
          },
        },
      });
      await disconnectDB();
      server.close(() => console.log('Test server closed.'));
    }
  });
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
