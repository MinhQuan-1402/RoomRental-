"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import management from "@/components/landlord/Management.module.css";
import ContractFileUploader from "@/components/landlord/ContractFileUploader";
import { downloadContractFile, type ContractFileInfo } from "@/lib/api/contracts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "EXPIRED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "TERMINATED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Có hiệu lực";
    case "PENDING":
      return "Chờ ký";
    case "EXPIRED":
      return "Hết hạn";
    case "TERMINATED":
      return "Đã hủy";
    default:
      return status;
  }
}

// ─── Backend response types (matches contracts.controller) ────────────────────

interface ContractListItem {
  id: number;
  roomId: number;
  roomNumber: string;
  roomAddress: string;
  tenantId: number;
  tenantName: string;
  tenantPhone: string;
  startDate: string;
  endDate: string;
  rentPrice: number;
  deposit: number;
  billingDay: number;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "TERMINATED";
  fileName: string | null;
  fileVersion: number;
  fileUploadedAt: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandlordContractsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "PENDING" | "EXPIRED" | "TERMINATED"
  >("ALL");

  // Selected contract (for upload modal)
  const [uploadingContract, setUploadingContract] =
    useState<ContractListItem | null>(null);

  // Load list
  useEffect(() => {
    (async () => {
      try {
        // Endpoint trả về tất cả HĐ của landlord — cần tạo sau nếu chưa có
        // Tạm thời dùng /dashboard/landlord-stats không có list này,
        // nên mình fetch trực tiếp từ /contracts
        // NOTE: nếu endpoint này không tồn tại, sẽ fall back qua tenants.
        const res = await api.get<{ data: ContractListItem[] } | ContractListItem[]>(
          "/contracts"
        );
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data as any).data ?? [];
        setContracts(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(
          e?.response?.error?.message ?? e?.message ?? "Không thể tải danh sách"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = contracts.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.tenantName.toLowerCase().includes(q) ||
        c.tenantPhone.includes(q) ||
        c.roomNumber.toLowerCase().includes(q) ||
        String(c.id).includes(q)
      );
    }
    return true;
  });

  async function onDownload(contractId: number) {
    try {
      await downloadContractFile(contractId);
    } catch (e: any) {
      alert(e?.message ?? "Tải file thất bại");
    }
  }

  function onUploaded(contractId: number, info: ContractFileInfo) {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              fileName: info.fileName,
              fileVersion: info.fileVersion,
              fileUploadedAt: info.fileUploadedAt,
            }
          : c
      )
    );
    // Update the modal's contract reference too
    setUploadingContract((prev) =>
      prev?.id === contractId
        ? {
            ...prev,
            fileName: info.fileName,
            fileVersion: info.fileVersion,
            fileUploadedAt: info.fileUploadedAt,
          }
        : prev
    );
  }

  return (
    <div className={management.page}>
      {/* Header */}
      <header className={management.hero}>
        <div>
          <p className={management.eyebrow}>QUẢN LÝ HỢP ĐỒNG</p>
          <h1>Hợp đồng</h1>
          <p>
            Theo dõi hợp đồng của các phòng đang cho thuê. Upload hoặc cập nhật
            bản PDF để chia sẻ với người thuê.
          </p>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-0 basis-[240px]">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Tìm theo phòng, tên, SĐT, mã HĐ…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition"
            />
          </div>

          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { v: "ALL", label: "Tất cả" },
                { v: "ACTIVE", label: "Hiệu lực" },
                { v: "PENDING", label: "Chờ ký" },
                { v: "EXPIRED", label: "Hết hạn" },
              ] as const
            ).map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => setStatusFilter(s.v)}
                className={
                  "px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 " +
                  (statusFilter === s.v
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          ⚠️ {error}
          <p className="text-xs mt-1 text-red-600">
            (Có thể endpoint <code>/api/contracts</code> chưa được tạo cho landlord.
            Xem phần Backend bên dưới.)
          </p>
        </div>
      )}

      {/* List */}
      <div className={management.list}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center mb-5">
              <svg
                className="w-10 h-10 text-teal-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
              {search ? "Không tìm thấy hợp đồng" : "Chưa có hợp đồng nào"}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {search
                ? `Không có hợp đồng nào khớp với "${search}".`
                : "Hợp đồng được tạo tự động khi bạn duyệt yêu cầu thuê."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <ContractCard
                key={c.id}
                contract={c}
                onUpload={() => setUploadingContract(c)}
                onDownload={() => onDownload(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {uploadingContract && (
        <UploadModal
          contract={uploadingContract}
          onClose={() => setUploadingContract(null)}
          onUploaded={(info) => onUploaded(uploadingContract.id, info)}
          onDownload={() => onDownload(uploadingContract.id)}
        />
      )}
    </div>
  );
}

// ─── Contract card ────────────────────────────────────────────────────────────

function ContractCard({
  contract: c,
  onUpload,
  onDownload,
}: {
  contract: ContractListItem;
  onUpload: () => void;
  onDownload: () => void;
}) {
  const hasFile = !!c.fileName;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Top stripe */}
      <div
        className={
          "h-1 bg-gradient-to-r " +
          (c.status === "ACTIVE"
            ? "from-emerald-500 to-teal-500"
            : c.status === "PENDING"
            ? "from-amber-500 to-orange-500"
            : "from-slate-300 to-slate-200")
        }
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-[15px] truncate">
              Phòng {c.roomNumber}
            </h3>
            <p className="text-xs text-slate-500 m-0 truncate">
              {c.roomAddress}
            </p>
          </div>
          <span
            className={
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 " +
              statusClass(c.status)
            }
          >
            {statusLabel(c.status)}
          </span>
        </div>

        {/* Tenant */}
        <div className="rounded-lg bg-slate-50 px-3 py-2 mb-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
            Người thuê
          </div>
          <div className="text-sm font-semibold text-slate-900">
            {c.tenantName}
          </div>
          <div className="text-xs text-slate-600">{c.tenantPhone}</div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 text-[12px] mb-3">
          <InfoPair label="Bắt đầu" value={formatDate(c.startDate)} />
          <InfoPair label="Kết thúc" value={formatDate(c.endDate)} />
          <InfoPair label="Giá thuê" value={VND(c.rentPrice)} />
          <InfoPair label="Cọc" value={VND(c.deposit)} />
        </div>

        {/* File status */}
        <div className="rounded-lg border border-slate-200 px-3 py-2 mb-3 text-[12px]">
          {hasFile ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base shrink-0">📄</span>
                  <span className="font-medium text-slate-900 truncate">
                    {c.fileName}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded shrink-0">
                  v{c.fileVersion}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Cập nhật: {formatDateTime(c.fileUploadedAt)}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <span>📎</span>
              <span>Chưa upload file PDF</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onUpload}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition"
          >
            {hasFile ? "🔄 Cập nhật file" : "📤 Upload hợp đồng"}
          </button>
          {hasFile && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              title="Tải file hiện tại"
            >
              📥
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoPair({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
        {label}
      </div>
      <div className="text-[13px] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

// ─── Upload modal ─────────────────────────────────────────────────────────────

function UploadModal({
  contract,
  onClose,
  onUploaded,
  onDownload,
}: {
  contract: ContractListItem;
  onClose: () => void;
  onUploaded: (info: ContractFileInfo) => void;
  onDownload: () => void;
}) {
  const currentInfo: ContractFileInfo | null = contract.fileName
    ? {
        contractId: contract.id,
        fileName: contract.fileName,
        fileMimeType: "application/pdf",
        fileSize: 0, // unknown without extra fetch — not needed for uploader
        fileVersion: contract.fileVersion,
        fileUploadedAt: contract.fileUploadedAt!,
        downloadUrl: `/api/contracts/${contract.id}/file/download`,
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-teal-100 text-[11px] uppercase tracking-wider font-semibold mb-0.5">
                HỢP ĐỒNG #{contract.id}
              </div>
              <h2 className="text-xl font-bold truncate">
                Phòng {contract.roomNumber} · {contract.tenantName}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Contract summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Bắt đầu</div>
                <div className="font-semibold text-slate-900">
                  {formatDate(contract.startDate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Kết thúc</div>
                <div className="font-semibold text-slate-900">
                  {formatDate(contract.endDate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Giá thuê</div>
                <div className="font-semibold text-slate-900">
                  {VND(contract.rentPrice)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Cọc</div>
                <div className="font-semibold text-slate-900">
                  {VND(contract.deposit)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Thanh toán</div>
                <div className="font-semibold text-slate-900">
                  Ngày {contract.billingDay}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Trạng thái</div>
                <div className="font-semibold text-slate-900">
                  {statusLabel(contract.status)}
                </div>
              </div>
            </div>
          </div>

          {/* File uploader */}
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            File hợp đồng PDF
          </h3>
          <ContractFileUploader
            contractId={contract.id}
            fileInfo={currentInfo}
            onUploaded={onUploaded}
          />

          {currentInfo && (
            <div className="mt-4 flex items-center justify-between gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
              <span className="text-blue-800">
                💡 Mỗi lần upload sẽ tạo phiên bản mới (v{currentInfo.fileVersion + 1}+).
                Người thuê sẽ tự động thấy bản mới nhất.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}