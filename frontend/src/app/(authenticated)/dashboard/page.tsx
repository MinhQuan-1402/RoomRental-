"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { TenantHero, TenantBrowse } from "@/components/tenant/TenantDashboard";
import tenantStyles from "@/components/tenant/TenantDashboard.module.css";
import LandlordOverview from "@/components/landlord/LandlordOverview";

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

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ─── KPI 4 stats ──────────────────────────────────────────────────────────────
function TenantKpis({ contract }: { contract: MyActiveContract }) {
  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const now = new Date();
  const totalDays = Math.max(
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    1
  );
  const passedDays = Math.max(
    Math.min(
      Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      totalDays
    ),
    0
  );
  const remainingDays = Math.max(totalDays - passedDays, 0);
  const progressPct = Math.round((passedDays / totalDays) * 100);

  const kpis = [
    {
      label: "Giá thuê / tháng",
      value: VNDCompact(contract.rentPrice),
      sub: "HĐ hiện tại",
      accent: "from-teal-500 to-emerald-600",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: "Tiền đặt cọc",
      value: VNDCompact(contract.deposit),
      sub: "Theo hợp đồng",
      accent: "from-violet-500 to-purple-600",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M2 10h20" />
        </svg>
      ),
    },
    {
      label: "Ngày thanh toán",
      value: `Ngày ${contract.billingDay}`,
      sub: "Hàng tháng",
      accent: "from-amber-500 to-orange-600",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: "Còn lại HĐ",
      value: `${remainingDays} ngày`,
      sub: `${progressPct}% đã qua`,
      accent: "from-sky-500 to-blue-600",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div
            className={`absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-10 blur-2xl bg-gradient-to-br ${k.accent}`}
          />
          <div className="relative flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500">
              {k.label}
            </span>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${k.accent} shadow-md`}
            >
              {k.icon}
            </div>
          </div>
          <div className="relative text-2xl font-bold leading-tight text-slate-900">
            {k.value}
          </div>
          <div className="relative text-[13px] text-slate-500 mt-2 font-medium">
            {k.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tenant overview panel (sidebar thông tin) ────────────────────────────────
function TenantOverviewPanel({ contract }: { contract: MyActiveContract }) {
  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const now = new Date();
  const totalDays = Math.max(
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    1
  );
  const passedDays = Math.max(
    Math.min(
      Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      totalDays
    ),
    0
  );
  const remainingDays = Math.max(totalDays - passedDays, 0);
  const progressPct = Math.round((passedDays / totalDays) * 100);

  const statusLabel =
    contract.status === "ACTIVE" ? "Hiệu lực" :
    contract.status === "PENDING" ? "Chờ ký" :
    contract.status === "EXPIRED" ? "Hết hạn" :
    contract.status === "TERMINATED" ? "Đã hủy" : contract.status;

  const statusClass =
    contract.status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : contract.status === "PENDING"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <section>
      {/* Section header */}
      <div className="px-7 pt-7 pb-2 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900 m-0 leading-tight">
            Tổng quan cá nhân
          </h2>
          <p className="text-xs text-slate-500 m-0">
            Trạng thái & tiến độ hợp đồng thuê của bạn.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full border ${statusClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${
            contract.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-current"
          }`} />
          {statusLabel}
        </span>
      </div>

      {/* Body — grid ngang */}
      <div className="px-7 pt-6 pb-7 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cột 1: Ngày bắt đầu */}
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1.5">
            Ngày bắt đầu
          </div>
          <div className="text-[15px] font-semibold text-slate-900">
            {formatDate(contract.startDate)}
          </div>
        </div>

        {/* Cột 2: Ngày kết thúc */}
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1.5">
            Ngày kết thúc
          </div>
          <div className="text-[15px] font-semibold text-slate-900">
            {formatDate(contract.endDate)}
          </div>
        </div>

        {/* Cột 3: Tiến độ */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500">Tiến độ</span>
            <span className="text-xs font-bold text-teal-700">
              {progressPct}%
            </span>
          </div>
          <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-medium">
            <span>{passedDays} ngày đã qua</span>
            <span>Còn {remainingDays} ngày</span>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="px-7 py-5 bg-slate-50/60 border-t border-slate-100 flex items-center gap-3 flex-wrap">
        <a
          href="/contracts"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-[13px] font-semibold hover:bg-teal-700 shadow-sm hover:shadow-md transition"
        >
          Xem chi tiết hợp đồng
        </a>
        <a
          href="/my-invoices"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 hover:border-slate-300 transition"
        >
          Hóa đơn của tôi
        </a>
      </div>
    </section>
  );
}

// ─── Tenant rented room card ──────────────────────────────────────────────────
function TenantRentedCard({ contract }: { contract: MyActiveContract }) {
  return (
    <div>
      {/* Section header */}
      <div className="px-7 pt-7 pb-5 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="flex-1 min-w-[260px]">
          <h2 className="text-lg font-bold text-slate-900 m-0 leading-tight">
            Thông tin phòng · Phòng {contract.room.roomNumber}
          </h2>
          <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-0.5">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{contract.room.address}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Đang thuê
        </span>
      </div>

      <div className="p-8">

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-6">
          <TenantInfoItem
            label="Diện tích"
            value={contract.room.area ? `${contract.room.area} m²` : "—"}
          />
          <TenantInfoItem
            label="Tầng"
            value={contract.room.floor !== null ? `Tầng ${contract.room.floor}` : "—"}
          />
          <TenantInfoItem
            label="Tiền thuê / tháng"
            value={
              <span className="text-teal-700">{VND(contract.rentPrice)}</span>
            }
          />
          <TenantInfoItem
            label="Tiền cọc"
            value={VND(contract.deposit)}
          />
          <TenantInfoItem
            label="Ngày thanh toán"
            value={`Ngày ${contract.billingDay} hàng tháng`}
          />
          <TenantInfoItem label="Mã hợp đồng" value={`#CT-${contract.id}`} />
        </div>

        {/* Description */}
        {contract.room.description && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl px-5 py-4 mb-6 border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 mb-1.5">
              Mô tả phòng
            </div>
            <p className="text-[14px] text-slate-700 m-0 leading-relaxed">
              {contract.room.description}
            </p>
          </div>
        )}

        {contract.terms && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              Điều khoản hợp đồng
            </div>
            <p className="text-[14px] text-slate-700 m-0 leading-relaxed whitespace-pre-line">
              {contract.terms}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TenantInfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 mb-1.5">
        {label}
      </div>
      <div className="text-[15px] font-semibold text-slate-900 leading-tight">{value}</div>
    </div>
  );
}

// ─── Quick actions / tips (lấp đầy khoảng trống) ─────────────────────────────
function TenantTips() {
  const tips = [
    {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      title: "Cập nhật hóa đơn đúng hạn",
      body: "Đảm bảo thanh toán tiền phòng trước ngày quy định để tránh phát sinh phí trễ hạn.",
      accent: "from-emerald-500 to-teal-600",
    },
    {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      title: "Liên hệ chủ trọ dễ dàng",
      body: "Mọi thắc mắc về phòng, dịch vụ hay sửa chữa — gửi tin nhắn trực tiếp trong hệ thống.",
      accent: "from-violet-500 to-purple-600",
    },
    {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      title: "Gia hạn hợp đồng sớm",
      body: "Chủ động liên hệ trước ngày kết thúc 30 ngày để có nhiều lựa chọn gia hạn hơn.",
      accent: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="mt-8">
      <div className="text-xs font-semibold text-teal-600 mb-1.5">
        Gợi ý cho bạn
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-5 tracking-tight">
        Mẹo hữu ích
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tips.map((t) => (
          <div
            key={t.title}
            className="group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 overflow-hidden"
          >
            <div
              className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br ${t.accent} group-hover:opacity-20 transition`}
            />
            <div
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${t.accent} shadow-md mb-4`}
            >
              {t.icon}
            </div>
            <h3 className="relative text-base font-bold text-slate-900 m-0 mb-1.5 leading-snug">
              {t.title}
            </h3>
            <p className="relative text-[13.5px] text-slate-600 m-0 leading-relaxed">
              {t.body}
            </p>
          </div>
        ))}
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
    <div className={tenantStyles.page}>
      <TenantHero
        user={{ fullName: user.fullName ?? "bạn" }}
        contract={state.kind === "rented" ? state.contract : null}
      />
      {state.kind === "rented" ? (
        <>
          <TenantKpis contract={state.contract} />

          {/* Thông tin phòng — section riêng, full-width */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <TenantRentedCard contract={state.contract} />
          </section>

          {/* Tổng quan cá nhân — section riêng, tách hẳn với margin top lớn */}
          <section className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <TenantOverviewPanel contract={state.contract} />
          </section>

          <TenantTips />
        </>
      ) : (
        <TenantBrowse rooms={state.rooms} />
      )}
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
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

  return <LandlordOverview name={user?.fullName ?? "bạn"} stats={stats} />;
}
