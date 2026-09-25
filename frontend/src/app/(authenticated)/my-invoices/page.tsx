"use client";

export default function MyInvoicesPage() {
  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Hóa đơn của tôi</h1>
        <p style={styles.subtitle}>Theo dõi hóa đơn và thanh toán tiền phòng</p>
      </div>

      <div style={styles.card}>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14l-5-5 5-5" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
          <h3 style={styles.emptyTitle}>Chưa có hóa đơn</h3>
          <p style={styles.emptyHint}>Hóa đơn sẽ xuất hiện khi chủ trọ tạo hóa đơn cho bạn</p>
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
