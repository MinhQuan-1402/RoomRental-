"use client";

export default function TenantsPage() {
  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Người thuê</h1>
          <p style={styles.subtitle}>Quản lý hồ sơ và thông tin người thuê</p>
        </div>
        <button style={styles.primaryBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm người thuê
        </button>
      </div>

      <ShellTable
        columns={["Họ tên", "Số điện thoại", "Email", "CMND/CCCD", "Phòng đang thuê", "Trạng thái"]}
        emptyMessage="Chưa có người thuê nào"
        emptyHint="Tạo hồ sơ người thuê để bắt đầu"
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
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
