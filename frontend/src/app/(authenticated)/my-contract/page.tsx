"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  contractsApi,
  type ContractFileInfo,
  type MyActiveContract,
} from "@/lib/api/contracts";
import TenantContractFileCard from "@/components/tenant/TenantContractFileCard";

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
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusLabel(status: MyActiveContract["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "Đang có hiệu lực";
    case "PENDING":
      return "Chờ ký";
    case "EXPIRED":
      return "Đã hết hạn";
    case "TERMINATED":
      return "Đã hủy";
    default:
      return status;
  }
}

function statusClass(status: MyActiveContract["status"]): string {
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

/**
 * Convert the loose file fields on `MyActiveContract` into the strict
 * `ContractFileInfo` shape that `TenantContractFileCard` expects.
 * Returns null if no file has been uploaded yet.
 */
function toFileInfo(c: MyActiveContract): ContractFileInfo | null {
  if (!c.fileName || !c.fileMimeType || !c.fileSize || !c.fileUploadedAt) {
    return null;
  }
  return {
    contractId: c.id,
    fileName: c.fileName,
    fileMimeType: c.fileMimeType,
    fileSize: c.fileSize,
    fileVersion: c.fileVersion,
    fileUploadedAt: c.fileUploadedAt,
    downloadUrl: `/api/contracts/${c.id}/file/download`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyContractPage() {
  const { user } = useAuth();
  const [contract, setContract] = useState<MyActiveContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await contractsApi.getMyActive();
        if (cancelled) return;
        setContract(res.data);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { error?: { message?: string } }; message?: string };
        setError(
          err?.response?.error?.message ?? err?.message ?? "Không thể tải hợp đồng"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Hợp đồng của tôi</h1>
        <p style={styles.subtitle}>
          Xem thông tin và tải bản hợp đồng thuê phòng của bạn
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.card}>
          <div style={styles.skeleton}>
            <div style={{ ...styles.skeletonBar, width: "60%" }} />
            <div style={{ ...styles.skeletonBar, width: "40%" }} />
            <div style={{ ...styles.skeletonBar, width: "80%" }} />
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={styles.card}>
          <div style={styles.errorBox}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={styles.errorTitle}>Không thể tải hợp đồng</div>
              <div style={styles.errorMsg}>{error}</div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={styles.retryBtn}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Empty: no contract at all */}
      {!loading && !error && !contract && (
        <div style={styles.card}>
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>Chưa có hợp đồng</h3>
            <p style={styles.emptyHint}>
              Bạn chưa có hợp đồng thuê phòng nào. Hãy liên hệ chủ trọ để được
              ký hợp đồng.
            </p>
          </div>
        </div>
      )}

      {/* Has contract */}
      {!loading && !error && contract && (
        <div style={styles.stack}>
          {/* Summary card */}
          <section style={styles.card}>
            <div style={styles.summaryHeader}>
              <div>
                <div style={styles.eyebrow}>HỢP ĐỒNG #{contract.id}</div>
                <h2 style={styles.summaryTitle}>
                  Phòng {contract.room.roomNumber}
                </h2>
                <div style={styles.summaryAddress}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{contract.room.address}</span>
                </div>
              </div>
              <span
                style={{
                  ...styles.statusBadge,
                  ...parseStyle(statusClass(contract.status)),
                }}
              >
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor:
                      contract.status === "ACTIVE"
                        ? "#10b981"
                        : "currentColor",
                  }}
                />
                {statusLabel(contract.status)}
              </span>
            </div>

            <div style={styles.summaryGrid}>
              <InfoItem label="Giá thuê / tháng" value={VND(contract.rentPrice)} />
              <InfoItem label="Tiền đặt cọc" value={VND(contract.deposit)} />
              <InfoItem
                label="Ngày bắt đầu"
                value={formatDate(contract.startDate)}
              />
              <InfoItem
                label="Ngày kết thúc"
                value={formatDate(contract.endDate)}
              />
              <InfoItem
                label="Ngày thanh toán"
                value={`Ngày ${contract.billingDay} hàng tháng`}
              />
              <InfoItem label="Người thuê" value={user?.fullName ?? "—"} />
            </div>
          </section>

          {/* File card */}
          <section>
            <TenantContractFileCard
              contractId={contract.id}
              initialFileInfo={toFileInfo(contract)}
            />
          </section>

          {/* Terms */}
          {contract.terms && (
            <section style={styles.card}>
              <div style={styles.termsHeader}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <h3 style={styles.termsTitle}>Điều khoản hợp đồng</h3>
              </div>
              <p style={styles.termsBody}>{contract.terms}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={styles.infoItem}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  );
}

/**
 * Tiny helper to merge a class-string (Tailwind-ish) into the React style
 * object — used for the status badge that wants the tailwind classes the
 * other pages already use. We just pick a background tint based on status.
 */
function parseStyle(className: string): React.CSSProperties {
  if (className.includes("emerald")) {
    return { backgroundColor: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" };
  }
  if (className.includes("amber")) {
    return { backgroundColor: "#fffbeb", color: "#b45309", borderColor: "#fde68a" };
  }
  if (className.includes("rose")) {
    return { backgroundColor: "#fff1f2", color: "#be123c", borderColor: "#fecdd3" };
  }
  return { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 900 },
  pageHeader: { marginBottom: 24 },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text-heading)",
    margin: 0,
    marginBottom: 4,
    letterSpacing: "-0.3px",
  },
  subtitle: { fontSize: 14, color: "var(--text-label)", margin: 0 },

  card: {
    backgroundColor: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },

  stack: { display: "flex", flexDirection: "column", gap: 16 },

  // Loading
  skeleton: { padding: 32, display: "flex", flexDirection: "column", gap: 12 },
  skeletonBar: {
    height: 14,
    backgroundColor: "var(--surface-canvas)",
    borderRadius: 6,
  },

  // Error
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 20,
    backgroundColor: "#fef2f2",
    borderTop: "1px solid #fecaca",
  },
  errorTitle: { fontSize: 14, fontWeight: 600, color: "#991b1b" },
  errorMsg: { fontSize: 13, color: "#b91c1c", marginTop: 2 },
  retryBtn: {
    marginLeft: "auto",
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #fca5a5",
    backgroundColor: "#fff",
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },

  // Empty
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
    maxWidth: 320,
    lineHeight: 1.5,
  },

  // Summary
  summaryHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: "20px 24px",
    borderBottom: "1px solid var(--border-default)",
    backgroundColor: "var(--surface-canvas)",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "var(--text-label)",
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text-heading)",
    margin: 0,
    letterSpacing: "-0.2px",
  },
  summaryAddress: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    fontSize: 13,
    color: "var(--text-label)",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid",
    whiteSpace: "nowrap",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    display: "inline-block",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 20,
    padding: 24,
  },
  infoItem: { minWidth: 0 },
  infoLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text-label)",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-heading)",
    wordBreak: "break-word",
  },

  // Terms
  termsHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "16px 24px",
    borderBottom: "1px solid var(--border-default)",
    color: "var(--text-heading)",
  },
  termsTitle: { fontSize: 15, fontWeight: 600, margin: 0 },
  termsBody: {
    padding: 20,
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    color: "var(--text-body)",
    whiteSpace: "pre-line",
  },
};
