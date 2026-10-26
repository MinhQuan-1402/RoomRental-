"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { DashboardStats } from "@/app/(authenticated)/dashboard/page";
import { apiRequest } from "@/lib/api";
import { invoicesApi, type LandlordInvoice } from "@/lib/api/invoices";
import AppIcon, { type IconName } from "@/components/ui/AppIcon";
import s from "./LandlordOverview.module.css";

interface RequestPreview { id: number; status: string; createdAt: string; room: { roomNumber: string }; user: { fullName: string }; }
const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)} đ`;
const compact = (n: number) => n >= 1e9 ? `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(n / 1e9)} tỷ` : n >= 1e6 ? `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(n / 1e6)} tr` : money(n);

export default function LandlordOverview({ name, stats }: { name: string; stats: DashboardStats }) {
  const [requests, setRequests] = useState<RequestPreview[] | null>(null);
  const [invoices, setInvoices] = useState<LandlordInvoice[] | null>(null);
  const [requestError, setRequestError] = useState(false);
  const [invoiceError, setInvoiceError] = useState(false);
  useEffect(() => {
    let live = true;
    apiRequest<RequestPreview[]>("/rental-requests").then(data => { if (live) setRequests(data.filter(item => item.status === "PENDING")); }).catch(() => { if (live) setRequestError(true); });
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(new Date());
    const period = `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
    invoicesApi.list(period).then(data => { if (live) setInvoices(data.data.filter(item => item.status === "PENDING" || item.status === "OVERDUE")); }).catch(() => { if (live) setInvoiceError(true); });
    return () => { live = false; };
  }, []);
  const occupancy = Math.min(100, Math.max(0, stats.occupancyRate));
  const month = new Date().toLocaleDateString("vi-VN", { month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  const statuses = [
    { label: "Đang thuê", count: stats.occupiedRooms, color: "var(--ui-lime)" },
    { label: "Còn trống", count: stats.availableRooms, color: "#fff" },
    { label: "Bảo trì", count: stats.maintenanceRooms, color: "var(--ui-coral)" },
  ];
  const max = Math.max(...stats.monthlyRevenue.map(point => point.amount), 1);
  return <div className={s.page}>
    <section className={s.bento} aria-label="Tổng quan phòng trọ">
      <div className={s.welcome}>
        <span className={s.period}>{month}</span>
        <h1>Xin chào, {name}</h1>
        <p className={s.subtitle}>Tình hình phòng trọ và tài chính của bạn hôm nay.</p>
        <div className={s.welcomeBottom}><div className={s.revenue}><p>Tiền thuê dự kiến mỗi tháng</p><strong>{money(stats.expectedRevenue)}</strong><small>Theo giá thuê của các hợp đồng đang hiệu lực</small></div><div className={s.quickActions}><Link href="/invoices"><AppIcon name="invoice" size={17}/>Tạo hóa đơn</Link><Link href="/rooms?create=1"><AppIcon name="plus" size={17}/>Thêm phòng</Link></div></div>
      </div>
      <section className={s.occupancy}>
        <div className={s.sectionHeading}><div><h2>Tình trạng phòng</h2><p>Trên tổng số {stats.totalRooms} phòng</p></div><Link href="/rooms" aria-label="Xem tình trạng phòng"><AppIcon name="arrow" size={17}/></Link></div>
        <strong className={s.occupancyValue}>{occupancy}<span>%</span></strong><p className={s.occupancyLabel}>Tỷ lệ lấp đầy</p>
        <div className={s.occupancyBottom}><div className={s.progress} role="img" aria-label={statuses.map(row => `${row.label}: ${row.count}`).join(", ")}>{statuses.map(row => <span key={row.label} style={{ width: `${stats.totalRooms ? row.count / stats.totalRooms * 100 : 0}%`, background: row.color }}/>)}</div><div className={s.statuses}>{statuses.map(row => <div key={row.label}><span><i style={{ background: row.color }}/>{row.label}</span><strong>{row.count}</strong></div>)}</div></div>
      </section>
      <Metric className={s.rented} label="Đang cho thuê" value={String(stats.occupiedRooms)} hint={`${stats.activeContracts} hợp đồng hiệu lực`} icon="key" href="/contracts"/>
      <Metric className={s.total} label="Tổng số phòng" value={String(stats.totalRooms)} hint={`${stats.availableRooms} phòng còn trống`} icon="door" href="/rooms"/>
      <Metric className={s.debt} label="Công nợ" value={compact(stats.pendingInvoiceAmount)} hint={`Quá hạn: ${compact(stats.overdueInvoiceAmount)}`} icon="alert" href="/invoices"/>
      <Metric className={s.collected} label="Đã thu tháng này" value={compact(stats.collectedRevenue)} hint="Tổng hóa đơn đã thanh toán trong kỳ" icon="wallet" href="/invoices"/>
    </section>
    <div className={s.details}>
      <section className={`${s.panel} ${s.chartPanel}`}>
        <PanelHeading title="Doanh thu theo tháng" description="6 tháng gần nhất · theo kỳ hóa đơn" href="/invoices" action="Hóa đơn"/>
        <div className={s.chartSummary}><div><span><i/>Đã thu tháng này</span><strong>{money(stats.collectedRevenue)}</strong></div><div><span>Tiền thuê dự kiến / tháng</span><strong>{money(stats.expectedRevenue)}</strong></div></div>
        {stats.monthlyRevenue.some(point => point.amount > 0) ? <div className={s.chart} role="img" aria-label={stats.monthlyRevenue.map(point => `${point.label}: ${money(point.amount)}`).join("; ")}>{stats.monthlyRevenue.map(point => <div className={s.chartColumn} key={point.month}><span className={s.barValue}>{compact(point.amount)}</span><div className={s.barTrack}><div className={s.bar} style={{ height: `${point.amount / max * 100}%` }}/></div><span>{point.label}</span></div>)}</div> : <div className={s.empty}><AppIcon name="wallet" size={30}/><strong>Chưa có doanh thu trong 6 tháng gần nhất</strong><p>Biểu đồ sẽ hiển thị khi có hóa đơn được thanh toán.</p></div>}
      </section>
      <section className={`${s.panel} ${s.requests}`}>
        <PanelHeading title="Yêu cầu thuê mới" description={requests ? `${requests.length} yêu cầu chờ duyệt` : "Theo dõi người thuê quan tâm"} href="/rental-requests" action="Xem"/>
        {requestError ? <p className={s.inlineMessage} role="alert">Chưa tải được yêu cầu. <Link href="/rental-requests">Mở danh sách →</Link></p> : requests === null ? <p className={s.inlineMessage} role="status">Đang tải yêu cầu...</p> : requests.length === 0 ? <div className={s.empty}><AppIcon name="users" size={30}/><strong>Đã xử lý hết yêu cầu</strong><p>Yêu cầu thuê mới sẽ xuất hiện tại đây.</p></div> : <ul className={s.requestList}>{requests.slice(0, 3).map(request => <li key={request.id}><div className={s.requestPerson}><span className={s.initial}>{request.user.fullName.trim().split(/\s+/).pop()?.[0]}</span><div><strong>{request.user.fullName}</strong><p>Phòng {request.room.roomNumber}</p></div></div><p className={s.requestDate}>Gửi ngày {new Date(request.createdAt).toLocaleDateString("vi-VN")}</p><Link className={s.review} href="/rental-requests">Xem & xử lý yêu cầu<AppIcon name="arrow" size={14}/></Link></li>)}</ul>}
      </section>
      <section className={`${s.panel} ${s.invoicePanel}`}>
        <PanelHeading title="Hóa đơn chưa thanh toán" description="Các hóa đơn chưa thu của kỳ hiện tại" href="/invoices" action="Tất cả"/>
        {invoiceError ? <p className={s.inlineMessage} role="alert">Chưa tải được hóa đơn. <Link href="/invoices">Mở danh sách →</Link></p> : invoices === null ? <p className={s.inlineMessage} role="status">Đang tải hóa đơn...</p> : invoices.length === 0 ? <div className={s.empty}><AppIcon name="invoice" size={28}/><strong>Không có hóa đơn chờ thanh toán trong kỳ</strong><p>Bạn có thể xem các kỳ khác ở trang Hóa đơn.</p></div> : <div className={s.invoiceList}>{invoices.slice(0, 4).map(invoice => <Link href="/invoices" key={invoice.id}><span className={s.invoiceIcon}><AppIcon name="invoice"/></span><div><strong>Phòng {invoice.roomNumber}</strong><p>{invoice.tenantName}</p></div><div className={s.invoiceAmount}><strong>{money(invoice.totalAmount)}</strong><small>Hạn {new Date(invoice.dueDate).toLocaleDateString("vi-VN")}</small></div><AppIcon name="arrow" size={15}/></Link>)}</div>}
      </section>
      <section className={`${s.panel} ${s.followupPanel}`}><PanelHeading title="Theo dõi hợp đồng" description="Chủ động chăm sóc người thuê" href="/contracts" action="Xem"/><Link className={s.followup} href="/contracts"><span>Hợp đồng sắp hết hạn<small>Trong 30 ngày tới</small></span><strong>{stats.expiringContracts}</strong></Link><Link className={s.followup} href="/tenants"><span>Người thuê đang quản lý</span><strong>{stats.totalTenants}</strong></Link><p className={s.footnote}>{stats.expiringContracts > 0 ? "Trao đổi với người thuê để chuẩn bị gia hạn hợp đồng." : "Chưa có hợp đồng cần gia hạn trong 30 ngày tới."}</p></section>
    </div>
  </div>;
}

function Metric({ className, label, value, hint, icon, href }: { className: string; label: string; value: string; hint: string; icon: IconName; href: string }) {
  return <Link href={href} className={`${s.metric} ${className}`}><div className={s.metricTop}><span>{label}</span><span className={s.metricIcon}><AppIcon name={icon} size={18}/></span></div><strong>{value}</strong><small>{hint}</small></Link>;
}
function PanelHeading({ title, description, href, action }: { title: string; description: string; href: string; action: ReactNode }) {
  return <div className={s.sectionHeading}><div><h2>{title}</h2><p>{description}</p></div><Link href={href}>{action}<AppIcon name="arrow" size={14}/></Link></div>;
}
