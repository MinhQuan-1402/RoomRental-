"use client";

import React from "react";
import { roomImageUrl } from "@/lib/cloudinary";
import type { RoomListItem } from "@/types/room";

// ─── Types mở rộng cho card ────────────────────────────────────────────────────
export interface RoomTag {
  label: string;
}

export interface RoomUtility {
  icon: "zap" | "droplet";
  value: string;
}

export interface RoomTenant {
  name: string;
  phone: string;
  avatarUrl?: string;
  dueLabel: string;
  dueType: "ok" | "warn";
  contractEnd: string;
}

export interface RoomLeaving {
  tenantName: string;
  reason: string;
}

export interface RoomMaintenanceTask {
  label: string;
  done: boolean;
}

export type RoomStatusExt =
  | "AVAILABLE"
  | "OCCUPIED"
  | "LEAVING_SOON"
  | "MAINTENANCE";

export interface RoomCardData extends RoomListItem {
  buildingName?: string;
  tags?: RoomTag[];
  utility?: RoomUtility;
  tenant?: RoomTenant;
  leaving?: RoomLeaving;
  maintenanceTasks?: RoomMaintenanceTask[];
  maintenanceProgress?: number;
  primaryActionLabel?: string;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const VND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  RoomStatusExt,
  { label: string; pill: string; primaryAction: string }
> = {
  AVAILABLE: {
    label: "Còn trống",
    pill: "bg-emerald-500 text-white",
    primaryAction: "Tạo hợp đồng",
  },
  OCCUPIED: {
    label: "Đang thuê",
    pill: "bg-sky-500 text-white",
    primaryAction: "Gửi nhắc phí",
  },
  LEAVING_SOON: {
    label: "Sắp trống",
    pill: "bg-amber-500 text-white",
    primaryAction: "Nghiệm thu",
  },
  MAINTENANCE: {
    label: "Bảo trì",
    pill: "bg-slate-500 text-white",
    primaryAction: "Xem chi tiết",
  },
};

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const IconEye = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconMore = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
);

const IconZap = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconDroplet = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const IconArrowRight = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconBuilding = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M5 21V7l8-4v18" />
    <path d="M19 21V11l-6-4" />
  </svg>
);

const IconCamera = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const IconLogout = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconWarning = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconCheck = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Sub-components theo trạng thái ───────────────────────────────────────────
const AvailableBody: React.FC<{ tags?: RoomTag[]; utility?: RoomUtility }> = ({
  tags,
  utility,
}) => (
  <div className="flex flex-col gap-3 flex-1">
    {tags && tags.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600"
          >
            {t.label}
          </span>
        ))}
      </div>
    )}
    {utility && (
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-100">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-white/70 text-amber-600 shrink-0">
            <IconZap />
          </span>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Số điện
            </span>
            <span className="text-[13px] font-bold text-slate-800">
              {utility.value}
              <span className="text-[10px] font-medium text-slate-500 ml-0.5">kWh</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-sky-50 border border-sky-100">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-white/70 text-sky-600 shrink-0">
            <IconDroplet />
          </span>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Số nước
            </span>
            <span className="text-[13px] font-bold text-slate-800">
              {utility.value}
              <span className="text-[10px] font-medium text-slate-500 ml-0.5">m³</span>
            </span>
          </div>
        </div>
      </div>
    )}
  </div>
);

const OccupiedBody: React.FC<{ tenant?: RoomTenant }> = ({ tenant }) => {
  if (!tenant) return null;
  const initials = tenant.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex items-center gap-3">
        {tenant.avatarUrl ? (
          <img
            src={tenant.avatarUrl}
            alt={tenant.name}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-300 to-teal-700 text-white text-[13px] font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}
        <div className="flex flex-col leading-tight min-w-0 flex-1">
          <span className="text-[13px] font-semibold text-slate-800 truncate">
            {tenant.name}
          </span>
          <span className="text-[11px] text-slate-500">{tenant.phone}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto">
        <span
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${
            tenant.dueType === "ok"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {tenant.dueLabel}
        </span>
        <span className="text-[11px] text-slate-500">
          HĐ đến <strong className="font-semibold text-slate-700">{tenant.contractEnd}</strong>
        </span>
      </div>
    </div>
  );
};

const LeavingBody: React.FC<{ leaving?: RoomLeaving }> = ({ leaving }) => {
  if (!leaving) return null;
  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
          <IconLogout />
        </div>
        <div className="flex flex-col leading-tight min-w-0 flex-1">
          <span className="text-[11px] text-slate-500">Khách sắp trả</span>
          <span className="text-[13px] font-semibold text-slate-800 truncate">
            {leaving.tenantName}
          </span>
        </div>
      </div>
      <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 mt-auto">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 mt-0.5 shrink-0">
            <IconWarning />
          </span>
          <span className="text-[12px] text-amber-800 leading-snug">
            {leaving.reason}
          </span>
        </div>
      </div>
    </div>
  );
};

const MaintenanceBody: React.FC<{
  tasks?: RoomMaintenanceTask[];
  progress?: number;
}> = ({ tasks = [], progress = 0 }) => (
  <div className="flex flex-col gap-3 flex-1">
    <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
      {tasks.slice(0, 3).map((t, i) => (
        <li key={i} className="flex items-center gap-2 text-[12px]">
          <span
            className={`flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0 ${
              t.done
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-slate-300 bg-white"
            }`}
          >
            {t.done && <IconCheck />}
          </span>
          <span
            className={`leading-tight ${
              t.done ? "line-through text-slate-400" : "text-slate-700"
            }`}
          >
            {t.label}
          </span>
        </li>
      ))}
    </ul>
    <div className="mt-auto">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
          Tiến độ
        </span>
        <span className="text-[11px] font-bold text-slate-700">
          {progress}%
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export interface RoomCardProps {
  room: RoomCardData;
  onPrimary?: (room: RoomCardData) => void;
  onView?: (room: RoomCardData) => void;
  onMore?: (room: RoomCardData) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onPrimary,
  onView,
  onMore,
}) => {
  const status = (room.status as RoomStatusExt) ?? "AVAILABLE";
  const statusCfg = STATUS_CONFIG[status];
  const coverImage = room.images?.[0]?.url;

  return (
    <article className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* ─── Cover Image Header ─────────────────────────────────────────── */}
      <header className="relative h-[180px] bg-slate-200 overflow-hidden">
        {coverImage ? (
          <img
            src={roomImageUrl(coverImage, "thumbnail")}
            alt={`Phòng ${room.roomNumber}`}
            className="w-full h-full object-cover block"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
            <IconCamera />
          </div>
        )}

        {/* Overlay gradient đáy */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Badge tên tòa nhà */}
        {room.buildingName && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-md text-[11px] font-semibold text-slate-700 shadow-sm">
            <IconBuilding />
            <span>{room.buildingName}</span>
          </div>
        )}

        {/* Badge trạng thái */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-sm ${statusCfg.pill}`}>
          {statusCfg.label}
        </div>

        {/* Tên phòng + giá tiền (đáy) */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold leading-tight truncate m-0">
              Phòng {room.roomNumber}
            </h3>
            <p className="text-[11px] text-white/85 mt-0.5 truncate m-0">
              {room.area ? `${room.area} m²` : "—"}
              {room.address ? ` · ${room.address}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[15px] font-bold leading-tight">
              {VND(room.price)}
            </div>
            <div className="text-[10px] text-white/80">/tháng</div>
          </div>
        </div>
      </header>

      {/* ─── Card Body ──────────────────────────────────────────────────── */}
      <div className="p-4 flex-1">
        {status === "AVAILABLE" && (
          <AvailableBody tags={room.tags} utility={room.utility} />
        )}
        {status === "OCCUPIED" && <OccupiedBody tenant={room.tenant} />}
        {status === "LEAVING_SOON" && <LeavingBody leaving={room.leaving} />}
        {status === "MAINTENANCE" && (
          <MaintenanceBody
            tasks={room.maintenanceTasks}
            progress={room.maintenanceProgress}
          />
        )}
      </div>

      {/* ─── Action Footer ──────────────────────────────────────────────── */}
      <footer className="px-3 pb-3 pt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPrimary?.(room)}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-white text-[13px] font-semibold transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: "#0F766E" }}
        >
          <span>{room.primaryActionLabel ?? statusCfg.primaryAction}</span>
          <IconArrowRight />
        </button>

        <button
          type="button"
          onClick={() => onView?.(room)}
          aria-label="Xem chi tiết"
          className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center transition-colors hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
        >
          <IconEye />
        </button>

        <button
          type="button"
          onClick={() => onMore?.(room)}
          aria-label="Thêm"
          className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center transition-colors hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
        >
          <IconMore />
        </button>
      </footer>
    </article>
  );
};

export default RoomCard;
