"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { tenantInvoicesApi, type TenantInvoiceList, type TenantInvoiceStatus } from '@/lib/api/invoices';
import { InvoiceStatus, money, monthLabel, dateLabel, invoiceError } from '@/components/tenant/InvoiceDetails';
import s from './my-invoices.module.css';

export default function MyInvoicesPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState<TenantInvoiceStatus | ''>('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: TenantInvoiceList; error?: string } | null>(null);
  const query = new URLSearchParams({ page: String(page), limit: '12' });
  if (month) query.set('billingMonth', month);
  if (status) query.set('status', status);
  const queryString = query.toString();
  const key = `${user?.id}:${queryString}:${reload}`;
  const tenant = user?.role === 'TENANT';

  useEffect(() => {
    if (!tenant) return;
    const controller = new AbortController();
    tenantInvoicesApi.list(queryString, controller.signal)
      .then(response => { if (!controller.signal.aborted) setResult({ key, data: response.data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, error: invoiceError(error) }); });
    return () => controller.abort();
  }, [tenant, key, queryString]);

  if (!tenant) return <p>Bạn cần đăng nhập bằng tài khoản người thuê để xem hóa đơn.</p>;

  const loading = result?.key !== key;
  const data = !loading ? result?.data : undefined;
  const error = !loading ? result?.error : undefined;
  const filtered = Boolean(month || status);

  return <div className={s.page}>
    <header className={s.hero}>
      <div><p className={s.eyebrow}>CHI PHÍ THUÊ PHÒNG</p><h1>Hóa đơn của tôi</h1><p>Theo dõi tiền phòng, điện nước và các khoản phí theo từng tháng.</p></div>
      <button className={s.button} onClick={() => setReload(value => value + 1)} disabled={loading}>Làm mới</button>
    </header>

    <section aria-label="Tổng công nợ tất cả các kỳ" className={s.stats}>
      <div><span>Tổng tiền còn phải trả</span><strong>{data ? money(data.summary.outstandingAmount) : '—'}</strong><small>{data ? `${data.summary.outstandingCount} hóa đơn chưa thanh toán · Tất cả các kỳ` : 'Đang cập nhật công nợ'}</small></div>
      <div className={s.overdueStat}><span>Trong đó đã quá hạn</span><strong>{data ? money(data.summary.overdueAmount) : '—'}</strong><small>{data ? `${data.summary.overdueCount} hóa đơn quá hạn · Đã nằm trong tổng còn phải trả` : 'Đang cập nhật công nợ'}</small></div>
    </section>

    <section className={s.card} aria-label="Danh sách hóa đơn" aria-busy={loading}>
      <div className={s.filters}>
        <label>Tháng hóa đơn<select value={month} onChange={event => { setMonth(event.target.value); setPage(1); }}>
          <option value="">Tất cả các tháng</option>
          {[...new Set([...(result?.data?.months ?? []), ...(month ? [month] : [])])].sort().reverse().map(value => <option key={value} value={value}>{monthLabel(value)}</option>)}
        </select></label>
        <label>Trạng thái<select value={status} onChange={event => { setStatus(event.target.value as TenantInvoiceStatus | ''); setPage(1); }}>
          <option value="">Tất cả trạng thái</option><option value="PENDING">Chưa thanh toán</option><option value="OVERDUE">Quá hạn</option><option value="PAID">Đã thanh toán</option><option value="CANCELLED">Đã hủy</option>
        </select></label>
        {filtered && <button className={s.textButton} onClick={() => { setMonth(''); setStatus(''); setPage(1); }}>Xóa bộ lọc</button>}
      </div>

      {loading ? <p className={s.empty} role="status">Đang tải hóa đơn…</p>
        : error ? <div className={s.empty} role="alert"><h2>Chưa tải được hóa đơn</h2><p>{error}</p><button className={s.button} onClick={() => setReload(value => value + 1)}>Thử lại</button></div>
        : data && data.items.length === 0 ? <div className={s.empty}><h2>{filtered ? 'Không có hóa đơn phù hợp' : 'Bạn chưa có hóa đơn'}</h2><p>{filtered ? 'Thử chọn tháng hoặc trạng thái khác để xem hóa đơn.' : 'Hóa đơn sẽ xuất hiện tại đây khi chủ trọ lập hóa đơn cho bạn.'}</p>{filtered && <button className={s.button} onClick={() => { setMonth(''); setStatus(''); setPage(1); }}>Xem tất cả hóa đơn</button>}</div>
        : data && <>
          <div className={s.list}>
            {data.items.map(invoice => <article key={invoice.id} className={s.invoice}>
              <div className={s.invoiceMain}><div className={s.invoiceHeading}><h2>{monthLabel(invoice.billingMonth)}</h2><InvoiceStatus status={invoice.status} /></div><p>Phòng {invoice.roomNumber} · {invoice.roomAddress}</p><span className={s.code}>{invoice.invoiceNumber}</span></div>
              <div className={s.invoiceAmount}><strong>{money(invoice.totalAmount)}</strong><span>Hạn thanh toán: {dateLabel(invoice.dueDate)}</span><Link className={s.detailLink} href={`/my-invoices/${invoice.id}`}>Xem chi tiết <span aria-hidden="true">→</span><span className={s.srOnly}> hóa đơn {monthLabel(invoice.billingMonth)}, phòng {invoice.roomNumber}</span></Link></div>
            </article>)}
          </div>
          <nav className={s.pagination} aria-label="Phân trang hóa đơn"><span>{data.pagination.total} hóa đơn · Trang {page}/{data.pagination.totalPages}</span><div><button className={s.button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><button className={s.button} disabled={page >= data.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Sau</button></div></nav>
        </>}
    </section>
    <p className={s.note}>Lịch sử bao gồm hóa đơn của các hợp đồng trước đây. Nếu có khoản thu chưa rõ, vui lòng đối chiếu với chủ trọ.</p>
  </div>;
}
