"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { roomImageUrl, ROOM_IMAGE_PRESETS } from "@/lib/cloudinary";
import {
  RoomListItem,
  RoomDetail,
  CreateRoomPayload,
  UpdateRoomPayload,
  RoomStatus,
} from "@/types/room";
import { RoomsGrid, type RoomCardData } from "@/components/rooms/RoomsGrid";

const VND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL: Record<RoomStatus, string> = {
  AVAILABLE: "Còn trống",
  OCCUPIED: "Đang thuê",
  MAINTENANCE: "Bảo trì",
};
const STATUS_STYLE: Record<RoomStatus, React.CSSProperties> = {
  AVAILABLE: { backgroundColor: "var(--status-success-soft)", color: "var(--status-success)" },
  OCCUPIED: { backgroundColor: "var(--status-info-soft)", color: "var(--status-info)" },
  MAINTENANCE: { backgroundColor: "var(--status-warning-soft)", color: "var(--status-warning)" },
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Modal state
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RoomDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RoomListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /**
   * Map RoomListItem (từ API) sang RoomCardData (cho card grid).
   * Trong tương lai API sẽ trả về sẵn các trường mở rộng (tags, tenant, ...).
   * Hiện tại ta bổ sung dữ liệu mở rộng dựa trên status để demo UI đẹp.
   */
  function enrichRoomForCard(r: RoomListItem): RoomCardData {
    const base: RoomCardData = {
      ...r,
      buildingName: "Oakridge Heights",
    };

    if (r.status === "AVAILABLE") {
      base.tags = [
        { label: r.floor !== null ? `Tầng ${r.floor}` : "—" },
        { label: r.area ? `${r.area} m²` : "—" },
        { label: "Nội thất cơ bản" },
      ];
      base.utility = { icon: "zap", value: "—" };
      base.primaryActionLabel = "Tạo hợp đồng";
    } else if (r.status === "OCCUPIED") {
      base.tenant = {
        name: "Khách thuê",
        phone: "—",
        dueLabel: "—",
        dueType: "warn",
        contractEnd: "—",
      };
      base.primaryActionLabel = "Gửi nhắc phí";
    } else if (r.status === "MAINTENANCE") {
      base.maintenanceTasks = [
        { label: "Bảo trì đang thực hiện", done: false },
      ];
      base.maintenanceProgress = 0;
      base.primaryActionLabel = "Xem chi tiết";
    }
    return base;
  }

  async function loadRooms() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set("status", filterStatus);
      const data = await apiRequest<RoomListItem[]>(`/rooms?${qs.toString()}`);
      setRooms(data);
    } catch (err) {
      const e = err as ApiError;
      setError(e.message ?? "Không thể tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoomDetail(id: number): Promise<RoomDetail | null> {
    try {
      return await apiRequest<RoomDetail>(`/rooms/${id}`);
    } catch (err) {
      const e = err as ApiError;
      alert(`❌ ${e.message}`);
      return null;
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/rooms/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      await loadRooms();
    } catch (err) {
      const e = err as ApiError;
      alert(`❌ ${e.message}`);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const hasFilters = !!filterStatus;

  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Phòng trọ</h1>
          <p style={styles.subtitle}>Xem và quản lý các phòng cho thuê</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => setCreating(true)}>
          <IconPlus />
          Thêm phòng
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button style={styles.retryBtn} onClick={loadRooms}>Thử lại</button>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterBar}>
        <select
          style={styles.select}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="AVAILABLE">Còn trống</option>
          <option value="OCCUPIED">Đang thuê</option>
          <option value="MAINTENANCE">Bảo trì</option>
        </select>

        {hasFilters && (
          <button
            style={styles.clearBtn}
            onClick={() => setFilterStatus("")}
          >
            Xóa bộ lọc
          </button>
        )}

        <span style={styles.countText}>
          {loading ? "Đang tải..." : `${rooms.length} phòng`}
        </span>
      </div>

      <div style={styles.card}>
        {loading ? (
          <LoadingState />
        ) : rooms.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} hasFilters={hasFilters} />
        ) : (
          <RoomsGrid
            rooms={rooms.map(enrichRoomForCard)}
            onPrimary={async (r) => {
              if (r.status === "AVAILABLE") {
                alert(`Tạo hợp đồng cho phòng ${r.roomNumber}`);
              } else if (r.status === "OCCUPIED") {
                alert(`Gửi nhắc phí cho phòng ${r.roomNumber}`);
              } else {
                const detail = await loadRoomDetail(r.id);
                if (detail) setEditing(detail);
              }
            }}
            onView={async (r) => {
              const detail = await loadRoomDetail(r.id);
              if (detail) setEditing(detail);
            }}
            onMore={(r) => setConfirmDelete(r)}
          />
        )}
      </div>

      {creating && (
        <RoomFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            loadRooms();
          }}
        />
      )}

      {editing && (
        <RoomFormModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadRooms();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Xóa phòng?"
          message={`Bạn có chắc muốn xóa phòng "${confirmDelete.roomNumber}"? Hành động này không thể hoàn tác.`}
          confirmLabel={deleting ? "Đang xóa..." : "Xóa"}
          confirmDisabled={deleting}
          onConfirm={handleDelete}
          onClose={() => !deleting && setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ─── Room form modal ───────────────────────────────────────────────────────────
function RoomFormModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: RoomDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roomNumber, setRoomNumber] = useState(initial?.roomNumber ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [floor, setFloor] = useState<string>(initial?.floor?.toString() ?? "");
  const [area, setArea] = useState<string>(initial?.area?.toString() ?? "");
  const [price, setPrice] = useState<string>(initial?.price?.toString() ?? "");
  const [status, setStatus] = useState<RoomStatus>(initial?.status ?? "AVAILABLE");
  const [description, setDescription] = useState(initial?.description ?? "");

  // Image state
  const [previewUrls, setPreviewUrls] = useState<string[]>(
    initial?.images.map((img) => img.url) ?? []
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingImageIds] = useState<number[]>(initial?.images.map((img) => img.id) ?? []);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
    setPendingFiles((prev) => [...prev, ...files]);
  }

  function removePendingFile(idx: number) {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleDeleteImage(imageId: number) {
    if (mode === "edit") {
      setDeletingImageId(imageId);
      try {
        await apiRequest(`/rooms/${initial!.id}/images/${imageId}`, { method: "DELETE" });
        setPreviewUrls((prev) => prev.filter((_, i) => initial!.images[i]?.id !== imageId));
        setImagesToDelete((prev) => [...prev, imageId]);
      } catch (err) {
        const e = err as ApiError;
        alert(`❌ ${e.message}`);
      } finally {
        setDeletingImageId(null);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrMsg(null);

    const toNum = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const toInt = (v: string) => (v.trim() === "" ? undefined : Number.parseInt(v, 10));

    const formData = new FormData();

    if (mode === "create") {
      const payload: CreateRoomPayload = {
        roomNumber: roomNumber.trim(),
        address: address.trim(),
        floor: toInt(floor),
        area: toNum(area),
        price: Number(price),
        status,
        description: description.trim() || undefined,
      };
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined) formData.append(k, String(v));
      });
    } else if (initial) {
      const payload: UpdateRoomPayload = {
        roomNumber: roomNumber.trim(),
        address: address.trim(),
        floor: toInt(floor),
        area: toNum(area),
        price: Number(price),
        status,
        description: description.trim(),
      };
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined) formData.append(k, String(v));
      });
    }

    // Append new image files
    pendingFiles.forEach((file) => formData.append("images", file));

    try {
      const url = mode === "create"
        ? "/rooms"
        : `/rooms/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}${url}`, {
        method,
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("accessToken") ?? ""}`,
        },
        body: formData,
      });

      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Không thể lưu phòng");
      }

      onSaved();
    } catch (err) {
      setErrMsg((err as Error).message ?? "Không thể lưu phòng");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={styles.modal}
        encType="multipart/form-data"
      >
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            {mode === "create" ? "Thêm phòng mới" : `Chỉnh sửa phòng ${initial?.roomNumber ?? ""}`}
          </h3>
          <button type="button" style={styles.modalClose} onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div style={styles.modalBody}>
          {/* Thumbnail preview row */}
          {previewUrls.length > 0 && (
            <div style={styles.imageRow}>
              {previewUrls.map((url, idx) => {
                const isExisting = idx < (initial?.images.length ?? 0);
                const imgId = isExisting ? initial!.images[idx]?.id : null;
                // Existing Cloudinary URLs → use card thumbnail; new uploads → use local blob
                const displayUrl = isExisting
                  ? roomImageUrl(url, "thumbnail")
                  : url;
                return (
                  <div key={url} style={styles.imageThumb}>
                    <img src={displayUrl} alt="" style={styles.thumbImg} />
                    {isExisting && imgId ? (
                      <button
                        type="button"
                        style={styles.removeImgBtn}
                        disabled={deletingImageId === imgId}
                        onClick={() => handleDeleteImage(imgId)}
                        title="Xóa ảnh"
                      >
                        {deletingImageId === imgId ? "..." : <IconX />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={styles.removeImgBtn}
                        onClick={() => removePendingFile(idx - (initial?.images.length ?? 0))}
                        title="Bỏ ảnh này"
                      >
                        <IconX />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload button */}
          <div style={styles.uploadArea}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              style={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconCamera />
              {previewUrls.length === 0 ? "Thêm ảnh phòng" : "Thêm ảnh khác"}
            </button>
            <span style={styles.uploadHint}>JPEG, PNG, WebP, GIF — tối đa 5MB/ảnh, tối đa 10 ảnh</span>
          </div>

          <div style={styles.row2}>
            <Field label="Số phòng" required>
              <input
                style={styles.input}
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="VD: 101"
                required
                maxLength={50}
              />
            </Field>

            <Field label="Tầng" hint="Không bắt buộc">
              <input
                style={styles.input}
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="VD: 2"
              />
            </Field>
          </div>

          <Field label="Địa chỉ phòng" required>
            <input
              style={styles.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: 123 Đường Nguyễn Trãi, Quận 1, TP.HCM"
              required
              maxLength={500}
            />
          </Field>

          <div style={styles.row2}>
            <Field label="Giá thuê (VND)" required>
              <input
                style={styles.input}
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="VD: 3500000"
                min={1}
                required
              />
            </Field>

            <Field label="Diện tích (m²)" hint="Không bắt buộc">
              <input
                style={styles.input}
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="VD: 25"
                min={1}
              />
            </Field>
          </div>

          <Field label="Trạng thái">
            <select
              style={styles.input}
              value={status}
              onChange={(e) => setStatus(e.target.value as RoomStatus)}
            >
              <option value="AVAILABLE">Còn trống</option>
              <option value="OCCUPIED">Đang thuê</option>
              <option value="MAINTENANCE">Bảo trì</option>
            </select>
          </Field>

          <Field label="Mô tả" hint="Không bắt buộc">
            <textarea
              style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tiện nghi, đặc điểm phòng..."
              maxLength={1000}
            />
          </Field>

          {errMsg && <div style={styles.modalError}>⚠️ {errMsg}</div>}
        </div>

        <div style={styles.modalFooter}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button type="submit" style={styles.primaryBtn} disabled={saving}>
            {saving ? "Đang lưu..." : mode === "create" ? "Tạo phòng" : "Cập nhật"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Shared form bits ──────────────────────────────────────────────────────────
function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: "var(--status-danger)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <span style={styles.hint}>{hint}</span>}
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, confirmDisabled, onConfirm, onClose,
}: {
  title: string; message: string; confirmLabel: string;
  confirmDisabled?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.modal, maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
        </div>
        <div style={styles.modalBody}>
          <p style={{ margin: 0, color: "var(--text-body)", lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.secondaryBtn} onClick={onClose} disabled={confirmDisabled}>
            Hủy
          </button>
          <button
            style={{ ...styles.primaryBtn, ...styles.dangerBtn }}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={styles.loading}>
      <div style={styles.spinner} />
      <span>Đang tải...</span>
    </div>
  );
}

function EmptyState({ onCreate, hasFilters }: { onCreate: () => void; hasFilters: boolean }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>
        <IconDoor />
      </div>
      <h3 style={styles.emptyTitle}>
        {hasFilters ? "Không có phòng nào khớp bộ lọc" : "Chưa có phòng nào"}
      </h3>
      <p style={styles.emptyHint}>
        {hasFilters ? "Thử điều chỉnh bộ lọc hoặc thêm phòng mới" : "Tạo phòng để bắt đầu cho thuê"}
      </p>
      <button style={styles.primaryBtn} onClick={onCreate}>
        <IconPlus />
        Thêm phòng
      </button>
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function IconDoor() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V3h12v18" />
      <path d="M9 21V10h6v11" />
      <circle cx="13.5" cy="14.5" r="1" fill="var(--border-strong)" />
    </svg>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 1100 },
  pageHeader: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 20, gap: 16, flexWrap: "wrap",
  },
  title: { fontSize: 24, fontWeight: 700, color: "var(--text-heading)", margin: 0, marginBottom: 4, letterSpacing: "-0.3px" },
  subtitle: { fontSize: 14, color: "var(--text-label)", margin: 0 },
  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 18px", backgroundColor: "var(--brand-primary)",
    color: "var(--text-inverse)",
    borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
    borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    transition: "background-color 0.15s", whiteSpace: "nowrap",
  },
  secondaryBtn: {
    padding: "10px 18px", backgroundColor: "transparent",
    color: "var(--text-body)",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  dangerBtn: { backgroundColor: "var(--status-danger)" },

  errorBanner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: 12, marginBottom: 16,
    backgroundColor: "var(--status-danger-soft)",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--status-danger-border)",
    borderRadius: 10, color: "var(--status-danger)", fontSize: 14,
  },
  retryBtn: {
    background: "none",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--status-danger)",
    color: "var(--status-danger)", padding: "4px 12px",
    borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
  },

  filterBar: {
    display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap",
  },
  select: {
    padding: "8px 12px", fontSize: 14,
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", borderRadius: 8,
    backgroundColor: "var(--surface-card)", color: "var(--text-heading)",
    fontFamily: "inherit", cursor: "pointer",
  },
  clearBtn: {
    padding: "8px 12px", background: "none",
    borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
    color: "var(--brand-primary)", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
  countText: { marginLeft: "auto", fontSize: 13, color: "var(--text-label)" },

  card: {
    backgroundColor: "var(--surface-card)",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)",
    borderRadius: 14, overflow: "hidden",
  },

  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "12px 16px", textAlign: "left",
    fontSize: 12, fontWeight: 600, color: "var(--text-label)",
    textTransform: "uppercase", letterSpacing: "0.5px",
    backgroundColor: "var(--surface-canvas)",
    borderBottom: "1px solid var(--border-default)",
  },
  tr: { borderBottom: "1px solid var(--border-subtle)" },
  td: { padding: "14px 16px", fontSize: 14, color: "var(--text-body)", verticalAlign: "middle" },
  thumbnail: {
    width: 56, height: 42, objectFit: "cover",
    borderRadius: 6, display: "block",
  },
  thumbPlaceholder: {
    width: 56, height: 42, borderRadius: 6,
    backgroundColor: "var(--surface-canvas)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text-disabled)",
  },
  nameCell: { display: "flex", alignItems: "center", gap: 12 },
  roomBadge: {
    display: "inline-block", padding: "2px 10px",
    backgroundColor: "var(--brand-primary-softer)",
    color: "var(--brand-primary)", borderRadius: 6,
    fontSize: 13, fontWeight: 600,
  },
  addressText: { color: "var(--text-label)", fontSize: 13 },
  priceText: { fontWeight: 600, color: "var(--text-heading)" },
  statusPill: {
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 12, fontWeight: 600,
  },
  muted: { color: "var(--text-disabled)" },
  actions: { display: "inline-flex", gap: 4 },
  iconBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
    backgroundColor: "transparent",
    color: "var(--text-label)", cursor: "pointer",
    transition: "background-color 0.15s",
  },
  iconBtnDanger: { color: "var(--status-danger)" },

  loading: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "60px 24px", gap: 12, color: "var(--text-label)",
  },
  spinner: {
    width: 28, height: 28,
    borderWidth: 3, borderStyle: "solid", borderColor: "var(--brand-primary-soft)",
    borderTopColor: "var(--brand-primary)",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },

  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "60px 24px", textAlign: "center", gap: 8,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: "50%",
    backgroundColor: "var(--surface-canvas)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "var(--text-heading)", margin: 0 },
  emptyHint: { fontSize: 13, color: "var(--text-label)", margin: "0 0 16px", maxWidth: 320, lineHeight: 1.5 },

  overlay: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 16,
  },
  modal: {
    width: "100%", maxWidth: 620,
    backgroundColor: "var(--surface-card)",
    borderRadius: 14, overflow: "hidden",
    boxShadow: "var(--shadow-lg)",
    display: "flex", flexDirection: "column", maxHeight: "90vh",
  },
  modalHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 24px", borderBottom: "1px solid var(--border-default)",
  },
  modalTitle: { fontSize: 17, fontWeight: 600, color: "var(--text-heading)", margin: 0 },
  modalClose: {
    background: "none",
    borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
    cursor: "pointer",
    color: "var(--text-label)", padding: 4, borderRadius: 6, display: "inline-flex",
  },
  modalBody: {
    padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16,
  },
  modalError: {
    padding: "10px 12px", borderRadius: 8,
    backgroundColor: "var(--status-danger-soft)",
    color: "var(--status-danger)", fontSize: 13,
  },
  modalFooter: {
    display: "flex", justifyContent: "flex-end", gap: 8,
    padding: "14px 24px", borderTop: "1px solid var(--border-default)",
    backgroundColor: "var(--surface-canvas)",
  },

  // Image upload styles
  imageRow: {
    display: "flex", flexWrap: "wrap", gap: 8,
  },
  imageThumb: {
    position: "relative", width: 80, height: 60,
  },
  thumbImg: {
    width: "100%", height: "100%", objectFit: "cover",
    borderRadius: 6, display: "block",
  },
  removeImgBtn: {
    position: "absolute", top: -6, right: -6,
    width: 20, height: 20, borderRadius: "50%",
    backgroundColor: "var(--status-danger)",
    color: "white", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, padding: 0,
  },
  uploadArea: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 6, padding: "16px", borderRadius: 8,
    borderWidth: 1, borderStyle: "dashed", borderColor: "var(--border-default)",
    backgroundColor: "var(--surface-canvas)",
  },
  uploadBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "var(--brand-primary)",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--brand-primary)",
    borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
  uploadHint: { fontSize: 11, color: "var(--text-label)", textAlign: "center" },

  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "var(--text-heading)" },
  input: {
    padding: "10px 12px", fontSize: 14,
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", borderRadius: 8,
    backgroundColor: "var(--surface-card)", color: "var(--text-heading)",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  },
  hint: { fontSize: 12, color: "var(--text-label)" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
};
