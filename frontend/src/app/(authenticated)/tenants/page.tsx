"use client";

import { useEffect, useMemo, useState } from "react";
import {
  tenantsApi,
  type CreateTenantDto,
  type Tenant,
  type UpdateTenantDto,
} from "@/lib/api/tenants";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Tạo màu gradient ổn định từ tên (hash đơn giản)
function avatarGradient(name: string): string {
  const palettes = [
    "from-teal-500 to-emerald-600",
    "from-sky-500 to-indigo-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-violet-500 to-purple-600",
    "from-cyan-500 to-blue-600",
    "from-lime-500 to-green-600",
    "from-fuchsia-500 to-rose-600",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(h) % palettes.length];
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL"
  );
  const [page, setPage] = useState(1);
  const [limit] = useState(9); // grid 3 cột × 3 hàng
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

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
    // Thống kê trên toàn bộ dataset (chỉ phản ánh dữ liệu trang hiện tại)
    const active = tenants.filter((t) => t.hasActiveContract).length;
    return {
      total,
      active,
      inactive: Math.max(total - active, 0),
    };
  }, [tenants, total]);

  const reload = () => {
    // force reload bằng cách trigger useEffect qua setSearch noop
    setSearch((s) => s);
  };

  return (
    <div className="max-w-[1280px] mx-auto pb-12">
      {/* ─── Hero gradient header ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 shadow-lg">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-8 w-72 h-72 rounded-full bg-emerald-300/40 blur-3xl" />
        </div>
        <div className="relative px-8 py-7 flex items-center justify-between gap-6 flex-wrap">
          <div className="text-white">
            <div className="flex items-center gap-2 text-teal-100 text-xs font-medium uppercase tracking-wider mb-1.5">
              <IconUsers className="w-4 h-4" />
              Quản lý
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Người thuê</h1>
            <p className="text-teal-100/90 text-sm mt-1.5 max-w-md">
              Theo dõi hồ sơ, thông tin liên lạc và tình trạng hợp đồng của tất cả người thuê.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingTenant(null);
              setModalOpen(true);
            }}
            className="group inline-flex items-center gap-2 px-5 py-3 bg-white text-teal-700 rounded-xl font-semibold text-sm shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <svg className="w-4 h-4 transition-transform group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm người thuê
          </button>
        </div>
      </div>

      {/* ─── Stats cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Tổng hồ sơ"
          value={stats.total}
          tone="neutral"
          icon={<IconUsers className="w-5 h-5" />}
          accent="from-slate-500 to-slate-600"
        />
        <StatCard
          label="Đang thuê"
          value={stats.active}
          tone="success"
          icon={<IconCheck className="w-5 h-5" />}
          accent="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Chưa thuê"
          value={stats.inactive}
          tone="warning"
          icon={<IconClock className="w-5 h-5" />}
          accent="from-amber-500 to-orange-600"
        />
      </div>

      {/* ─── Toolbar ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Tìm theo tên, số điện thoại, email, CCCD…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition"
            />
          </div>

          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { v: "ALL", label: "Tất cả" },
                { v: "ACTIVE", label: "Đang thuê" },
                { v: "INACTIVE", label: "Chưa thuê" },
              ] as const
            ).map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => {
                  setStatusFilter(s.v);
                  setPage(1);
                }}
                className={classNames(
                  "px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150",
                  statusFilter === s.v
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <IconAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Tenant grid ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        {loading && tenants.length === 0 ? (
          <SkeletonGrid />
        ) : tenants.length === 0 ? (
          <EmptyState
            hasSearch={!!search.trim()}
            search={search}
            onCreate={() => {
              setEditingTenant(null);
              setModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <TenantCard
                key={t.id}
                tenant={t}
                onEdit={() => {
                  setEditingTenant(t);
                  setModalOpen(true);
                }}
                onDelete={() => setDeleteConfirmId(t.id)}
              />
            ))}
          </div>
        )}

        {/* ─── Pagination ───────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-slate-500">
              Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages} · Tổng{" "}
              <span className="font-semibold text-slate-700">{total}</span> hồ sơ
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Sau
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      {modalOpen && (
        <TenantFormModal
          tenant={editingTenant}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            reload();
          }}
        />
      )}
      {deleteConfirmId !== null && (
        <DeleteConfirmModal
          tenantId={deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onDeleted={() => {
            setDeleteConfirmId(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  tone,
  icon,
  accent,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "warning";
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div
        className={classNames(
          "absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br",
          accent
        )}
      />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div
          className={classNames(
            "w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shadow-sm",
            accent
          )}
        >
          {icon}
        </div>
      </div>
      <div className="relative text-[28px] font-bold leading-none text-slate-900">
        {value}
      </div>
      <div className="relative mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <span
          className={classNames(
            "inline-block w-1.5 h-1.5 rounded-full",
            tone === "success" && "bg-emerald-500",
            tone === "warning" && "bg-amber-500",
            tone === "neutral" && "bg-slate-400"
          )}
        />
        <span>
          {tone === "success" && "đang có hợp đồng"}
          {tone === "warning" && "chưa ký hợp đồng"}
          {tone === "neutral" && "trên hệ thống"}
        </span>
      </div>
    </div>
  );
}

// ─── TenantCard ───────────────────────────────────────────────────────────────
function TenantCard({
  tenant: t,
  onEdit,
  onDelete,
}: {
  tenant: Tenant;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 overflow-hidden">
      {/* Top accent stripe */}
      <div
        className={classNames(
          "h-1 bg-gradient-to-r",
          t.hasActiveContract ? "from-emerald-500 to-teal-500" : "from-slate-300 to-slate-200"
        )}
      />

      <div className="p-5">
        {/* Header: avatar + name + actions */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className={classNames(
              "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-base shadow-md shrink-0",
              avatarGradient(t.fullName)
            )}
          >
            {initials(t.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-[15px] truncate">
              {t.fullName}
            </h3>
            <a
              href={`tel:${t.phone}`}
              className="inline-flex items-center gap-1 text-[13px] text-teal-600 hover:text-teal-700 font-medium mt-0.5"
            >
              <IconPhone className="w-3.5 h-3.5" />
              {t.phone}
            </a>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onEdit}
              title="Sửa"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <IconEdit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Xóa"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status badge */}
        <div className="mb-4">
          {t.hasActiveContract ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang thuê{t.activeRoomNumber ? ` · Phòng ${t.activeRoomNumber}` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Chưa thuê
            </span>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-2 text-[13px]">
          <InfoRow
            icon={<IconMail className="w-3.5 h-3.5" />}
            label="Email"
            value={t.email}
            placeholder="—"
          />
          <InfoRow
            icon={<IconCard className="w-3.5 h-3.5" />}
            label="CMND/CCCD"
            value={t.identityNumber}
            placeholder="—"
          />
          <InfoRow
            icon={<IconCake className="w-3.5 h-3.5" />}
            label="Ngày sinh"
            value={formatDate(t.dateOfBirth)}
          />
        </div>

        {/* Footer: actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            ID #{t.id}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="text-[12px] font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-2.5 py-1 rounded-md transition"
            >
              Sửa →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[11px] text-slate-400 uppercase tracking-wider min-w-[68px]">
        {label}
      </span>
      <span className="truncate flex-1 text-slate-700">
        {value || placeholder || "—"}
      </span>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
          <div className="h-6 bg-slate-100 rounded-full w-24 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
            <div className="h-3 bg-slate-100 rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  hasSearch,
  search,
  onCreate,
}: {
  hasSearch: boolean;
  search: string;
  onCreate: () => void;
}) {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
        {hasSearch ? "Không tìm thấy kết quả" : "Chưa có người thuê nào"}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        {hasSearch
          ? `Không có hồ sơ nào khớp với "${search}". Thử từ khóa khác.`
          : "Tạo hồ sơ người thuê đầu tiên để bắt đầu quản lý."}
      </p>
      {!hasSearch && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm người thuê
        </button>
      )}
    </div>
  );
}

// ─── Form modal ───────────────────────────────────────────────────────────────
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden animate-[slideUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-teal-100 text-[11px] uppercase tracking-wider font-semibold mb-0.5">
                {isEdit ? "Chỉnh sửa" : "Tạo mới"}
              </div>
              <h2 className="text-xl font-bold">
                {isEdit ? "Sửa thông tin người thuê" : "Thêm người thuê mới"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="overflow-y-auto max-h-[calc(92vh-140px)]">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Họ tên" required error={errors.fullName}>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={inputCls(!!errors.fullName)}
                  required
                />
              </Field>
              <Field label="Số điện thoại" required error={errors.phone}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="0912 345 678"
                  className={inputCls(!!errors.phone)}
                  required
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="email@example.com"
                  className={inputCls(!!errors.email)}
                />
              </Field>
              <Field label="CMND/CCCD" error={errors.identityNumber}>
                <input
                  type="text"
                  value={form.identityNumber ?? ""}
                  onChange={(e) => update("identityNumber", e.target.value)}
                  placeholder="001234567890"
                  className={inputCls(!!errors.identityNumber)}
                />
              </Field>
              <Field label="Ngày sinh" error={errors.dateOfBirth}>
                <input
                  type="date"
                  value={form.dateOfBirth ?? ""}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  className={inputCls(!!errors.dateOfBirth)}
                />
              </Field>
              <Field label="Địa chỉ" error={errors.address}>
                <input
                  type="text"
                  value={form.address ?? ""}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Hà Nội"
                  className={inputCls(!!errors.address)}
                />
              </Field>
            </div>

            {submitError && (
              <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 disabled:opacity-60 transition shadow-sm hover:shadow-md inline-flex items-center gap-2"
            >
              {submitting && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
                </svg>
              )}
              {submitting ? "Đang lưu…" : isEdit ? "Cập nhật" : "Tạo người thuê"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return classNames(
    "w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition",
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
      : "border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {error && (
        <span className="text-xs text-red-600 flex items-center gap-1">
          <IconAlert className="w-3 h-3" />
          {error}
        </span>
      )}
    </label>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({
  tenantId,
  onClose,
  onDeleted,
}: {
  tenantId: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setDeleting(true);
    setError(null);
    try {
      await tenantsApi.remove(tenantId);
      onDeleted();
    } catch (e: any) {
      setError(
        e?.response?.error?.message ??
          e?.message ??
          "Không thể xóa người thuê"
      );
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <IconAlert className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Xác nhận xóa
            </h2>
            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa người thuê này? Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>
        {error && (
          <div className="mx-6 mb-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-100 disabled:opacity-50 transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-60 transition shadow-sm hover:shadow-md inline-flex items-center gap-2"
          >
            {deleting && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
              </svg>
            )}
            {deleting ? "Đang xóa…" : "Xóa người thuê"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
function IconUsers({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconClock({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconPhone({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function IconMail({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconCard({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}
function IconCake({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16h16" />
      <circle cx="12" cy="6" r="2" />
      <path d="M12 8v3" />
    </svg>
  );
}
function IconEdit({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconTrash({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconX({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconAlert({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
