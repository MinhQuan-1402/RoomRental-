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

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

// ─── Tenant-side: room card (browse empty rooms) ──────────────────────────────
function TenantRoomCard({ room }: { room: AvailableRoom }) {
  const img = room.images?.[0]?.url;
  const placeholderHue = (() => {
    // Hash đơn giản từ số phòng → tạo background pastel ổn định
    let h = 0;
    for (let i = 0; i < room.roomNumber.length; i++) {
      h = (h * 31 + room.roomNumber.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % 6;
  })();
  const hueBg = [
    "from-teal-100 to-emerald-50",
    "from-sky-100 to-blue-50",
    "from-violet-100 to-purple-50",
    "from-amber-100 to-orange-50",
    "from-rose-100 to-pink-50",
    "from-lime-100 to-green-50",
  ][placeholderHue];

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 flex flex-col">
      {img ? (
        <img
          src={img}
          alt={`Phòng ${room.roomNumber}`}
          className="w-full h-52 object-cover block"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={`w-full h-52 bg-gradient-to-br ${hueBg} flex items-center justify-center`}
        >
          <svg className="w-14 h-14 text-slate-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
      )}
      <div className="p-7 flex flex-col gap-3.5 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 m-0 leading-tight">
            Phòng {room.roomNumber}
          </h3>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Còn trống
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-[13px] text-slate-600">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="leading-snug">{room.address}</span>
        </div>
        {room.description && (
          <p className="text-[13px] text-slate-500 m-0 line-clamp-2 leading-relaxed">
            {room.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {room.area && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
              {room.area} m²
            </span>
          )}
          {room.floor !== null && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
              Tầng {room.floor}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">
              Giá thuê
            </div>
            <div className="text-xl font-bold text-teal-700 mt-1 leading-tight">
              {VND(room.price)}
              <span className="text-[12px] text-slate-500 ml-1 font-medium">/tháng</span>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-[13px] font-semibold rounded-xl px-4 py-2.5 border-none hover:bg-teal-700 shadow-sm hover:shadow-md transition shrink-0">
            Xem chi tiết
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tenant hero header ───────────────────────────────────────────────────────
function TenantHero({
  user,
  contract,
}: {
  user: { fullName: string };
  contract: MyActiveContract | null;
}) {
  const initials = (() => {
    const parts = (user.fullName ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  })();

  return (
    <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 shadow-xl">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-8 w-96 h-96 rounded-full bg-emerald-300/40 blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-40 h-40 rounded-full bg-teal-300/20 blur-2xl" />
      </div>

      <div className="relative px-10 py-10 flex items-center gap-8 flex-wrap">
        <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-2xl">
          {initials}
        </div>
        <div className="text-white flex-1 min-w-[280px]">
          <div className="text-teal-100 text-[11px] font-semibold uppercase tracking-[0.12em] mb-2">
            Tổng quan cá nhân
          </div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            Xin chào, {user.fullName} 👋
          </h1>
          <p className="text-teal-100/90 text-[14px] mt-2 max-w-xl leading-relaxed">
            {contract
              ? "Đây là thông tin phòng và hợp đồng bạn đang thuê. Cập nhật mọi thứ ngay tại đây."
              : "Khám phá các phòng trống và tìm nơi ở phù hợp với bạn trong vài cú nhấp."}
          </p>
          {contract ? (
            <div className="flex gap-2 flex-wrap mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[12px] font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                Hợp đồng đang hiệu lực
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-teal-50 text-[12px] font-medium">
                Phòng {contract.room.roomNumber}
              </span>
            </div>
          ) : (
            <a
              href="/rooms"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white text-teal-700 rounded-2xl font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 mt-4"
            >
              Xem tất cả phòng
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

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
      sub: "Đã ký quỹ",
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
    <aside className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-fit">
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
      <div className="px-6 pt-6 pb-5">
        <div className="text-xs font-medium text-slate-500 mb-3">
          Trạng thái hợp đồng
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full border ${statusClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${
            contract.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-current"
          }`} />
          {statusLabel}
        </span>

        <div className="mt-6 space-y-4">
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1.5">
              Ngày bắt đầu
            </div>
            <div className="text-[15px] font-semibold text-slate-900">
              {formatDate(contract.startDate)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1.5">
              Ngày kết thúc
            </div>
            <div className="text-[15px] font-semibold text-slate-900">
              {formatDate(contract.endDate)}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-slate-700">
              Tiến độ
            </span>
            <span className="text-[13px] font-bold text-teal-700">
              {progressPct}%
            </span>
          </div>
          <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[12px] text-slate-500 font-medium">
            <span>{passedDays} ngày đã qua</span>
            <span>Còn {remainingDays} ngày</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href="/contracts"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-teal-600 text-white rounded-xl text-[13px] font-semibold hover:bg-teal-700 shadow-sm hover:shadow-md transition"
          >
            Chi tiết
          </a>
          <a
            href="/invoices"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 hover:border-slate-300 transition"
          >
            Hóa đơn
          </a>
        </div>
      </div>
    </aside>
  );
}

// ─── Tenant rented room card ──────────────────────────────────────────────────
function TenantRentedCard({ contract }: { contract: MyActiveContract }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-fit">
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

      <div className="p-8">
        {/* Title row */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 m-0 leading-tight">
                Phòng {contract.room.roomNumber}
              </h2>
              <div className="flex items-start gap-1.5 text-[13px] text-slate-500 mt-1.5">
                <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{contract.room.address}</span>
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Đang thuê
          </span>
        </div>

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

// ─── Browse empty rooms ───────────────────────────────────────────────────────
function TenantBrowse({ rooms }: { rooms: AvailableRoom[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
      <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold text-teal-600 mb-2">
            Khám phá
          </div>
          <h2 className="text-2xl font-bold text-slate-900 m-0 mb-1.5 tracking-tight">
            Phòng trống hiện có
          </h2>
          <p className="text-sm text-slate-500 m-0 max-w-xl leading-relaxed">
            Danh sách phòng đang cho thuê — chọn phòng phù hợp để ký hợp đồng.
          </p>
        </div>
        <a
          href="/rooms"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3.5 py-2 rounded-xl transition"
        >
          Xem tất cả
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/30 border-2 border-dashed border-slate-200 rounded-2xl py-16 px-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1.5">
            Hiện chưa có phòng trống
          </h3>
          <p className="text-[13px] text-slate-500 mb-6 max-w-sm">
            Vui lòng quay lại sau — chủ trọ đang cập nhật phòng mới.
          </p>
          <a
            href="/contracts"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-[13px] font-semibold hover:bg-teal-700 shadow-sm hover:shadow-md transition"
          >
            Xem hợp đồng của tôi
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {rooms.slice(0, 6).map((r) => (
            <TenantRoomCard key={r.id} room={r} />
          ))}
        </div>
      )}
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
    <div className="max-w-[1280px] mx-auto pb-12 space-y-8">
      <TenantHero
        user={{ fullName: user.fullName ?? "bạn" }}
        contract={state.kind === "rented" ? state.contract : null}
      />
      {state.kind === "rented" ? (
        <>
          <TenantKpis contract={state.contract} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TenantRentedCard contract={state.contract} />
            </div>
            <TenantOverviewPanel contract={state.contract} />
          </div>
          <TenantTips />
        </>
      ) : (
        <TenantBrowse rooms={state.rooms} />
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
