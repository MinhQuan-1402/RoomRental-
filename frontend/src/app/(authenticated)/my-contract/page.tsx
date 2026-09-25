"use client";

export default function MyContractPage() {
  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Hợp đồng của tôi</h1>
        <p style={styles.subtitle}>Xem thông tin hợp đồng thuê phòng của bạn</p>
      </div>

      <div style={styles.card}>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 style={styles.emptyTitle}>Chưa có hợp đồng</h3>
          <p style={styles.emptyHint}>Bạn chưa có hợp đồng thuê phòng nào</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 900 },
  pageHeader: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: "var(--text-heading)", margin: 0, marginBottom: 4, letterSpacing: "-0.3px" },
  subtitle: { fontSize: 14, color: "var(--text-label)", margin: 0 },
  card: { backgroundColor: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 14, overflow: "hidden" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center", gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: "50%", backgroundColor: "var(--surface-canvas)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "var(--text-heading)", margin: 0 },
  emptyHint: { fontSize: 13, color: "var(--text-label)", margin: 0, maxWidth: 300, lineHeight: 1.5 },
};
