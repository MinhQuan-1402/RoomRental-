/**
 * Seed dashboard demo data — tạo rooms + contracts + invoices mẫu
 * cho landlord demo để dashboard có số liệu hiển thị.
 *
 * Run: npx tsx scripts/seed-dashboard-demo.ts
 */
import { prisma, connectDB, disconnectDB } from '../src/config/prisma';

async function main() {
  await connectDB();
  console.log('🌱 Seeding dashboard demo data...\n');

  const landlord = await prisma.user.findUnique({
    where: { email: 'demo-landlord@example.com' },
  });
  if (!landlord) {
    console.error('❌ Landlord demo-landlord@example.com not found. Run npm run seed first.');
    process.exit(1);
  }

  // ── 1. Clean old dashboard demo data ────────────────────────────────────────
  await prisma.payment.deleteMany({ where: { landlordId: landlord.id } });
  await prisma.invoice.deleteMany({ where: { landlordId: landlord.id } });
  await prisma.contract.deleteMany({ where: { landlordId: landlord.id } });
  await prisma.room.deleteMany({ where: { landlordId: landlord.id } });
  await prisma.tenant.deleteMany({ where: { landlordId: landlord.id } });

  // ── 2. Tenants ──────────────────────────────────────────────────────────────
  const tenants = await Promise.all([
    prisma.tenant.create({
      data: {
        landlordId: landlord.id,
        fullName: 'Nguyễn Văn An',
        phone: '0905123456',
        email: 'an.nguyen@example.com',
      },
    }),
    prisma.tenant.create({
      data: {
        landlordId: landlord.id,
        fullName: 'Trần Thị Bình',
        phone: '0908765432',
        email: 'binh.tran@example.com',
      },
    }),
    prisma.tenant.create({
      data: {
        landlordId: landlord.id,
        fullName: 'Lê Văn Cường',
        phone: '0912345678',
        email: 'cuong.le@example.com',
      },
    }),
  ]);

  // ── 3. Rooms (mixed statuses) ───────────────────────────────────────────────
  const roomsData = [
    { roomNumber: '101', floor: 1, price: 5000000, area: 28, status: 'OCCUPIED' as const },
    { roomNumber: '102', floor: 1, price: 5500000, area: 30, status: 'OCCUPIED' as const },
    { roomNumber: '103', floor: 1, price: 4800000, area: 25, status: 'OCCUPIED' as const },
    { roomNumber: '201', floor: 2, price: 6000000, area: 32, status: 'OCCUPIED' as const },
    { roomNumber: '202', floor: 2, price: 6200000, area: 35, status: 'OCCUPIED' as const },
    { roomNumber: '203', floor: 2, price: 5800000, area: 30, status: 'AVAILABLE' as const },
    { roomNumber: '301', floor: 3, price: 7000000, area: 40, status: 'AVAILABLE' as const },
    { roomNumber: '302', floor: 3, price: 7200000, area: 42, status: 'AVAILABLE' as const },
    { roomNumber: '303', floor: 3, price: 6500000, area: 38, status: 'MAINTENANCE' as const },
    { roomNumber: '304', floor: 3, price: 6800000, area: 38, status: 'OCCUPIED' as const },
  ];

  const rooms = [];
  for (const r of roomsData) {
    const room = await prisma.room.create({
      data: {
        ...r,
        landlordId: landlord.id,
        address: `Phòng ${r.roomNumber} - Tầng ${r.floor}`,
      },
    });
    rooms.push(room);
  }
  console.log(`✅ Created ${rooms.length} rooms (6 OCCUPIED, 3 AVAILABLE, 1 MAINTENANCE)`);

  // ── 4. Contracts cho các phòng OCCUPIED ─────────────────────────────────────
  const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED');
  const contracts = [];
  for (let i = 0; i < occupiedRooms.length; i++) {
    const room = occupiedRooms[i];
    const tenant = tenants[i % tenants.length];
    const startDate = new Date(2026, i, 1);
    const endDate = new Date(2027, i, 1);
    const contract = await prisma.contract.create({
      data: {
        landlordId: landlord.id,
        roomId: room.id,
        tenantId: tenant.id,
        startDate,
        endDate,
        rentPrice: room.price,
        deposit: room.price,
        billingDay: 5,
        status: 'ACTIVE',
      },
    });
    contracts.push({ contract, room });
  }
  console.log(`✅ Created ${contracts.length} active contracts`);

  // ── 5. Invoices: 6 tháng gần nhất (mỗi tháng 1 invoice / contract) ─────────
  const now = new Date();
  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  let invoiceCount = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;

  for (const { contract, room } of contracts) {
    for (let i = 0; i < monthLabels.length; i++) {
      const month = monthLabels[i];
      const isCurrentMonth = i === monthLabels.length - 1;
      const isPast = i < monthLabels.length - 1;

      // Random tiền điện nước
      const elecUsage = 80 + Math.floor(Math.random() * 120); // 80-200 kWh
      const waterUsage = 4 + Math.floor(Math.random() * 8);   // 4-12 m3
      const elecPrice = 3500;
      const waterPrice = 10000;
      const serviceFee = 50000;
      const elecTotal = elecUsage * elecPrice;
      const waterTotal = waterUsage * waterPrice;
      const total = Number(room.price) + elecTotal + waterTotal + serviceFee;

      const dueDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1, 5);
      const paidAt = isPast ? new Date(dueDate.getTime() + Math.random() * 5 * 86400000) : null;
      const status = paidAt
        ? 'PAID'
        : isCurrentMonth
          ? Math.random() > 0.5 ? 'PENDING' : 'OVERDUE'
          : 'PAID';

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${month}-${String(contract.id).padStart(3, '0')}-${room.roomNumber}`,
          contractId: contract.id,
          roomId: room.id,
          tenantId: contract.tenantId,
          landlordId: landlord.id,
          billingMonth: month,
          roomRent: room.price,
          electricityPrevious: 1000 + i * 200,
          electricityCurrent: 1000 + i * 200 + elecUsage,
          electricityUsage: elecUsage,
          electricityUnitPrice: elecPrice,
          electricityTotal: elecTotal,
          waterPrevious: 50 + i * 10,
          waterCurrent: 50 + i * 10 + waterUsage,
          waterUsage: waterUsage,
          waterUnitPrice: waterPrice,
          waterTotal: waterTotal,
          serviceFee,
          totalAmount: total,
          dueDate,
          paidAt,
          status,
        },
      });
      invoiceCount++;
      totalInvoiced += total;
      if (paidAt) totalPaid += total;
    }
  }

  console.log(`✅ Created ${invoiceCount} invoices`);
  console.log(`   💰 Tổng tiền đã lập: ${totalInvoiced.toLocaleString('vi-VN')} đ`);
  console.log(`   ✅ Đã thanh toán:    ${totalPaid.toLocaleString('vi-VN')} đ`);

  console.log('\n🎉 Dashboard demo data ready! Refresh /dashboard in browser.\n');
  await disconnectDB();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
