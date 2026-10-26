import type { TenantInvoice, TenantInvoiceStatus } from '@/lib/api/invoices';
import s from '@/app/(authenticated)/my-invoices/my-invoices.module.css';

export const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(value);
export const monthLabel = (value: string) => `Tháng ${value.slice(5, 7)}/${value.slice(0, 4)}`;
export const dateLabel = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00+07:00` : value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

export function invoiceError(error: unknown) {
  const failure = error as { status?: number; message?: string };
  if (failure?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (failure?.status === 404) return 'Hóa đơn không tồn tại hoặc bạn không có quyền xem.';
  return failure?.message && failure.message !== 'Failed to fetch' ? failure.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.';
}

export function InvoiceStatus({ status }: { status: TenantInvoiceStatus }) {
  const labels = { PENDING: 'Chưa thanh toán', OVERDUE: 'Quá hạn', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy' };
  return <span className={`${s.badge} ${s[status.toLowerCase()]}`}>{labels[status]}</span>;
}

export function InvoiceDetails({ invoice }: { invoice: TenantInvoice }) {
  return <>
    <section className={s.card} aria-label="Thông tin hóa đơn">
      <div className={s.detailHeader}><div><p className={s.eyebrow}>HÓA ĐƠN TIỀN PHÒNG</p><h1>{monthLabel(invoice.billingMonth)}</h1><p className={s.code}>{invoice.invoiceNumber}</p></div><InvoiceStatus status={invoice.status} /></div>
      <dl className={s.metadata}>
        <div><dt>Người thuê</dt><dd>{invoice.tenantName}</dd></div>
        <div><dt>Phòng</dt><dd>{invoice.roomNumber}</dd></div>
        <div><dt>Địa chỉ</dt><dd>{invoice.roomAddress}</dd></div>
        <div><dt>Hạn thanh toán</dt><dd>{dateLabel(invoice.dueDate)}</dd></div>
        {invoice.status === 'PAID' && invoice.paidAt && <div><dt>Ngày thanh toán</dt><dd>{dateLabel(invoice.paidAt)}</dd></div>}
      </dl>
    </section>
    <section className={s.card} aria-label="Chi tiết các khoản thu">
      <div className={s.sectionTitle}><h2>Chi tiết các khoản thu</h2><p>Đơn giá và chỉ số được ghi nhận tại thời điểm lập hóa đơn.</p></div>
      <div className={s.charges}>
        <div className={s.charge}><div><h3>Tiền phòng</h3><p>Tiền thuê theo hóa đơn tháng</p></div><strong>{money(invoice.roomRent)}</strong></div>
        <div className={s.charge}><div><h3>Tiền điện</h3><p>Chỉ số đầu: {invoice.electricityPrevious} · Chỉ số cuối: {invoice.electricityCurrent}</p><p>{invoice.electricityUsage} kWh × {money(invoice.electricityUnitPrice)}/kWh</p></div><strong>{money(invoice.electricityTotal)}</strong></div>
        <div className={s.charge}><div><h3>Tiền nước</h3><p>Chỉ số đầu: {invoice.waterPrevious} · Chỉ số cuối: {invoice.waterCurrent}</p><p>{invoice.waterUsage} m³ × {money(invoice.waterUnitPrice)}/m³</p></div><strong>{money(invoice.waterTotal)}</strong></div>
        <div className={s.charge}><div><h3>Phí dịch vụ</h3></div><strong>{money(invoice.serviceFee)}</strong></div>
        <div className={s.charge}><div><h3>Phí khác</h3>{invoice.otherFeeNote && <p>{invoice.otherFeeNote}</p>}</div><strong>{money(invoice.otherFee)}</strong></div>
      </div>
      <div className={s.total}><span>Tổng tiền hóa đơn</span><strong>{money(invoice.totalAmount)}</strong></div>
    </section>
    <p className={s.note}>{invoice.status === 'CANCELLED' ? 'Hóa đơn đã hủy, không tính vào tổng tiền còn phải trả.' : invoice.status === 'PAID' ? 'Hóa đơn đã được ghi nhận thanh toán.' : 'Vui lòng đối chiếu các khoản thu và liên hệ chủ trọ để thanh toán.'}</p>
  </>;
}
