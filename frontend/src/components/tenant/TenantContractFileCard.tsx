"use client";

import { useEffect, useRef, useState } from "react";
import {
  contractsApi,
  downloadContractFile,
  type ContractFileInfo,
} from "@/lib/api/contracts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null | undefined): string {
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  contractId: number;
  /**
   * Initial value (e.g. from props or SSR). The component will start a polling
   * loop on mount to detect new versions uploaded by the landlord.
   */
  initialFileInfo: ContractFileInfo | null;
  /** Polling interval in ms. Defaults to 30000 (30s). Set to 0 to disable. */
  pollIntervalMs?: number;
  /**
   * Called whenever a newer file is detected. Receives the new info.
   * Useful for parent to refresh other panels.
   */
  onNewVersion?: (info: ContractFileInfo) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TenantContractFileCard({
  contractId,
  initialFileInfo,
  pollIntervalMs = 30000,
  onNewVersion,
}: Props) {
  const [fileInfo, setFileInfo] = useState<ContractFileInfo | null>(
    initialFileInfo
  );
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSeenVersionRef = useRef<number>(initialFileInfo?.fileVersion ?? 0);

  // ─── Polling for new versions ───────────────────────────────────────────
  useEffect(() => {
    if (pollIntervalMs <= 0) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await contractsApi.getFileInfo(contractId);
        if (cancelled) return;
        const info = res.data;
        if (!info) {
          // File was deleted on the landlord side — keep current state
          return;
        }
        if (
          info.fileVersion > lastSeenVersionRef.current &&
          lastSeenVersionRef.current !== 0 // skip first check
        ) {
          setFileInfo(info);
          setShowUpdatedToast(true);
          onNewVersion?.(info);
          // Auto-hide toast after 6s
          setTimeout(() => setShowUpdatedToast(false), 6000);
        } else if (info.fileVersion !== lastSeenVersionRef.current) {
          // First sync — just set it silently
          setFileInfo(info);
        }
        lastSeenVersionRef.current = info.fileVersion;
      } catch (e) {
        // Silent — polling errors shouldn't disturb UI
        if (process.env.NODE_ENV === "development") {
          console.warn("[contract-file] poll error", e);
        }
      }
    }

    const timer = setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [contractId, pollIntervalMs, onNewVersion]);

  // ─── Download ───────────────────────────────────────────────────────────
  async function onDownload() {
    setError(null);
    setDownloading(true);
    try {
      await downloadContractFile(contractId);
    } catch (e: any) {
      setError(e?.message ?? "Tải file thất bại");
    } finally {
      setDownloading(false);
    }
  }

  // ─── Empty state (no file uploaded yet) ─────────────────────────────────
  if (!fileInfo) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <span className="text-xl opacity-50">📄</span>
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-1">
              Hợp đồng chưa được tải lên
            </h3>
            <p className="text-sm text-slate-500 m-0">
              Chủ trọ sẽ upload bản hợp đồng PDF sau khi hai bên thoả thuận.
              File sẽ tự động xuất hiện tại đây.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── File present ───────────────────────────────────────────────────────
  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Toast: updated banner */}
      {showUpdatedToast && (
        <div className="absolute top-3 right-3 z-10 animate-[slideIn_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg shadow-lg text-sm font-medium">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Hợp đồng vừa được cập nhật!
            <button
              type="button"
              onClick={() => setShowUpdatedToast(false)}
              className="ml-2 hover:opacity-80"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md shrink-0">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-[15px] font-semibold text-slate-900 m-0">
                Hợp đồng thuê phòng
              </h3>
              <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                v{fileInfo.fileVersion}
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0">
              {fileInfo.fileMimeType} · {formatBytes(fileInfo.fileSize)}
            </p>
          </div>
        </div>

        {/* File info */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500">Tên file</span>
            <span className="text-sm font-medium text-slate-900 truncate text-right max-w-[60%]">
              {fileInfo.fileName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500">Cập nhật lúc</span>
            <span className="text-sm font-medium text-slate-900">
              {formatDate(fileInfo.fileUploadedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-xl font-semibold text-sm hover:shadow-md disabled:opacity-60 transition shadow-sm"
        >
          {downloading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  className="opacity-75"
                />
              </svg>
              Đang tải…
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Tải hợp đồng (PDF)
            </>
          )}
        </button>

        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-600 shrink-0">⚠️</span>
            <p className="text-sm text-red-700 m-0">{error}</p>
          </div>
        )}

        {/* Polling hint */}
        {pollIntervalMs > 0 && (
          <p className="mt-3 text-[11px] text-slate-400 text-center m-0">
            Tự động kiểm tra phiên bản mới mỗi {pollIntervalMs / 1000}s
          </p>
        )}
      </div>
    </div>
  );
}