"use client";

export default function PaymentsPage() {
  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Thanh toán</h1>
          <p style={styles.subtitle}>Quản lý các khoản thanh toán từ người thuê</p>
        </div>
      </div>

      <ShellTable
        columns={["Mã GD", "Hóa đơn", "Người thuê", "Số tiền", "Phương thức", "Ngày thanh toán", "Trạng thái"]}
        emptyMessage="Chưa có giao dịch nào"
        emptyHint="Các giao dịch sẽ xuất hiện khi người thuê thanh toán hóa đơn"
      />
    </div>
  );
}

function ShellTable({ columns, emptyMessage, emptyHint }: { columns: string[]; emptyMessage: string; emptyHint: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </div>
        <h3 style={styles.emptyTitle}>{emptyMessage}</h3>
        <p style={styles.emptyHint}>{emptyHint}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 1100 },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" },
  title: { fontSize: 24, fontWeight: 700, color: "var(--text-heading)", margin: 0, marginBottom: 4, letterSpacing: "-0.3px" },
  subtitle: { fontSize: 14, color: "var(--text-label)", margin: 0 },
  primaryBtn: { display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", backgroundColor: "var(--brand-primary)", color: "var(--text-inverse)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background-color 0.15s", whiteSpace: "nowrap" },
  card: { backgroundColor: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 14, overflow: "hidden" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center", gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: "50%", backgroundColor: "var(--surface-canvas)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "var(--text-heading)", margin: 0 },
  emptyHint: { fontSize: 13, color: "var(--text-label)", margin: 0, maxWidth: 300, lineHeight: 1.5 },
};
