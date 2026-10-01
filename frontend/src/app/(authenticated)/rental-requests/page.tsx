"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import s from "@/components/tenant/RentalRequests.module.css";

interface RentalRequest { id: number; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; phone: string; rentPrice: string; createdAt: string; room: { roomNumber: string; address: string }; user: { fullName: string }; }
const statusLabel = { PENDING: 'Chờ chủ trọ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Không được duyệt', CANCELLED: 'Đã hủy' };

export default function RentalRequestsPage() {
  const { user } = useAuth();
  const landlord = user?.role === 'LANDLORD';
  const [items, setItems] = useState<RentalRequest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await apiRequest<RentalRequest[]>('/rental-requests')); }
    catch (e) { setError((e as { message: string }).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiRequest<RentalRequest[]>('/rental-requests').then(data => { if (!cancelled) setItems(data); }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);
  return <div className={s.page}><header className={s.header}><h1>{landlord ? 'Yêu cầu thuê phòng' : 'Yêu cầu thuê của tôi'}</h1><p>{landlord ? 'Liên hệ người thuê để thống nhất điều kiện trước khi duyệt và lập hợp đồng.' : 'Theo dõi phản hồi từ chủ trọ. Bạn có thể hủy yêu cầu khi đang chờ duyệt.'}</p></header><div className={s.toolbar}><button className={s.secondary} disabled={loading} onClick={load}>Làm mới</button></div>{error && <p role="alert" className={s.error}>{error}</p>}{loading ? <p className={s.empty}>Đang tải yêu cầu...</p> : <div className={s.list}>{items.map(item => <RequestCard key={item.id} item={item} landlord={landlord} reload={load}/>)}{!items.length && !error && <p className={s.empty}>Chưa có yêu cầu thuê phòng. {!landlord && <Link href="/dashboard">Khám phá phòng →</Link>}</p>}</div>}</div>;
}

function RequestCard({ item, landlord, reload }: { item: RentalRequest; landlord: boolean; reload: () => Promise<void> }) {
  const [action, setAction] = useState<'approve' | 'reject' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [deposit, setDeposit] = useState('');
  const [billingDay, setDay] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!action || lock.current) return;
    if (action === 'approve' && endDate <= startDate) { setError('Ngày kết thúc phải sau ngày bắt đầu.'); return; }
    lock.current = true; setBusy(true); setError('');
    try { await apiRequest(`/rental-requests/${item.id}/${action}`, { method: 'POST', body: JSON.stringify(action === 'approve' ? { startDate, endDate, deposit: Number(deposit), billingDay: Number(billingDay) } : {}) }); await reload(); }
    catch (e) { setError((e as { message: string }).message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <article className={s.card}><div className={s.cardHeader}><h2>Phòng {item.room.roomNumber}</h2><span className={s.badge}>{statusLabel[item.status]}</span></div><p className={s.meta}>{item.room.address}</p><p><strong>{new Intl.NumberFormat('vi-VN').format(Number(item.rentPrice))} đ / tháng</strong></p><p className={s.meta}>{landlord ? `${item.user.fullName} · ${item.phone}` : `Số liên hệ: ${item.phone}`}<br/>Gửi lúc {new Date(item.createdAt).toLocaleString('vi-VN')}</p>{item.status === 'APPROVED' && <p className={s.success}>Hợp đồng đã được tạo. {!landlord && <Link href="/dashboard">Xem phòng và hợp đồng đang thuê →</Link>}</p>}
    {item.status === 'PENDING' && !action && <div className={s.actions}>{landlord ? <><button className={s.primary} onClick={() => setAction('approve')}>Duyệt & lập hợp đồng</button><button className={s.secondary} onClick={() => setAction('reject')}>Từ chối</button></> : <button className={s.secondary} onClick={() => setAction('cancel')}>Hủy yêu cầu</button>}</div>}
    {action && <form className={s.terms} onSubmit={submit}><h3>{action === 'approve' ? 'Điều kiện thuê đã thống nhất với người thuê' : action === 'cancel' ? 'Bạn chắc chắn muốn hủy yêu cầu?' : 'Bạn chắc chắn muốn từ chối yêu cầu?'}</h3>{action === 'approve' && <><div className={s.fields}><label className={s.field}>Ngày bắt đầu<input type="date" required value={startDate} onChange={e => setStart(e.target.value)}/></label><label className={s.field}>Ngày kết thúc<input type="date" required min={startDate} value={endDate} onChange={e => setEnd(e.target.value)}/></label><label className={s.field}>Tiền cọc (đ)<input type="number" required min="0" max="9999999999" step="0.01" value={deposit} onChange={e => setDeposit(e.target.value)}/></label><label className={s.field}>Ngày thu tiền hàng tháng (1–28)<input type="number" required min="1" max="28" value={billingDay} onChange={e => setDay(e.target.value)}/></label></div><p className={s.meta}>Duyệt sẽ tạo hợp đồng hiệu lực, chuyển phòng sang đang thuê và từ chối các yêu cầu khác cho phòng này. Giá thuê giữ theo yêu cầu đã gửi. Thao tác này không ghi nhận đã thu tiền cọc hay tiền thuê.</p><label className={s.field}><span><input type="checkbox" required style={{ width: 'auto' }}/> Tôi đã trao đổi và thống nhất các điều kiện trên với người thuê.</span></label></>}{error && <p className={s.error} role="alert">{error}</p>}<div className={s.actions}><button className={s.secondary} type="button" disabled={busy} onClick={() => setAction(null)}>Quay lại</button><button className={s.primary} disabled={busy}>{busy ? 'Đang xử lý...' : 'Xác nhận'}</button></div></form>}
  </article>;
}
