"use client";

import React from "react";
import { RoomCard, type RoomCardData, type RoomStatusExt } from "./RoomCard";

// ─── Mock data (sau này sẽ thay bằng API thật) ─────────────────────────────────
export const MOCK_ROOMS: RoomCardData[] = [
  {
    id: 1,
    roomNumber: "101",
    floor: 1,
    price: 5000000,
    area: 28,
    status: "AVAILABLE" as RoomStatusExt,
    description: null,
    address: "Tầng 1 · View đường",
    images: [{ url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600&q=80" }],
    buildingName: "Oakridge Heights",
    tags: [
      { label: "Tầng 1" },
      { label: "28 m²" },
      { label: "View đường" },
      { label: "Full nội thất" },
    ],
    utility: { icon: "zap", value: "245" },
    primaryActionLabel: "Tạo hợp đồng",
  },
  {
    id: 2,
    roomNumber: "102",
    floor: 1,
    price: 6500000,
    area: 35,
    status: "OCCUPIED" as RoomStatusExt,
    description: null,
    address: "Tầng 1 · Ban công",
    images: [{ url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80" }],
    buildingName: "Oakridge Heights",
    tenant: {
      name: "Nguyễn Văn A",
      phone: "0905 123 456",
      dueLabel: "Còn 4 ngày",
      dueType: "warn",
      contractEnd: "31/12/2026",
    },
    primaryActionLabel: "Gửi nhắc phí",
  },
  {
    id: 3,
    roomNumber: "203",
    floor: 2,
    price: 5800000,
    area: 30,
    status: "OCCUPIED" as RoomStatusExt,
    description: null,
    address: "Tầng 2 · Cửa sổ lớn",
    images: [{ url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80" }],
    buildingName: "Oakridge Heights",
    tenant: {
      name: "Trần Thị B",
      phone: "0909 888 777",
      dueLabel: "Đã thu T10",
      dueType: "ok",
      contractEnd: "15/03/2027",
    },
    primaryActionLabel: "Gửi nhắc phí",
  },
  {
    id: 4,
    roomNumber: "305",
    floor: 3,
    price: 7200000,
    area: 42,
    status: "LEAVING_SOON" as RoomStatusExt,
    description: null,
    address: "Tầng 3 · View hồ",
    images: [{ url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80" }],
    buildingName: "Oakridge Heights",
    leaving: {
      tenantName: "Lê Văn Cường",
      reason: "Chuyển công tác vào TP.HCM, cần trả phòng trước 15/11",
    },
    primaryActionLabel: "Nghiệm thu",
  },
  {
    id: 5,
    roomNumber: "204",
    floor: 2,
    price: 5500000,
    area: 28,
    status: "MAINTENANCE" as RoomStatusExt,
    description: null,
    address: "Tầng 2 · Hướng Đông",
    images: [{ url: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&q=80" }],
    buildingName: "Oakridge Heights",
    maintenanceTasks: [
      { label: "Thay bóng đèn phòng ngủ", done: true },
      { label: "Sơn lại tường phòng khách", done: false },
      { label: "Vệ sinh điều hòa", done: false },
    ],
    maintenanceProgress: 33,
    primaryActionLabel: "Xem chi tiết",
  },
  {
    id: 6,
    roomNumber: "306",
    floor: 3,
    price: 6200000,
    area: 33,
    status: "AVAILABLE" as RoomStatusExt,
    description: null,
    address: "Tầng 3 · Ban công",
    images: [],
    buildingName: "Oakridge Heights",
    tags: [
      { label: "Tầng 3" },
      { label: "33 m²" },
      { label: "Ban công" },
      { label: "Nội thất cơ bản" },
    ],
    utility: { icon: "zap", value: "—" },
    primaryActionLabel: "Tạo hợp đồng",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────
export interface RoomsGridProps {
  rooms?: RoomCardData[];
  onPrimary?: (room: RoomCardData) => void;
  onView?: (room: RoomCardData) => void;
  onMore?: (room: RoomCardData) => void;
  loading?: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse">
    <div className="h-[180px] bg-slate-200" />
    <div className="p-4 flex flex-col gap-2.5">
      <div className="h-2.5 bg-slate-200 rounded w-1/2" />
      <div className="h-2.5 bg-slate-200 rounded w-3/4" />
      <div className="h-2.5 bg-slate-200 rounded w-2/5" />
    </div>
    <div className="px-3 pb-3">
      <div className="h-9 bg-slate-200 rounded-lg" />
    </div>
  </div>
);

// ─── Main grid ────────────────────────────────────────────────────────────────
export const RoomsGrid: React.FC<RoomsGridProps> = ({
  rooms = MOCK_ROOMS,
  onPrimary,
  onView,
  onMore,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 flex flex-col items-center justify-center gap-2">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        </div>
        <p className="text-[14px] font-semibold text-slate-700 m-0">
          Chưa có phòng nào
        </p>
        <p className="text-[12px] text-slate-500 m-0">
          Thêm phòng mới để bắt đầu quản lý
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          onPrimary={onPrimary}
          onView={onView}
          onMore={onMore}
        />
      ))}
    </div>
  );
};

export default RoomsGrid;
