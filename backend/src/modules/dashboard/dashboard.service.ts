import { prisma } from '../../config/prisma';

export interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;          // % phòng đang thuê / tổng
  expectedRevenue: number;        // tổng tiền thuê nếu tất cả occupied đều trả đủ
  collectedRevenue: number;       // đã thu trong tháng hiện tại
  pendingInvoiceAmount: number;   // tổng hóa đơn chưa thanh toán
  overdueInvoiceAmount: number;   // tổng hóa đơn quá hạn
  activeContracts: number;
  expiringContracts: number;      // hợp đồng sắp hết hạn trong 30 ngày
  totalTenants: number;
  monthlyRevenue: MonthlyRevenuePoint[];
  statusBreakdown: { status: string; count: number; label: string }[];
}

export interface MonthlyRevenuePoint {
  month: string;          // "2026-04"
  label: string;          // "T04"
  amount: number;         // tổng tiền đã thu
  invoiceCount: number;
}

const MONTHS_BACK = 6;

export class DashboardService {
  /**
   * Lấy thống kê dashboard cho landlord.
   * Aggregate 1 lượt từ DB để giảm round-trips.
   */
  async getLandlordStats(landlordId: number): Promise<DashboardStats> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1), 1);

    // 1. Room status counts
    const roomGroups = await prisma.room.groupBy({
      by: ['status'],
      where: { landlordId },
      _count: { _all: true },
    });

    const totalRooms = roomGroups.reduce((s, g) => s + g._count._all, 0);
    const occupiedRooms = roomGroups.find((g) => g.status === 'OCCUPIED')?._count._all ?? 0;
    const availableRooms = roomGroups.find((g) => g.status === 'AVAILABLE')?._count._all ?? 0;
    const maintenanceRooms = roomGroups.find((g) => g.status === 'MAINTENANCE')?._count._all ?? 0;
    const occupancyRate = totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100);

    // 2. Expected revenue (landlord's rooms × rent price)
    const allRooms = await prisma.room.findMany({
      where: { landlordId },
      select: { status: true, price: true },
    });
    const expectedRevenue = allRooms
      .filter((r) => r.status === 'OCCUPIED')
      .reduce((s, r) => s + Number(r.price), 0);

    // 3. Current month collected & pending revenue
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [
      currentPaidInvoices,
      pendingInvoices,
      overdueInvoices,
      activeContracts,
      expiringSoon,
      totalTenants,
      last6MonthsInvoices,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          landlordId,
          billingMonth: currentMonth,
          status: 'PAID',
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          landlordId,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.invoice.aggregate({
        where: {
          landlordId,
          status: 'OVERDUE',
        },
        _sum: { totalAmount: true },
      }),
      prisma.contract.count({
        where: { landlordId, status: 'ACTIVE' },
      }),
      prisma.contract.count({
        where: {
          landlordId,
          status: 'ACTIVE',
          endDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.tenant.count({ where: { landlordId } }),
      prisma.invoice.findMany({
        where: {
          landlordId,
          billingMonth: { gte: this.formatMonth(sixMonthsAgo) },
          status: 'PAID',
        },
        select: {
          billingMonth: true,
          totalAmount: true,
        },
      }),
    ]);

    // 4. Aggregate monthly revenue (last 6 months)
    const monthlyMap = new Map<string, MonthlyRevenuePoint>();
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = this.formatMonth(d);
      monthlyMap.set(key, {
        month: key,
        label: `T${String(d.getMonth() + 1).padStart(2, '0')}`,
        amount: 0,
        invoiceCount: 0,
      });
    }
    last6MonthsInvoices.forEach((inv) => {
      const point = monthlyMap.get(inv.billingMonth);
      if (point) {
        point.amount += Number(inv.totalAmount);
        point.invoiceCount += 1;
      }
    });

    // 5. Status breakdown for pie/donut chart
    const statusBreakdown = [
      { status: 'OCCUPIED', label: 'Đang thuê', count: occupiedRooms },
      { status: 'AVAILABLE', label: 'Còn trống', count: availableRooms },
      { status: 'MAINTENANCE', label: 'Bảo trì', count: maintenanceRooms },
    ];

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      occupancyRate,
      expectedRevenue,
      collectedRevenue: Number(currentPaidInvoices._sum.totalAmount ?? 0),
      pendingInvoiceAmount: Number(pendingInvoices._sum.totalAmount ?? 0),
      overdueInvoiceAmount: Number(overdueInvoices._sum.totalAmount ?? 0),
      activeContracts,
      expiringContracts: expiringSoon,
      totalTenants,
      monthlyRevenue: Array.from(monthlyMap.values()),
      statusBreakdown,
    };
  }

  private formatMonth(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

export const dashboardService = new DashboardService();
