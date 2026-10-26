"use client";

import { useRef, useState } from "react";
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

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  contractId: number;
  fileInfo: ContractFileInfo | null;
  /** Called after a successful upload so the parent can refresh state. */
  onUploaded: (info: ContractFileInfo) => void;
  /** Optional: render a smaller compact variant for inline use. */
  variant?: "full" | "compact";
}

export default function ContractFileUploader({
  contractId,
  fileInfo,
  onUploaded,
  variant = "full",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setSuccess(null);

    // Client-side validation (server validates again)
    if (file.type !== "application/pdf") {
      setError("Chỉ chấp nhận file PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File vượt quá 10MB");
      return;
    }

    setUploading(true);
    try {
      const info = await contractsApi.uploadFile(contractId, file);
      onUploaded(info);
      setSuccess(`Đã cập nhật lên phiên bản v${info.fileVersion}`);
      // Auto-clear success after 3s
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(
        e?.response?.error?.message ??
          e?.message ??
          "Upload thất bại, vui lòng thử lại"
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  async function onDownload() {
    try {
      await downloadContractFile(contractId);
    } catch (e: any) {
      setError(e?.message ?? "Tải file thất bại");
    }
  }

  // ─── Compact variant (just a button + status) ────────────────────────────
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-60 transition"
        >
          {uploading ? "Đang tải…" : fileInfo ? "🔄 Cập nhật file" : "📤 Upload hợp đồng"}
        </button>
        {fileInfo && (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            📥 Tải xuống
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>
    );
  }

  // ─── Full variant (drop zone + metadata) ─────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Current file metadata */}
      {fileInfo && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-xl">📄</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-slate-900 truncate">
                {fileInfo.fileName}
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                v{fileInfo.fileVersion}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span>{formatBytes(fileInfo.fileSize)}</span>
              <span>·</span>
              <span>Cập nhật: {formatDate(fileInfo.fileUploadedAt)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shrink-0"
          >
            📥 Tải
          </button>
        </div>
      )}

      {/* Drop zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "relative flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed cursor-pointer transition",
          dragging
            ? "border-teal-500 bg-teal-50"
            : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400",
          uploading && "opacity-60 pointer-events-none",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <svg className="w-7 h-7 text-teal-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
            </svg>
            <span className="text-sm font-medium text-slate-700">Đang upload…</span>
          </>
        ) : (
          <>
            <span className="text-2xl">📎</span>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                {fileInfo ? "Kéo thả file mới để thay thế" : "Kéo thả file PDF hoặc click để chọn"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Chỉ chấp nhận PDF · Tối đa 10MB
              </p>
            </div>
          </>
        )}
      </label>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-red-600 shrink-0">⚠️</span>
          <p className="text-sm text-red-700 m-0">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-emerald-600 shrink-0">✅</span>
          <p className="text-sm text-emerald-700 m-0">{success}</p>
        </div>
      )}
    </div>
  );
}