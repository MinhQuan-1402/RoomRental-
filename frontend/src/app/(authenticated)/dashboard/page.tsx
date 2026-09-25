"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AvailableRoom {
  id: number;
  roomNumber: string;
  floor: number | null;
  price: number;
  area: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  description: string | null;
  address: string;
  images: { url: string }[];
}

export interface MyActiveContract {
  id: number;
  startDate: string;
  endDate: string;
  rentPrice: number;
  deposit: number;
  billingDay: number;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "TERMINATED";
  terms: string | null;
  room: {
    id: number;
    roomNumber: string;
    floor: number | null;
    area: number | null;
    description: string | null;
    address: string;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  };
  tenant: {
    id: number;
    fullName: string;
    phone: string;
    email: string | null;
  };
}

export interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;
  expectedRevenue: number;
  collectedRevenue: number;
  pendingInvoiceAmount: number;
  overdueInvoiceAmount: number;
  activeContracts: number;
  expiringContracts: number;
  totalTenants: number;
  monthlyRevenue: { month: string; label: string; amount: number; invoiceCount: number }[];
  statusBreakdown: { status: string; label: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

const VNDCompact = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} triệu`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconRoom({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconKey({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
function IconDoorOpen({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
      <circle cx="15" cy="12" r="1" />
      <path d="M10 4v16" />
    </svg>
  );
}
function IconCoin({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 8.5h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-3" />
      <line x1="12" y1="7" x2="12" y2="17" />
    </svg>
  );
}
function IconWave() {
  return (
    <svg width="40" height="40" viewBox="0 0 80 80" fill="none">
      <path d="M10 60 Q 25 30, 40 50 T 70 30" stroke="#fff" strokeWidth="2" opacity="0.25" fill="none" />
    </svg>
  );
}

// ─── Shared Card primitive (tái sử dụng cho tất cả cards) ────────────────────
type CardTone = "teal" | "blue" | "purple" | "amber" | "rose" | "sky";

const TONE_STYLES: Record<
  CardTone,
  { bg: string; text: string; iconBg: string; iconColor: string }
> = {
  teal: { bg: "#F0FDFA", text: "#0F766E", iconBg: "#CCFBF1", iconColor: "#0F766E" },
  blue: { bg: "#EFF6FF", text: "#1D4ED8", iconBg: "#DBEAFE", iconColor: "#2563EB" },
  purple: { bg: "#FAF5FF", text: "#7C3AED", iconBg: "#F3E8FF", iconColor: "#9333EA" },
  amber: { bg: "#FFFBEB", text: "#B45309", iconBg: "#FEF3C7", iconColor: "#D97706" },
  rose: { bg: "#FFF1F2", text: "#BE123C", iconBg: "#FFE4E6", iconColor: "#E11D48" },
  sky: { bg: "#F0F9FF", text: "#0369A1", iconBg: "#E0F2FE", iconColor: "#0284C7" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  tone: CardTone;
  icon: React.ReactNode;
  delta?: { value: string; up: boolean };
  sublabel?: string;
  link?: { href: string; label: string };
}

const StatCard: React.FC<StatCardProps> = ({ label, value, tone, icon, delta, sublabel, link }) => {
  const t = TONE_STYLES[tone];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "var(--border-default)",
        padding: "20px",
        minHeight: 132,
      }}
    >
      {/* Header row: label trái + icon phải (cùng hàng) */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="text-[13px] font-medium uppercase tracking-wider"
          style={{ color: "var(--text-label)" }}
        >
          {label}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: t.iconBg, color: t.iconColor }}
        >
          {icon}
        </div>
      </div>

      {/* Big value */}
      <div className="text-[28px] font-bold leading-none" style={{ color: "var(--text-heading)" }}>
        {value}
      </div>

      {/* Optional delta chip */}
      {delta && (
        <div className="mt-2">
          <span
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: delta.up ? "#D1FAE5" : "#FEE2E2",
              color: delta.up ? "#047857" : "#B91C1C",
            }}
          >
            {delta.up ? "▲" : "▼"} {delta.value}
          </span>
        </div>
      )}

      {(sublabel || link) && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          {sublabel && (
            <span className="text-[11px]" style={{ color: "var(--text-label)" }}>
              {sublabel}
            </span>
          )}
          {link && (
            <a
              href={link.href}
              className="text-[11px] font-semibold hover:underline"
              style={{ color: t.text }}
            >
              {link.label} →
            </a>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Tenant-side helpers (giữ nguyên như cũ) ──────────────────────────────────
function TenantRoomCard({ room }: { room: AvailableRoom }) {
  const img = room.images?.[0]?.url;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
      {img && (
        <img
          src={img}
          alt={`Phòng ${room.roomNumber}`}
          className="w-full h-40 object-cover block"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 m-0">Phòng {room.roomNumber}</h3>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
            Còn trống
          </span>
        </div>
        <p className="text-[13px] text-slate-700 m-0">{room.address}</p>
        {room.description && <p className="text-[12px] text-slate-500 m-0">{room.description}</p>}
        <div className="flex items-end justify-between mt-auto pt-3 border-t border-slate-100">
          <div>
            <div className="text-[11px] text-slate-500">Giá thuê</div>
            <div className="text-base font-bold text-teal-700">
              {VND(room.price)}<span className="text-xs text-slate-500 ml-0.5">/tháng</span>
            </div>
          </div>
          <button className="bg-teal-700 text-white text-[13px] font-semibold rounded-lg px-3.5 py-2 border-none hover:bg-teal-800">
            Xem chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "browse"; rooms: AvailableRoom[] }
    | { kind: "rented"; contract: MyActiveContract }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    if (user?.role !== "TENANT") return;
    (async () => {
      try {
        const contract = (await api.get<MyActiveContract>("/contracts/my-active")).data;
        if (contract && contract.status === "ACTIVE") {
          setState({ kind: "rented", contract });
          return;
        }
        const rooms = (await api.get<AvailableRoom[]>("/rooms/available")).data;
        setState({ kind: "browse", rooms: rooms ?? [] });
      } catch (err) {
        setState({ kind: "error", message: err instanceof Error ? err.message : "Lỗi" });
      }
    })();
  }, [user?.role]);

  if (user?.role !== "TENANT") {
    return <LandlordDashboard />;
  }

  if (state.kind === "loading") return <CenterSpinner text="Đang tải dữ liệu..." />;
  if (state.kind === "error") return <CenterError message={state.message} />;

  return (
    <div className="max-w-[1100px]">
      <PageHeader
        title="Tổng quan"
        subtitle={`Xin chào, ${user.fullName}! Đây là thông tin phòng bạn đang thuê.`}
      />
      {state.kind === "rented" ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-slate-900 m-0 mb-1">Phòng {state.contract.room.roomNumber}</h2>
          <p className="text-sm text-slate-500 m-0">{state.contract.room.address}</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {state.rooms.map((r) => <TenantRoomCard key={r.id} room={r} />)}
        </div>
      )}
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
const PageHeader: React.FC<{ title: string; subtitle: string; right?: React.ReactNode }> = ({
  title,
  subtitle,
  right,
}) => (
  <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
    <div>
      <h1 className="text-[26px] font-bold text-slate-900 m-0 mb-1 tracking-tight">{title}</h1>
      <p className="text-[13px] text-slate-500 m-0">{subtitle}</p>
    </div>
    {right}
  </div>
);

const CenterSpinner: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center gap-3 py-12">
    <div className="w-8 h-8 border-[3px] border-teal-100 border-t-teal-700 rounded-full animate-spin" />
    <span className="text-sm text-slate-500">{text}</span>
  </div>
);

const CenterError: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
    <p className="text-rose-600 m-0 mb-2 text-sm">⚠️ {message}</p>
  </div>
);

// ─── LANDLORD DASHBOARD (theo mẫu thiết kế) ───────────────────────────────────
function LandlordDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = (await api.get<DashboardStats>("/dashboard/landlord-stats")).data;
        if (!data) setError("Không thể tải thống kê");
        else setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <CenterSpinner text="Đang tải thống kê..." />;
  if (error || !stats) return <CenterError message={error ?? "Không có dữ liệu"} />;

  return (
    <div className="w-full space-y-7">
      {/* ─── Header với gradient background ──────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-8 py-7"
        style={{
          background:
            "linear-gradient(135deg, #F0FDFA 0%, #ECFEFF 50%, #FAF5FF 100%)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="absolute -right-6 -bottom-6 opacity-50 pointer-events-none">
          <IconWave />
        </div>
        <div className="relative">
          <h1 className="text-[26px] font-bold text-slate-900 m-0 mb-1.5 tracking-tight">
            Xin chào, {user?.fullName} 👋
          </h1>
          <p className="text-[14px] text-slate-600 m-0 max-w-2xl">
            Chào mừng bạn quay lại! Đây là tổng quan hoạt động kinh doanh của bạn hôm nay.
          </p>
        </div>
      </div>

      {/* ─── 4 KPI Cards — full width, gap 24px ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Tổng số phòng"
          value={stats.totalRooms}
          tone="blue"
          icon={<IconRoom />}
          sublabel={`${stats.occupiedRooms} đang thuê · ${stats.maintenanceRooms} bảo trì`}
          link={{ href: "/rooms", label: "Xem chi tiết" }}
        />
        <StatCard
          label="Đang cho thuê"
          value={stats.occupiedRooms}
          tone="teal"
          icon={<IconKey />}
          sublabel={`${stats.activeContracts} hợp đồng hiệu lực`}
          link={{ href: "/contracts", label: "Xem hợp đồng" }}
        />
        <StatCard
          label="Phòng trống"
          value={stats.availableRooms}
          tone="purple"
          icon={<IconDoorOpen />}
          sublabel="Sẵn sàng cho thuê"
          link={{ href: "/rooms?status=AVAILABLE", label: "Đăng tin" }}
        />
        <StatCard
          label="Doanh thu dự kiến"
          value={VNDCompact(stats.expectedRevenue)}
          tone="amber"
          icon={<IconCoin />}
          sublabel={`Đã thu ${VNDCompact(stats.collectedRevenue)} tháng này`}
          link={{ href: "/invoices", label: "Xem hóa đơn" }}
        />
      </div>

      {/* ─── Sub-row: occupancy progress + financial status — 2 cols, gap 24 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900 m-0">Tỷ lệ lấp đầy</h3>
              <p className="text-[12px] text-slate-500 m-0 mt-0.5">So với tổng số phòng</p>
            </div>
            <span className="text-[28px] font-bold text-teal-700">{stats.occupancyRate}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-700 rounded-full transition-all duration-700"
              style={{ width: `${stats.occupancyRate}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniStatus color="emerald" label="Đang thuê" value={stats.occupiedRooms} />
            <MiniStatus color="sky" label="Còn trống" value={stats.availableRooms} />
            <MiniStatus color="slate" label="Bảo trì" value={stats.maintenanceRooms} />
          </div>
        </div>

        {/* Financial */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900 m-0">Tình hình tài chính</h3>
              <p className="text-[12px] text-slate-500 m-0 mt-0.5">
                Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <FinancialRow
              tone="emerald"
              label="Đã thu"
              value={VND(stats.collectedRevenue)}
              hint="Hóa đơn PAID trong tháng"
            />
            <FinancialRow
              tone="amber"
              label="Chờ thanh toán"
              value={VND(stats.pendingInvoiceAmount)}
              hint="Hóa đơn PENDING"
            />
            <FinancialRow
              tone="rose"
              label="Quá hạn"
              value={VND(stats.overdueInvoiceAmount)}
              hint="Hóa đơn OVERDUE"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small primitives ─────────────────────────────────────────────────────────
const MiniStatus: React.FC<{ color: "emerald" | "sky" | "slate"; label: string; value: number }> = ({
  color,
  label,
  value,
}) => {
  const map = {
    emerald: { bg: "#D1FAE5", text: "#047857" },
    sky: { bg: "#E0F2FE", text: "#0369A1" },
    slate: { bg: "#F1F5F9", text: "#475569" },
  };
  const c = map[color];
  return (
    <div className="rounded-lg p-2" style={{ backgroundColor: c.bg }}>
      <div className="text-lg font-bold" style={{ color: c.text }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: c.text }}>
        {label}
      </div>
    </div>
  );
};

const FinancialRow: React.FC<{
  tone: "emerald" | "amber" | "rose";
  label: string;
  value: string;
  hint: string;
}> = ({ tone, label, value, hint }) => {
  const map = {
    emerald: { bg: "#D1FAE5", text: "#047857" },
    amber: { bg: "#FEF3C7", text: "#B45309" },
    rose: { bg: "#FEE2E2", text: "#B91C1C" },
  };
  const c = map[tone];
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[16px] font-bold"
          style={{ backgroundColor: c.bg, color: c.text }}
        >
          {tone === "emerald" ? "✓" : tone === "amber" ? "⏱" : "!"}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-900">{label}</div>
          <div className="text-[11px] text-slate-500">{hint}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-bold" style={{ color: c.text }}>
          {value}
        </div>
      </div>
    </div>
  );
};
