"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import {
  PropertySummary,
  CreatePropertyPayload,
  UpdatePropertyPayload,
} from "@/types/property";

const VND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [editing, setEditing] = useState<PropertySummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PropertySummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<PropertySummary[]>("/properties");
      setProperties(data);
    } catch (err) {
      const e = err as ApiError;
      setError(e.message ?? "Không thể tải danh sách khu trọ");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/properties/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      await load();
    } catch (err) {
      const e = err as ApiError;
      alert(`❌ ${e.message}`);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Khu trọ</h1>
          <p style={styles.subtitle}>Quản lý danh sách khu trọ của bạn</p>
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => setCreating(true)}
          disabled={loading}
        >
          <IconPlus />
          Tạo khu trọ
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button style={styles.retryBtn} onClick={load}>Thử lại</button>
        </div>
      )}

      <div style={styles.card}>
        {loading ? (
          <LoadingState />
        ) : properties.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "30%" }}>Tên khu trọ</th>
                <th style={styles.th}>Địa chỉ</th>
                <th style={{ ...styles.th, textAlign: "center", width: 90 }}>Số phòng</th>
                <th style={{ ...styles.th, textAlign: "center", width: 110 }}>Hợp đồng</th>
                <th style={{ ...styles.th, textAlign: "right", width: 130 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      <div style={styles.nameIcon}>
                        <IconBuilding />
                      </div>
                      <div>
                        <div style={styles.nameText}>{p.name}</div>
                        {p.description && (
                          <div style={styles.descText}>{p.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.addressText}>{p.address}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.countBadge}>{p.roomCount}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <span style={{ ...styles.countBadge, ...styles.contractBadge }}>
                      {p.contractCount}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <div style={styles.actions}>
                      <button
                        style={styles.iconBtn}
                        title="Chỉnh sửa"
                        onClick={() => setEditing(p)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        style={{ ...styles.iconBtn, ...styles.iconBtnDanger }}
                        title="Xóa"
                        onClick={() => setConfirmDelete(p)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(creating || editing) && (
        <PropertyFormModal
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Xóa khu trọ?"
          message={`Bạn có chắc muốn xóa "${confirmDelete.name}"? Hành động này không thể hoàn tác.`}
          confirmLabel={deleting ? "Đang xóa..." : "Xóa"}
          confirmDisabled={deleting}
          onConfirm={handleDelete}
          onClose={() => !deleting && setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ─── Create / Edit modal ───────────────────────────────────────────────────────
function PropertyFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: PropertySummary | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrMsg(null);
    try {
      const payload: CreatePropertyPayload | UpdatePropertyPayload = {
        name: name.trim(),
        address: address.trim(),
        description: description.trim() || undefined,
      };
      if (isEdit && initial) {
        await apiRequest(`/properties/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/properties", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      const e = err as ApiError;
      setErrMsg(e.message ?? "Không thể lưu khu trọ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit} style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{isEdit ? "Chỉnh sửa khu trọ" : "Tạo khu trọ mới"}</h3>
          <button type="button" style={styles.modalClose} onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div style={styles.modalBody}>
          <Field label="Tên khu trọ" required>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sunrise House"
              required
              autoFocus
              maxLength={255}
            />
          </Field>

          <Field label="Địa chỉ" required>
            <input
              style={styles.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: 123 Nguyễn Văn Cừ, Long Biên, Hà Nội"
              required
              maxLength={500}
            />
          </Field>

          <Field label="Mô tả" hint="Không bắt buộc">
            <textarea
              style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tiện ích, gần trường học, gần chợ, ..."
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
            {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo khu trọ"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ─── Shared form bits ──────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
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
  title,
  message,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>
        <IconBuilding size={28} />
      </div>
      <h3 style={styles.emptyTitle}>Chưa có khu trọ nào</h3>
      <p style={styles.emptyHint}>Tạo khu trọ đầu tiên để bắt đầu quản lý phòng trọ</p>
      <button style={styles.primaryBtn} onClick={onCreate}>
        <IconPlus />
        Tạo khu trọ đầu tiên
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconBuilding({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 1100 },
  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 16,
    flexWrap: "wrap",
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
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit",
  },
  dangerBtn: { backgroundColor: "var(--status-danger)" },

  errorBanner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: 12, marginBottom: 16,
    backgroundColor: "var(--status-danger-soft)",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--status-danger-border)",
    borderRadius: 10,
    color: "var(--status-danger)", fontSize: 14,
  },
  retryBtn: {
    background: "none",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--status-danger)",
    color: "var(--status-danger)", padding: "4px 12px",
    borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
  },

  card: {
    backgroundColor: "var(--surface-card)",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)",
    borderRadius: 14, overflow: "hidden",
  },

  // Table
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
  nameCell: { display: "flex", alignItems: "center", gap: 12 },
  nameIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "var(--brand-primary-softer)",
    color: "var(--brand-primary)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  nameText: { fontWeight: 600, color: "var(--text-heading)" },
  descText: { fontSize: 12, color: "var(--text-label)", marginTop: 2, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  addressText: { fontSize: 13 },
  countBadge: {
    display: "inline-block", minWidth: 28, padding: "2px 10px",
    backgroundColor: "var(--brand-primary-soft)",
    color: "var(--brand-primary)", borderRadius: 999,
    fontSize: 13, fontWeight: 700,
  },
  contractBadge: {
    backgroundColor: "var(--status-info-soft)",
    color: "var(--status-info)",
  },
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

  // Loading + empty
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
    color: "var(--border-strong)", marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "var(--text-heading)", margin: 0 },
  emptyHint: { fontSize: 13, color: "var(--text-label)", margin: "0 0 16px", maxWidth: 320, lineHeight: 1.5 },

  // Modal
  overlay: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 16,
  },
  modal: {
    width: "100%", maxWidth: 560,
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

  // Form
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "var(--text-heading)" },
  input: {
    padding: "10px 12px", fontSize: 14,
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", borderRadius: 8,
    backgroundColor: "var(--surface-card)", color: "var(--text-heading)",
    fontFamily: "inherit",
  },
  hint: { fontSize: 12, color: "var(--text-label)" },

  // Suppress unused-variable warnings; VND is intentional helper
  _vnd: {},
};
