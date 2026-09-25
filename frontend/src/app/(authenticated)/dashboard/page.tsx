"use client";

import { useEffect, useState } from "react";
import { useAuth, getAccessToken } from "@/lib/auth-context";
import { roomImageUrl } from "@/lib/cloudinary";

// ─── Types (mirror backend response) ───────────────────────────────────────────
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

async function apiFetch<T>(path: string): Promise<T | null> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as T;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const VND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ─── Icons ─────────────────────────────────────────────────────────────────────
function IconRoom() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconKey() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconArea() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 3H3v18h18V3z" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}
function IconLocation() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function RoomCard({ room }: { room: AvailableRoom }) {
  return (
    <div style={styles.roomCard}>
      {room.images.length > 0 && (
        <img
          src={roomImageUrl(room.images[0].url, "card")}
          alt={`Phòng ${room.roomNumber}`}
          style={styles.roomCardImage}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div style={styles.roomCardBody}>
        <div style={styles.roomHeader}>
          <div style={styles.roomBadge}>
            <IconRoom />
          </div>
          <span style={styles.availableTag}>Còn trống</span>
        </div>

        <h3 style={styles.roomTitle}>Phòng {room.roomNumber}</h3>

        <div style={styles.roomMeta}>
          <span style={styles.metaItem}>
            <IconLocation />
            <span>{room.address}</span>
          </span>
          {room.floor !== null && (
            <span style={styles.metaItem}>
              <IconCalendar />
              <span>Tầng {room.floor}</span>
            </span>
          )}
          {room.area !== null && (
            <span style={styles.metaItem}>
              <IconArea />
              <span>{room.area} m²</span>
            </span>
          )}
        </div>

        {room.description && (
          <p style={styles.roomDesc}>{room.description}</p>
        )}

        <div style={styles.roomFooter}>
          <div>
            <div style={styles.priceLabel}>Giá thuê</div>
            <div style={styles.priceValue}>{VND(room.price)}<span style={styles.priceUnit}>/tháng</span></div>
          </div>
          <button
            style={styles.detailBtn}
            onClick={() => alert(`Xem chi tiết phòng ${room.roomNumber} — coming soon`)}
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}

function CurrentRoomCard({ contract }: { contract: MyActiveContract }) {
  return (
    <div style={styles.currentRoomCard}>
      <div style={styles.currentRoomHeader}>
        <div>
          <span style={styles.activeTag}>
            <IconKey />
            <span>Đang thuê</span>
          </span>
          <h2 style={styles.currentRoomTitle}>Phòng {contract.room.roomNumber}</h2>
          <p style={styles.currentRoomSub}>{contract.room.address}</p>
        </div>
        <div style={styles.statusPill}>{contract.status}</div>
      </div>

      <div style={styles.currentRoomBody}>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Địa chỉ</span>
            <span style={styles.infoValue}>{contract.room.address}</span>
          </div>
          {contract.room.floor !== null && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Tầng</span>
              <span style={styles.infoValue}>{contract.room.floor}</span>
            </div>
          )}
          {contract.room.area !== null && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Diện tích</span>
              <span style={styles.infoValue}>{contract.room.area} m²</span>
            </div>
          )}
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Giá thuê</span>
            <span style={{ ...styles.infoValue, color: "var(--brand-primary)" }}>
              {VND(contract.rentPrice)}/tháng
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Ngày bắt đầu</span>
            <span style={styles.infoValue}>{fmtDate(contract.startDate)}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Ngày kết thúc</span>
            <span style={styles.infoValue}>{fmtDate(contract.endDate)}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Tiền cọc</span>
            <span style={styles.infoValue}>{VND(contract.deposit)}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Ngày thanh toán</span>
            <span style={styles.infoValue}>Ngày {contract.billingDay} hàng tháng</span>
          </div>
        </div>

        {contract.room.description && (
          <div style={styles.descBlock}>
            <span style={styles.infoLabel}>Mô tả phòng</span>
            <p style={styles.descText}>{contract.room.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyBrowseState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>
        <IconRoom />
      </div>
      <h3 style={styles.emptyTitle}>Hiện chưa có phòng trống</h3>
      <p style={styles.emptyText}>
        Vui lòng quay lại sau khi chủ trọ đăng tải thêm phòng.
      </p>
      <button style={styles.retryBtn} onClick={onRefresh}>
        Thử tải lại
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type TenantState =
  | { kind: "loading" }
  | { kind: "browse"; rooms: AvailableRoom[] }
  | { kind: "rented"; contract: MyActiveContract }
  | { kind: "error"; message: string };

export default function DashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState<TenantState>({ kind: "loading" });

  async function loadTenantData() {
    setState({ kind: "loading" });
    try {
      // 1. Check if tenant already has an ACTIVE contract
      const contract = await apiFetch<MyActiveContract>("/contracts/my-active");

      if (contract && contract.status === "ACTIVE") {
        setState({ kind: "rented", contract });
        return;
      }

      // 2. No active contract → load available rooms to browse
      const rooms = await apiFetch<AvailableRoom[]>("/rooms/available");
      setState({ kind: "browse", rooms: rooms ?? [] });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    }
  }

  useEffect(() => {
    if (user?.role === "TENANT") {
      loadTenantData();
    }
  }, [user?.role]);

  // LANDLORD (and ADMIN) keep the existing dashboard
  if (user?.role !== "TENANT") {
    return <LandlordDashboard />;
  }

  if (state.kind === "loading") {
    return (
      <div style={styles.root}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Tổng quan</h1>
          <p style={styles.subtitle}>
            Xin chào, <strong>{user.fullName}</strong>!
          </p>
        </div>
        <div style={styles.loadingState}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div style={styles.root}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Tổng quan</h1>
        </div>
        <div style={styles.errorState}>
          <p style={styles.errorText}>⚠️ Không thể tải dữ liệu: {state.message}</p>
          <button style={styles.retryBtn} onClick={loadTenantData}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ── Tenant states ─────────────────────────────────────────────────────────────
  if (state.kind === "rented") {
    return (
      <div style={styles.root}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Tổng quan</h1>
          <p style={styles.subtitle}>
            Xin chào, <strong>{user.fullName}</strong>! Đây là thông tin phòng bạn đang thuê.
          </p>
        </div>
        <CurrentRoomCard contract={state.contract} />
      </div>
    );
  }

  // state.kind === "browse"
  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Tổng quan</h1>
        <p style={styles.subtitle}>
          Xin chào, <strong>{user.fullName}</strong>! Khám phá các phòng đang cho thuê.
        </p>
      </div>

      <div style={styles.browseBanner}>
        <div style={styles.bannerIcon}>
          <IconKey />
        </div>
        <div>
          <h3 style={styles.bannerTitle}>Bạn chưa thuê phòng</h3>
          <p style={styles.bannerText}>
            Dưới đây là {state.rooms.length} phòng đang trống. Bạn có thể tham khảo và liên hệ chủ trọ.
          </p>
        </div>
      </div>

      {state.rooms.length === 0 ? (
        <EmptyBrowseState onRefresh={loadTenantData} />
      ) : (
        <div style={styles.roomGrid}>
          {state.rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Landlord dashboard (placeholder, unchanged from original) ─────────────────
function LandlordDashboard() {
  const { user } = useAuth();

  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Tổng quan</h1>
          <p style={styles.subtitle}>
            Xin chào, <strong>{user?.fullName}</strong>! Chào mừng bạn quay lại.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Same landlord placeholder cards as before */}
        <LandlordPlaceholderCard color="teal" title="Khu trọ" desc="Quản lý danh sách khu trọ của bạn" />
        <LandlordPlaceholderCard color="blue" title="Phòng trọ" desc="Xem và quản lý các phòng đang cho thuê" />
        <LandlordPlaceholderCard color="purple" title="Người thuê" desc="Hồ sơ và thông tin người thuê" />
        <LandlordPlaceholderCard color="orange" title="Hợp đồng" desc="Quản lý hợp đồng thuê phòng" />
        <LandlordPlaceholderCard color="amber" title="Hóa đơn" desc="Theo dõi và xuất hóa đơn hàng tháng" />
        <LandlordPlaceholderCard color="green" title="Thanh toán" desc="Quản lý các khoản thanh toán" />
      </div>
    </div>
  );
}

function LandlordPlaceholderCard({
  color,
  title,
  desc,
}: {
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardIcon, ...iconColors[color] }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </div>
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.cardDesc}>{desc}</p>
      <span style={styles.cardBadge}>Sắp ra mắt</span>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const iconColors: Record<string, React.CSSProperties> = {
  teal: { backgroundColor: "#F0FDFA", color: "#0F766E" },
  blue: { backgroundColor: "#EFF6FF", color: "#2563EB" },
  purple: { backgroundColor: "#FAF5FF", color: "#7C3AED" },
  orange: { backgroundColor: "#FFF7ED", color: "#EA580C" },
  amber: { backgroundColor: "#FFFBEB", color: "#D97706" },
  green: { backgroundColor: "#F0FDF4", color: "#16A34A" },
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    maxWidth: 1100,
  },
  pageHeader: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text-heading)",
    margin: 0,
    marginBottom: 4,
    letterSpacing: "-0.3px",
  },
  subtitle: {
    fontSize: 14,
    color: "var(--text-label)",
    margin: 0,
  },

  // ── Loading / error ────────────────────────────────────────────────────────────
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "48px 0",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid var(--brand-primary-soft)",
    borderTopColor: "var(--brand-primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    color: "var(--text-label)",
  },
  errorState: {
    backgroundColor: "var(--status-danger-soft)",
    border: "1px solid var(--status-danger-border)",
    borderRadius: 12,
    padding: 24,
    textAlign: "center",
  },
  errorText: {
    color: "var(--status-danger)",
    margin: "0 0 16px",
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: "var(--brand-primary)",
    color: "var(--text-inverse)",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  // ── Browse banner ──────────────────────────────────────────────────────────────
  browseBanner: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "var(--brand-primary-softer)",
    border: "1px solid var(--brand-primary-soft)",
    borderRadius: 12,
    marginBottom: 24,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "var(--brand-primary-soft)",
    color: "var(--brand-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-heading)",
    margin: "0 0 4px",
  },
  bannerText: {
    fontSize: 14,
    color: "var(--text-body)",
    margin: 0,
  },

  // ── Room grid ──────────────────────────────────────────────────────────────────
  roomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },
  roomCard: {
    backgroundColor: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: 14,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  roomCardImage: {
    width: "100%", height: 160, objectFit: "cover",
    display: "block",
  },
  roomCardBody: {
    padding: 20, display: "flex", flexDirection: "column", gap: 8, flex: 1,
  },
  roomHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  roomBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "var(--brand-primary-softer)",
    color: "var(--brand-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  availableTag: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--status-success)",
    backgroundColor: "var(--status-success-soft)",
    padding: "3px 10px",
    borderRadius: 999,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-heading)",
    margin: 0,
  },
  propertyName: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--brand-primary)",
    margin: 0,
  },
  roomMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 4,
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-label)",
  },
  roomDesc: {
    fontSize: 13,
    color: "var(--text-body)",
    lineHeight: 1.5,
    margin: "4px 0 0",
  },
  roomFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid var(--border-subtle)",
  },
  priceLabel: {
    fontSize: 11,
    color: "var(--text-label)",
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: 700,
    color: "var(--brand-primary)",
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text-label)",
    marginLeft: 2,
  },
  detailBtn: {
    backgroundColor: "var(--brand-primary)",
    color: "var(--text-inverse)",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.15s",
  },

  // ── Current room card ──────────────────────────────────────────────────────────
  currentRoomCard: {
    backgroundColor: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: 14,
    overflow: "hidden",
  },
  currentRoomHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border-default)",
    backgroundColor: "var(--brand-primary-softer)",
  },
  activeTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--status-success)",
    backgroundColor: "var(--status-success-soft)",
    padding: "3px 10px",
    borderRadius: 999,
    marginBottom: 8,
  },
  currentRoomTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "var(--text-heading)",
    margin: 0,
    marginBottom: 2,
  },
  currentRoomSub: {
    fontSize: 14,
    color: "var(--brand-primary)",
    margin: 0,
    fontWeight: 500,
  },
  statusPill: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-inverse)",
    backgroundColor: "var(--status-success)",
    padding: "4px 12px",
    borderRadius: 999,
    letterSpacing: "0.5px",
  },
  currentRoomBody: {
    padding: 24,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: "var(--text-label)",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  infoValue: {
    fontSize: 14,
    color: "var(--text-heading)",
    fontWeight: 600,
  },
  descBlock: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: "1px solid var(--border-subtle)",
  },
  descText: {
    fontSize: 14,
    color: "var(--text-body)",
    lineHeight: 1.6,
    margin: "8px 0 0",
  },

  // ── Empty state ────────────────────────────────────────────────────────────────
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    backgroundColor: "var(--surface-card)",
    border: "1px dashed var(--border-default)",
    borderRadius: 14,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    margin: "0 auto 16px",
    borderRadius: 14,
    backgroundColor: "var(--surface-card-muted)",
    color: "var(--text-label)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "var(--text-heading)",
    margin: "0 0 6px",
  },
  emptyText: {
    fontSize: 14,
    color: "var(--text-label)",
    margin: "0 0 20px",
  },

  // ── Landlord placeholder cards ─────────────────────────────────────────────────
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    backgroundColor: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: 14,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    cursor: "default",
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-heading)",
    margin: 0,
  },
  cardDesc: {
    fontSize: 13,
    color: "var(--text-label)",
    margin: 0,
    lineHeight: 1.5,
    flex: 1,
  },
  cardBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--brand-primary)",
    backgroundColor: "var(--brand-primary-soft)",
    padding: "3px 10px",
    borderRadius: 999,
    width: "fit-content",
    marginTop: 4,
  },
};
