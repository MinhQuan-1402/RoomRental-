"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { tenantInvoicesApi, type TenantInvoice } from '@/lib/api/invoices';
import { InvoiceDetails, invoiceError } from '@/components/tenant/InvoiceDetails';
import s from '../my-invoices.module.css';

export default function TenantInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: TenantInvoice; error?: string } | null>(null);
  const tenant = user?.role === 'TENANT';
  const key = `${user?.id}:${id}:${reload}`;

  useEffect(() => {
    if (!tenant) return;
    const controller = new AbortController();
    tenantInvoicesApi.detail(id, controller.signal)
      .then(response => { if (!controller.signal.aborted) setResult({ key, data: response.data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, error: invoiceError(error) }); });
    return () => controller.abort();
  }, [tenant, key, id]);

  if (!tenant) return <p>Bạn cần đăng nhập bằng tài khoản người thuê để xem hóa đơn.</p>;
  const loading = result?.key !== key;
  return <div className={s.page}>
    <div className={s.backRow}><Link className={s.detailLink} href="/my-invoices">← Danh sách hóa đơn</Link><button className={s.button} disabled={loading} onClick={() => setReload(value => value + 1)}>Làm mới</button></div>
    {loading ? <div className={`${s.card} ${s.empty}`} role="status">Đang tải chi tiết hóa đơn…</div>
      : result?.error ? <div className={`${s.card} ${s.empty}`} role="alert"><h1>Không thể xem hóa đơn</h1><p>{result.error}</p><button className={s.button} onClick={() => setReload(value => value + 1)}>Thử lại</button></div>
      : result?.data && <InvoiceDetails invoice={result.data} />}
  </div>;
}
