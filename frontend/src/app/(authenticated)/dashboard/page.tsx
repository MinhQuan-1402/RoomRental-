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
          className="w-full h-44 object-cover block"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={`w-full h-44 bg-gradient-to-br ${hueBg} flex items-center justify-center`}
        >
          <svg className="w-12 h-12 text-slate-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
      )}
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold text-slate-900 m-0 leading-tight">
            Phòng {room.roomNumber}
          </h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Còn trống
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-[12.5px] text-slate-600">
          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="leading-snug">{room.address}</span>
        </div>
        {room.description && (
          <p className="text-[12px] text-slate-500 m-0 line-clamp-2 leading-relaxed">
            {room.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {room.area && (
            <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {room.area} m²
            </span>
          )}
          {room.floor !== null && (
            <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              Tầng {room.floor}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between mt-auto pt-3.5 border-t border-slate-100">
          <div>
            <div className="text-[10.5px] text-slate-500 uppercase tracking-wider font-semibold">
              Giá thuê
            </div>
            <div className="text-base font-bold text-teal-700 mt-0.5">
              {VND(room.price)}
              <span className="text-xs text-slate-500 ml-0.5 font-medium">/tháng</span>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-[13px] font-semibold rounded-lg px-3.5 py-2 border-none hover:bg-teal-700 shadow-sm hover:shadow-md transition">
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
    <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 shadow-lg">
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-8 w-72 h-72 rounded-full bg-emerald-300/40 blur-3xl" />
      </div>
      <div className="relative px-8 py-7 flex items-center gap-5 flex-wrap">
        <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg">
          {initials}
        </div>
        <div className="text-white flex-1 min-w-[240px]">
          <div className="text-teal-100 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
            Tổng quan cá nhân
          </div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">
            Xin chào, {user.fullName} 👋
          </h1>
          <p className="text-teal-100/90 text-[13.5px] mt-1">
            {contract
              ? "Đây là thông tin phòng và hợp đồng bạn đang thuê."
              : "Khám phá các phòng trống và tìm nơi ở phù hợp với bạn."}
          </p>
        </div>
        {contract ? (
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[12px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              Hợp đồng đang hiệu lực
            </span>
          </div>
        ) : (
          <a
            href="/rooms"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-teal-700 rounded-xl font-semibold text-sm shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            Xem tất cả phòng
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        )}
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br from-teal-500 to-emerald-600" />
        <div className="relative flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Giá thuê
          </span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>
        <div className="relative text-[20px] font-bold leading-tight text-slate-900">
          {VNDCompact(contract.rentPrice)}
        </div>
        <div className="relative text-[11px] text-slate-500 mt-1">/tháng</div>
      </div>

      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br from-violet-500 to-purple-600" />
        <div className="relative flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Tiền cọc
          </span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
        </div>
        <div className="relative text-[20px] font-bold leading-tight text-slate-900">
          {VNDCompact(contract.deposit)}
        </div>
        <div className="relative text-[11px] text-slate-500 mt-1">đã đặt cọc</div>
      </div>

      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br from-amber-500 to-orange-600" />
        <div className="relative flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Ngày thanh toán
          </span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>
        <div className="relative text-[20px] font-bold leading-tight text-slate-900">
          Ngày {contract.billingDay}
        </div>
        <div className="relative text-[11px] text-slate-500 mt-1">hàng tháng</div>
      </div>

      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br from-sky-500 to-blue-600" />
        <div className="relative flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Còn lại
          </span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
        <div className="relative text-[20px] font-bold leading-tight text-slate-900">
          {remainingDays} ngày
        </div>
        <div className="relative text-[11px] text-slate-500 mt-1">
          của tổng {totalDays} ngày
        </div>
      </div>
    </div>
  );
}

// ─── Tenant rented room card ──────────────────────────────────────────────────
function TenantRentedCard({ contract }: { contract: MyActiveContract }) {
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
  const progressPct = Math.round((passedDays / totalDays) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Top accent stripe */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

      <div className="p-6">
        {/* Title row */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 m-0 leading-tight">
                Phòng {contract.room.roomNumber}
              </h2>
              <div className="flex items-start gap-1.5 text-[13px] text-slate-500 mt-1">
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <TenantInfoItem label="Diện tích" value={contract.room.area ? `${contract.room.area} m²` : "—"} />
          <TenantInfoItem label="Tầng" value={contract.room.floor !== null ? `Tầng ${contract.room.floor}` : "—"} />
          <TenantInfoItem label="Trạng thái HĐ" value={
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              contract.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {contract.status === "ACTIVE" ? "● Hiệu lực" : contract.status}
            </span>
          } />
        </div>

        {/* Description */}
        {contract.room.description && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Mô tả phòng
            </div>
            <p className="text-[13px] text-slate-700 m-0 leading-relaxed">
              {contract.room.description}
            </p>
          </div>
        )}

        {/* Contract timeline */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Thời hạn hợp đồng
            </div>
            <div className="text-[12px] font-medium text-slate-700">
              {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
            </div>
          </div>
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
            <span>Đã qua {passedDays} ngày</span>
            <span>{progressPct}%</span>
            <span>Còn {Math.max(totalDays - passedDays, 0)} ngày</span>
          </div>
        </div>

        {contract.terms && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Điều khoản
            </div>
            <p className="text-[13px] text-slate-700 m-0 leading-relaxed whitespace-pre-line">
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
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-[13.5px] font-medium text-slate-900">{value}</div>
    </div>
  );
}

// ─── Browse empty rooms ───────────────────────────────────────────────────────
function TenantBrowse({ rooms }: { rooms: AvailableRoom[] }) {
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900 m-0 mb-1">
            Phòng trống hiện có
          </h2>
          <p className="text-[13px] text-slate-500 m-0">
            Danh sách phòng đang cho thuê — chọn phòng phù hợp để ký hợp đồng.
          </p>
        </div>
        <a
          href="/rooms"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition"
        >
          Xem tất cả
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-14 px-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">
            Hiện chưa có phòng trống
          </h3>
          <p className="text-[13px] text-slate-500 mb-5 max-w-sm">
            Vui lòng quay lại sau — chủ trọ đang cập nhật phòng mới.
          </p>
          <a
            href="/contracts"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-[13px] font-semibold hover:bg-teal-700 transition"
          >
            Xem hợp đồng của tôi
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {rooms.slice(0, 6).map((r) => (
            <TenantRoomCard key={r.id} room={r} />
          ))}
        </div>
      )}
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
    <div className="max-w-[1280px] mx-auto pb-12">
      <TenantHero
        user={{ fullName: user.fullName ?? "bạn" }}
        contract={state.kind === "rented" ? state.contract : null}
      />
      {state.kind === "rented" ? (
        <>
          <TenantKpis contract={state.contract} />
          <TenantRentedCard contract={state.contract} />
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <TenantBrowse rooms={state.rooms} />
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
