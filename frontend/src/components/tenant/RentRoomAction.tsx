"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AvailableRoom } from "@/app/(authenticated)/dashboard/page";
import s from "./RentalRequests.module.css";

export default function RentRoomAction({ room }: { room: AvailableRoom }) {
  const [confirming, setConfirming] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current) return;
    if (!/^\+?[0-9 ()-]{8,20}$/.test(phone.trim())) { setError("Nhập số điện thoại liên hệ hợp lệ (8–20 ký tự)."); return; }
    submitting.current = true; setBusy(true); setError("");
    try { await apiRequest('/rental-requests', { method: 'POST', body: JSON.stringify({ roomId: room.id, expectedPrice: room.price, phone: phone.trim() }) }); setSent(true); }
    catch (e) { setError((e as { message?: string }).message ?? "Không gửi được yêu cầu. Vui lòng thử lại."); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (sent) return <div className={s.success} role="status"><h3>Đã gửi yêu cầu thuê phòng</h3><p>Yêu cầu đang chờ chủ trọ duyệt. Phòng chưa được giữ chỗ và bạn chưa cần thanh toán.</p><Link href="/rental-requests">Theo dõi yêu cầu của tôi →</Link></div>;
  return <section className={s.rentAction}>
    {!confirming ? <><p>Phù hợp với bạn? Gửi yêu cầu để chủ trọ liên hệ và duyệt thuê.</p><button className={s.primary} onClick={() => setConfirming(true)}>Thuê phòng này</button></> : <>
      <h3>Bạn chắc chắn muốn thuê phòng {room.roomNumber}?</h3>
      <dl className={s.summary}><div><dt>Địa chỉ</dt><dd>{room.address}</dd></div><div><dt>Giá thuê</dt><dd>{new Intl.NumberFormat('vi-VN').format(room.price)} đ / tháng</dd></div></dl>
      <p>Đây là yêu cầu chờ duyệt, chưa phải hợp đồng hay thanh toán. Tiền cọc, thời hạn thuê, ngày thanh toán và các phí khác cần trao đổi với chủ trọ trước khi duyệt. Mỗi tài khoản chỉ có một yêu cầu chờ duyệt.</p>
      <label className={s.field}>Số điện thoại để chủ trọ liên hệ<input autoFocus type="tel" autoComplete="tel" maxLength={20} value={phone} disabled={busy} onChange={e => setPhone(e.target.value)} placeholder="Nhập số điện thoại của bạn" /></label>
      {error && <p className={s.error} role="alert">{error} <Link href="/rental-requests">Xem yêu cầu của tôi</Link></p>}
      <div className={s.actions}><button className={s.secondary} disabled={busy} onClick={() => { setConfirming(false); setError(""); }}>Quay lại</button><button className={s.primary} disabled={busy} onClick={submit}>{busy ? 'Đang gửi...' : 'Xác nhận gửi yêu cầu'}</button></div>
    </>}
  </section>;
}
