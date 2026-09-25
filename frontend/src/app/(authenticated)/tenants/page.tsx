"use client";

import { useEffect, useMemo, useState } from "react";
import {
  tenantsApi,
  type CreateTenantDto,
  type Tenant,
  type UpdateTenantDto,
} from "@/lib/api/tenants";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ hasActive }: { hasActive: boolean }) {
  if (hasActive) {
    return <span style={badge("emerald")}>● Đang thuê</span>;
  }
  return <span style={badge("slate")}>○ Chưa thuê</span>;
}

function badge(tone: "emerald" | "slate"): React.CSSProperties {
  if (tone === "emerald") {
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      color: "#047857",
      backgroundColor: "#D1FAE5",
      border: "1px solid #A7F3D0",
    };
  }
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    backgroundColor: "#F1F5F9",
    border: "1px solid #E2E8F0",
  };
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL"
  );
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Reload list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await tenantsApi.list({
          page,
          limit,
          search: search.trim() || undefined,
          status: statusFilter,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        if (cancelled) return;
        setTenants(res.data.data);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      } catch (e: any) {
        if (cancelled) return;
        setError(
          e?.response?.message ?? e?.message ?? "Không thể tải danh sách"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, limit, search, statusFilter]);

  const stats = useMemo(() => {
    const active = tenants.filter((t) => t.hasActiveContract).length;
    return { active, inactive: tenants.length - active };
  }, [tenants]);

  return (
    <div style={styles.root}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Người thuê</h1>
          <p style={styles.subtitle}>
            Quản lý hồ sơ và thông tin người thuê{" "}
            {total > 0 && (
              <span style={{ color: "var(--text-label)" }}>
                · {total} hồ sơ
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          style={styles.primaryBtn}
          onClick={() => {
            setEditingTenant(null);
            setModalOpen(true);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm người thuê
        </button>
      </div>

      {/* ─── Filters bar ────────────────────────────────────────────────── */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Tìm theo tên, SĐT, email, CCCD…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              style={{
                ...styles.chip,
                ...(statusFilter === s ? styles.chipActive : null),
              }}
            >
              {s === "ALL" ? "Tất cả" : s === "ACTIVE" ? "Đang thuê" : "Chưa thuê"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Card ───────────────────────────────────────────────────────── */}
      <div style={styles.card}>
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️</span> {error}
          </div>
        )}

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Họ tên</th>
                <th style={styles.th}>Số điện thoại</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>CMND/CCCD</th>
                <th style={styles.th}>Phòng</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && tenants.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} style={styles.td}>
                        <div style={styles.skeleton} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyCell}>
                    <div style={styles.empty}>
                      <div style={styles.emptyIcon}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <h3 style={styles.emptyTitle}>
                        {search
                          ? "Không tìm thấy kết quả"
                          : "Chưa có người thuê nào"}
                      </h3>
                      <p style={styles.emptyHint}>
                        {search
                          ? `Thử từ khóa khác cho "${search}"`
                          : "Tạo hồ sơ người thuê để bắt đầu"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{t.fullName.charAt(0)}</div>
                        <div>
                          <div style={styles.name}>{t.fullName}</div>
                          {t.dateOfBirth && (
                            <div style={styles.muted}>NS: {formatDate(t.dateOfBirth)}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <a href={`tel:${t.phone}`} style={styles.phone}>
                        {t.phone}
                      </a>
                    </td>
                    <td style={{ ...styles.td, color: "var(--text-label)" }}>
                      {t.email ?? "—"}
                    </td>
                    <td style={{ ...styles.td, color: "var(--text-label)" }}>
                      {t.identityNumber ?? "—"}
                    </td>
                    <td style={styles.td}>
                      {t.activeRoomNumber ? (
                        <span style={styles.roomChip}>Phòng {t.activeRoomNumber}</span>
                      ) : (
                        <span style={{ color: "var(--text-label)" }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <StatusBadge hasActive={t.hasActiveContract} />
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <div style={styles.actionGroup}>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          title="Sửa"
                          onClick={() => {
                            setEditingTenant(t);
                            setModalOpen(true);
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.iconBtn, color: "#DC2626" }}
                          title="Xóa"
                          onClick={() => {
                            setDeleteConfirmId(t.id);
                            setDeleteError(null);
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ─────────────────────────────────────────────── */}
        {total > limit && (
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Trang {page}/{totalPages} · Tổng {total}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ ...styles.pageBtn, opacity: page === 1 ? 0.4 : 1 }}
              >
                ← Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  ...styles.pageBtn,
                  opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ───────────────────────────────────────────────────── */}
      {modalOpen && (
        <TenantFormModal
          tenant={editingTenant}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            // trigger reload
            setSearch((s) => s + " ");
            setTimeout(() => setSearch((s) => s.trim()), 0);
          }}
        />
      )}
      {deleteConfirmId !== null && (
        <DeleteConfirmModal
          tenantId={deleteConfirmId}
          error={deleteError}
          onClose={() => {
            setDeleteConfirmId(null);
            setDeleteError(null);
          }}
          onDeleted={() => {
            setDeleteConfirmId(null);
            setSearch((s) => s + " ");
            setTimeout(() => setSearch((s) => s.trim()), 0);
          }}
        />
      )}
    </div>
  );
}

// ─── Form modal ────────────────────────────────────────────────────────────────
function TenantFormModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: Tenant | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!tenant;
  const [form, setForm] = useState<CreateTenantDto>({
    fullName: tenant?.fullName ?? "",
    phone: tenant?.phone ?? "",
    email: tenant?.email ?? "",
    identityNumber: tenant?.identityNumber ?? "",
    dateOfBirth: tenant?.dateOfBirth ?? "",
    address: tenant?.address ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = <K extends keyof CreateTenantDto>(k: K, v: CreateTenantDto[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    // Client-side validation
    const localErrs: Record<string, string> = {};
    if (!form.fullName || form.fullName.trim().length < 2)
      localErrs.fullName = "Họ tên tối thiểu 2 ký tự";
    if (!form.phone || !/^[0-9+\-\s()]{9,20}$/.test(form.phone))
      localErrs.phone = "Số điện thoại không hợp lệ";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      localErrs.email = "Email không hợp lệ";
    if (Object.keys(localErrs).length > 0) {
      setErrors(localErrs);
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateTenantDto = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || null,
        identityNumber: form.identityNumber?.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address?.trim() || null,
      };
      if (isEdit && tenant) {
        await tenantsApi.update(tenant.id, payload as UpdateTenantDto);
      } else {
        await tenantsApi.create(payload);
      }
      onSaved();
    } catch (e: any) {
      const code = e?.response?.error?.code;
      const msg =
        e?.response?.error?.details?.fieldErrors?.phone?.[0] ??
        e?.response?.error?.message ??
        e?.message ??
        "Không thể lưu";
      if (code === "PHONE_DUPLICATE") {
        setErrors({ phone: "Số điện thoại đã tồn tại" });
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {isEdit ? "Sửa người thuê" : "Thêm người thuê mới"}
          </h2>
          <button type="button" style={styles.iconBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formGrid}>
            <Field label="Họ tên *" error={errors.fullName}>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                style={inputStyle(!!errors.fullName)}
                placeholder="Nguyễn Văn A"
                required
              />
            </Field>
            <Field label="Số điện thoại *" error={errors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                style={inputStyle(!!errors.phone)}
                placeholder="0912 345 678"
                required
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => update("email", e.target.value)}
                style={inputStyle(!!errors.email)}
                placeholder="email@example.com"
              />
            </Field>
            <Field label="CMND/CCCD" error={errors.identityNumber}>
              <input
                type="text"
                value={form.identityNumber ?? ""}
                onChange={(e) => update("identityNumber", e.target.value)}
                style={inputStyle(!!errors.identityNumber)}
                placeholder="001234567890"
              />
            </Field>
            <Field label="Ngày sinh" error={errors.dateOfBirth}>
              <input
                type="date"
                value={form.dateOfBirth ?? ""}
                onChange={(e) => update("dateOfBirth", e.target.value)}
                style={inputStyle(!!errors.dateOfBirth)}
              />
            </Field>
            <Field label="Địa chỉ" error={errors.address}>
              <input
                type="text"
                value={form.address ?? ""}
                onChange={(e) => update("address", e.target.value)}
                style={inputStyle(!!errors.address)}
                placeholder="Hà Nội"
              />
            </Field>
          </div>

          {submitError && (
            <div style={styles.formError}>⚠️ {submitError}</div>
          )}

          <div style={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              style={styles.secondaryBtn}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={{
                ...styles.primaryBtn,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
              disabled={submitting}
            >
              {submitting
                ? "Đang lưu…"
                : isEdit
                ? "Cập nhật"
                : "Tạo người thuê"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
      {error && <span style={styles.fieldError}>{error}</span>}
    </label>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${hasError ? "#FCA5A5" : "var(--border-default)"}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s",
    backgroundColor: "var(--surface-card)",
    color: "var(--text-heading)",
  };
}

// ─── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({
  tenantId,
  error,
  onClose,
  onDeleted,
}: {
  tenantId: number;
  error: string | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  // Lift error state from parent
  async function onDelete() {
    setDeleting(true);
    try {
      await tenantsApi.remove(tenantId);
      onDeleted();
    } catch (e: any) {
      // parent shows error via props
      // eslint-disable-next-line no-alert
      alert(
        e?.response?.error?.message ??
          e?.message ??
          "Không thể xóa người thuê"
      );
      setDeleting(false);
    }
  }
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Xác nhận xóa</h2>
          <button type="button" style={styles.iconBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: "8px 0 16px", color: "var(--text-label)", fontSize: 14 }}>
          Bạn có chắc chắn muốn xóa người thuê này? Hành động này không thể hoàn tác.
        </div>
        <div style={styles.modalFooter}>
          <button type="button" onClick={onClose} style={styles.secondaryBtn} disabled={deleting}>
            Hủy
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              ...styles.primaryBtn,
              backgroundColor: "#DC2626",
              opacity: deleting ? 0.6 : 1,
            }}
            disabled={deleting}
          >
            {deleting ? "Đang xóa…" : "Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 1200 },
  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 16,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text-heading)",
    margin: 0,
    marginBottom: 4,
    letterSpacing: "-0.3px",
  },
  subtitle: { fontSize: 14, color: "var(--text-label)", margin: 0 },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    backgroundColor: "var(--brand-primary)",
    color: "var(--text-inverse)",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background-color 0.15s",
    whiteSpace: "nowrap",
  },
  secondaryBtn: {
    padding: "10px 18px",
    backgroundColor: "transparent",
    color: "var(--text-heading)",
    border: "1px solid var(--border-default)",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  searchWrap: {
    position: "relative",
    flex: "1 1 280px",
    maxWidth: 380,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-label)",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "9px 12px 9px 36px",
    border: "1px solid var(--border-default)",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    backgroundColor: "var(--surface-card)",
    color: "var(--text-heading)",
    transition: "border-color 0.15s",
  },
  filterGroup: { display: "flex", gap: 6 },
  chip: {
    padding: "8px 14px",
    backgroundColor: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-label)",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  chipActive: {
    backgroundColor: "var(--brand-primary)",
    color: "var(--text-inverse)",
    borderColor: "var(--brand-primary)",
  },
  card: {
    backgroundColor: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: 14,
    overflow: "hidden",
  },
  errorBanner: {
    padding: "12px 20px",
    backgroundColor: "#FEF2F2",
    color: "#991B1B",
    borderBottom: "1px solid #FECACA",
    fontSize: 13,
    fontWeight: 500,
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-label)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    borderBottom: "1px solid var(--border-default)",
    backgroundColor: "var(--surface-canvas)",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid var(--border-default)",
    transition: "background-color 0.1s",
  },
  td: {
    padding: "14px 16px",
    fontSize: 14,
    color: "var(--text-heading)",
    verticalAlign: "middle",
  },
  emptyCell: { padding: 0 },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 24px",
    textAlign: "center",
    gap: 8,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    backgroundColor: "var(--surface-canvas)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-heading)",
    margin: 0,
  },
  emptyHint: {
    fontSize: 13,
    color: "var(--text-label)",
    margin: 0,
    maxWidth: 300,
    lineHeight: 1.5,
  },
  nameCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "var(--brand-primary)",
    color: "var(--text-inverse)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  name: { fontWeight: 600, fontSize: 14 },
  muted: { fontSize: 12, color: "var(--text-label)", marginTop: 2 },
  phone: { color: "var(--brand-primary)", textDecoration: "none", fontWeight: 500 },
  roomChip: {
    display: "inline-block",
    padding: "3px 10px",
    backgroundColor: "var(--surface-canvas)",
    border: "1px solid var(--border-default)",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-heading)",
  },
  actionGroup: { display: "inline-flex", gap: 4 },
  iconBtn: {
    width: 30,
    height: 30,
    padding: 0,
    backgroundColor: "transparent",
    border: "1px solid transparent",
    borderRadius: 6,
    color: "var(--text-label)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderTop: "1px solid var(--border-default)",
    backgroundColor: "var(--surface-canvas)",
  },
  pageInfo: { fontSize: 13, color: "var(--text-label)" },
  pageBtn: {
    padding: "7px 14px",
    backgroundColor: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-heading)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  skeleton: {
    height: 14,
    backgroundColor: "var(--surface-canvas)",
    borderRadius: 4,
    width: "100%",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    backgroundColor: "var(--surface-card)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 640,
    maxHeight: "90vh",
    overflow: "auto",
    padding: 24,
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-heading)",
    margin: 0,
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-heading)",
  },
  fieldError: { fontSize: 12, color: "#DC2626", marginTop: 2 },
  formError: {
    padding: "10px 14px",
    backgroundColor: "#FEF2F2",
    color: "#991B1B",
    borderRadius: 8,
    fontSize: 13,
    border: "1px solid #FECACA",
  },
  modalFooter: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 8,
  },
};
