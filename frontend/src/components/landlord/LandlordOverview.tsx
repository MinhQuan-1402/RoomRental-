import Link from "next/link";
import type { DashboardStats } from "@/app/(authenticated)/dashboard/page";
import s from "./LandlordOverview.module.css";

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)} đ`;

export default function LandlordOverview({ name, stats }: { name: string; stats: DashboardStats }) {
  const occupancy = Math.min(100, Math.max(0, stats.occupancyRate));
  const month = new Date().toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const metrics = [
    { label: "Tổng số phòng", value: stats.totalRooms, hint: "Trong danh mục quản lý", href: "/rooms", icon: "rooms" },
    { label: "Đang cho thuê", value: stats.occupiedRooms, hint: `${stats.activeContracts} hợp đồng hiệu lực`, href: "/contracts", icon: "key" },
    { label: "Phòng còn trống", value: stats.availableRooms, hint: "Sẵn sàng đón người thuê", href: "/rooms", icon: "door" },
    { label: "Tiền thuê dự kiến / tháng", value: money(stats.expectedRevenue), hint: "Theo giá các phòng đang thuê", href: "/invoices", icon: "money" },
  ];
  const statuses = [
    { label: "Đang thuê", count: stats.occupiedRooms, color: "#387c61" },
    { label: "Còn trống", count: stats.availableRooms, color: "#b2cfbc" },
    { label: "Bảo trì", count: stats.maintenanceRooms, color: "#dce2dc" },
  ];
  const finances = [
    { label: "Đã thu trong tháng", hint: "Tổng hóa đơn đã thanh toán", value: stats.collectedRevenue, symbol: "✓", tone: s.green },
    { label: "Tổng tiền chưa thu", hint: "Bao gồm các khoản quá hạn", value: stats.pendingInvoiceAmount, symbol: "◷", tone: s.amber },
    { label: "Trong đó: quá hạn", hint: "Cần theo dõi và nhắc thanh toán", value: stats.overdueInvoiceAmount, symbol: "!", tone: s.red },
  ];
  const max = Math.max(...stats.monthlyRevenue.map(point => point.amount), 1);

  return <div className={s.page}>
    <header className={s.hero}><div><p className={s.eyebrow}>KHÔNG GIAN QUẢN LÝ</p><h1>Xin chào, {name}</h1><p className={s.subtitle}>Nắm bắt tình hình phòng trọ và tài chính của bạn, tại một nơi.</p></div><Link className={s.primary} href="/rooms"><span aria-hidden="true">＋</span> Quản lý phòng</Link></header>
    <div className={s.heading}><h2>Tổng quan hoạt động</h2><span>{month}</span></div>
    <div className={s.metrics}>{metrics.map(metric => <Link key={metric.label} href={metric.href} className={s.metric}><div className={s.metricTop}><span>{metric.label}</span><span className={s.icon}><MetricIcon kind={metric.icon}/></span></div><strong>{metric.value}</strong><div className={s.metricBottom}><span>{metric.hint}</span><span aria-hidden="true">↗</span></div></Link>)}</div>
    <div className={s.twoColumns}>
      <section className={s.panel}><div className={s.panelHeading}><div><h2>Tình trạng phòng</h2><p>Phân bố trên tổng {stats.totalRooms} phòng</p></div><Link href="/rooms">Xem phòng ↗</Link></div>
        <div className={s.occupancy}><div><strong>{occupancy}<span>%</span></strong><p>Tỷ lệ lấp đầy</p></div><span className={s.note}>{stats.totalRooms === 0 ? "Chưa có phòng trong danh mục" : `${stats.occupiedRooms} / ${stats.totalRooms} phòng đang được thuê`}</span></div>
        <div className={s.progress} role="img" aria-label={`Đang thuê ${stats.occupiedRooms}, còn trống ${stats.availableRooms}, bảo trì ${stats.maintenanceRooms}`}>{statuses.map(status => <span key={status.label} style={{ width: `${stats.totalRooms ? status.count / stats.totalRooms * 100 : 0}%`, background: status.color }}/>)}</div>
        <div className={s.statuses}>{statuses.map(status => <div key={status.label}><span className={s.statusLabel}><i style={{ background: status.color }}/>{status.label}</span><strong>{status.count}</strong></div>)}</div>
      </section>
      <section className={s.panel}><div className={s.panelHeading}><div><h2>Tình hình tài chính</h2><p>Khoản đã thu và công nợ hiện tại</p></div><Link href="/invoices">Hóa đơn ↗</Link></div><div className={s.finances}>{finances.map(row => <div className={s.financeRow} key={row.label}><span className={`${s.financeIcon} ${row.tone}`} aria-hidden="true">{row.symbol}</span><div className={s.financeText}><h3>{row.label}</h3><p>{row.hint}</p></div><strong className={row.tone}>{money(row.value)}</strong></div>)}</div></section>
    </div>
    <div className={s.lowerColumns}>
      <section className={s.panel}><div className={s.panelHeading}><div><h2>Tiền đã thu theo kỳ hóa đơn</h2><p>6 tháng gần nhất · Đơn vị: đồng</p></div><span className={s.chartLegend}><i/>Đã thanh toán</span></div>
        {stats.monthlyRevenue.some(point => point.amount > 0) ? <div className={s.chart} aria-label="Tiền đã thu theo tháng">{stats.monthlyRevenue.map(point => <div className={s.chartColumn} key={point.month}><span className={s.barValue}>{money(point.amount)}</span><div className={s.barTrack}><div className={s.bar} style={{ height: `${point.amount / max * 100}%` }}/></div><span>{point.label}</span></div>)}</div> : <div className={s.chartEmpty}><MetricIcon kind="money"/><h3>Chưa có khoản thu trong 6 tháng gần nhất</h3><p>Biểu đồ sẽ hiển thị khi có hóa đơn được thanh toán.</p></div>}
      </section>
      <section className={s.panel}><div className={s.panelHeading}><div><h2>Theo dõi thuê phòng</h2><p>Người thuê và thời hạn hợp đồng</p></div></div><Link className={s.followup} href="/tenants"><span>Người thuê đang quản lý</span><strong>{stats.totalTenants}<small>↗</small></strong></Link><Link className={s.followup} href="/contracts"><span>Hợp đồng sắp hết hạn</span><strong>{stats.expiringContracts}<small>↗</small></strong></Link><p className={s.footnote}>{stats.expiringContracts > 0 ? "Có hợp đồng hết hạn trong 30 ngày tới. Chủ động trao đổi với người thuê để gia hạn." : "Không có hợp đồng hết hạn trong 30 ngày tới."}</p></section>
    </div>
  </div>;
}

function MetricIcon({ kind }: { kind: string }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === "rooms" ? <><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></> : kind === "key" ? <><circle cx="8" cy="15" r="5"/><path d="m12 11 8-8m-4 4 3 3m-1-5 3 3"/></> : kind === "door" ? <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18m6-9h.01"/></> : <><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M5 12h.01M19 12h.01"/></>}</svg>;
}
