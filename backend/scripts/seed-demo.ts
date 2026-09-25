/**
 * Seed script — creates 1 landlord + 2 sample properties + 6 rooms
 * so the tenant browse UI has data to render right away.
 *
 * Safe to re-run: it deletes sample data first (matched by marker names).
 *
 * Run with: npx tsx scripts/seed-demo.ts
 */
import bcryptjs from 'bcryptjs';
import { prisma, connectDB, disconnectDB } from '../src/config/prisma';

const LANDLORD_EMAIL = 'demo-landlord@example.com';
const SAMPLE_PROPERTY_PREFIX = '[DEMO] ';

async function main() {
  await connectDB();

  console.log('🌱 Seeding demo data…\n');

  // ── 1. Landlord user ────────────────────────────────────────────────────────
  const passwordHash = await bcryptjs.hash('Demo@1234', 10);

  const landlord = await prisma.user.upsert({
    where: { email: LANDLORD_EMAIL },
    update: {},
    create: {
      email: LANDLORD_EMAIL,
      passwordHash,
      fullName: 'Demo Chủ Trọ',
      phone: '0900000001',
      role: 'LANDLORD',
      authProvider: 'LOCAL',
    },
  });
  console.log(`✅ Landlord: ${landlord.email} (id=${landlord.id})`);

  // ── 2. Clean up any previous demo properties + rooms ────────────────────────
  const oldProps = await prisma.property.findMany({
    where: { name: { startsWith: SAMPLE_PROPERTY_PREFIX } },
    select: { id: true },
  });
  if (oldProps.length > 0) {
    const oldPropIds = oldProps.map((p) => p.id);
    await prisma.room.deleteMany({ where: { propertyId: { in: oldPropIds } } });
    await prisma.property.deleteMany({ where: { id: { in: oldPropIds } } });
    console.log(`🧹 Removed ${oldProps.length} old demo property/properties`);
  }

  // ── 3. Sample properties ────────────────────────────────────────────────────
  const prop1 = await prisma.property.create({
    data: {
      landlordId: landlord.id,
      name: `${SAMPLE_PROPERTY_PREFIX}Sunrise House`,
      address: '123 Nguyễn Văn Cừ, Long Biên, Hà Nội',
      description: 'Khu trọ mới xây, an ninh 24/7, gần ĐH Mỏ - Địa chất.',
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      landlordId: landlord.id,
      name: `${SAMPLE_PROPERTY_PREFIX}Sunset Garden`,
      address: '45 Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
      description: 'Khu trọ trung tâm, đầy đủ tiện nghi, gần chợ Bến Thành.',
    },
  });
  console.log(`✅ Created 2 properties`);

  // ── 4. Sample rooms ─────────────────────────────────────────────────────────
  const roomsData = [
    // Sunrise House
    { propertyId: prop1.id, landlordId: landlord.id, roomNumber: '101', floor: 1, price: 3500000, area: 25, description: 'Phòng đơn, có ban công, view đường.' },
    { propertyId: prop1.id, landlordId: landlord.id, roomNumber: '102', floor: 1, price: 3800000, area: 28, description: 'Phòng đơn, full nội thất (giường, tủ, máy lạnh).' },
    { propertyId: prop1.id, landlordId: landlord.id, roomNumber: '201', floor: 2, price: 4200000, area: 30, description: 'Phòng đôi, 2 giường, có cửa sổ lớn.' },
    // Sunset Garden
    { propertyId: prop2.id, landlordId: landlord.id, roomNumber: 'A01', floor: 1, price: 5000000, area: 32, description: 'Phòng studio, full nội thất cao cấp.' },
    { propertyId: prop2.id, landlordId: landlord.id, roomNumber: 'A02', floor: 1, price: 5200000, area: 35, description: 'Phòng studio, có bếp riêng.' },
    { propertyId: prop2.id, landlordId: landlord.id, roomNumber: 'B05', floor: 2, price: 6500000, area: 45, description: 'Phòng VIP 2PN, view thành phố.' },
  ];

  await prisma.room.createMany({
    data: roomsData.map((r) => ({
      ...r,
      status: 'AVAILABLE' as const,
    })),
  });
  console.log(`✅ Created ${roomsData.length} rooms (all AVAILABLE)`);

  console.log('\n🎉 Seed complete!\n');
  console.log('Login credentials:');
  console.log(`  Email    : ${LANDLORD_EMAIL}`);
  console.log(`  Password : Demo@1234\n`);
  console.log('To test the tenant flow:');
  console.log('  1. Register a new TENANT account at /auth');
  console.log('  2. After login, you should see 6 available rooms on the dashboard\n');

  await disconnectDB();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
