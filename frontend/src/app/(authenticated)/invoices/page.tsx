"use client";

import { useEffect, useRef, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { InvoiceCandidate, InvoiceBatchResult, InvoiceRowResult, LandlordInvoice, invoicesApi } from '@/lib/api/invoices';
import { DraftField, InvoiceDraft, draftTotal, invoicePayload, newInvoiceDraft, validateDraft } from '@/lib/invoice-draft';
import s from './invoices.module.css';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(value);
const statusLabels = { DRAFT: 'Bản nháp', PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', OVERDUE: 'Quá hạn', CANCELLED: 'Đã hủy' };
const keyOf = (month: string, id: number) => `${month}:${id}`;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối máy chủ';

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}

export default function InvoicesPage() {
  return <AuthGuard allowedRoles={['LANDLORD']}><InvoiceManager /></AuthGuard>;
}

function InvoiceManager() {
  const [month, setMonth] = useState(currentMonth);
  const [address, setAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [candidates, setCandidates] = useState<InvoiceCandidate[]>([]);
  const [invoices, setInvoices] = useState<LandlordInvoice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, InvoiceDraft>>({});
  const [results, setResults] = useState<Record<string, InvoiceRowResult>>({});
  const [summary, setSummary] = useState<{ month: string; data: InvoiceBatchResult } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedMonth, setLoadedMonth] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rates, setRates] = useState({ electricityUnitPrice: '', waterUnitPrice: '', serviceFee: '' });
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([invoicesApi.candidates(month), invoicesApi.list(month)]).then(([candidateResponse, invoiceResponse]) => {
      if (cancelled) return;
      setCandidates(candidateResponse.data);
      setInvoices(invoiceResponse.data);
      setDrafts(old => {
        const updated = { ...old };
        for (const candidate of candidateResponse.data) {
          const key = keyOf(month, candidate.contractId);
          const draft = updated[key] ?? newInvoiceDraft(candidate);
          // Refresh server-owned baselines without discarding readings typed by the landlord.
          updated[key] = { ...draft,
            electricityPrevious: candidate.electricityPrevious === null ? draft.electricityPrevious : String(candidate.electricityPrevious),
            waterPrevious: candidate.waterPrevious === null ? draft.waterPrevious : String(candidate.waterPrevious),
          };
        }
        return updated;
      });
      setLoadedMonth(month);
      setError('');
      setLoading(false);
    }).catch(error => {
      if (!cancelled) { setError(errorMessage(error)); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [month, revision]);

  const readyToUse = !loading && loadedMonth === month && !error;
  const addresses = [...new Set([...candidates.map(row => row.roomAddress), ...invoices.map(row => row.roomAddress)])].sort();
  const visibleCandidates = candidates.filter(row => !address || row.roomAddress === address);
  const visibleInvoices = invoices.filter(row => !address || row.roomAddress === address);
  const editable = visibleCandidates.filter(row => !row.existingInvoice && !row.blockedReason);
  const validCount = editable.filter(row => {
    const draft = drafts[keyOf(month, row.contractId)];
    return draft && Object.keys(validateDraft(draft, row, month)).length === 0 && draftTotal(draft, row.rentPrice) <= 9999999999.99;
  }).length;

  function refresh() { setLoading(true); setError(''); setRevision(value => value + 1); }
  function updateDraft(row: InvoiceCandidate, field: DraftField, value: string) {
    const key = keyOf(month, row.contractId);
    setDrafts(old => ({ ...old, [key]: { ...old[key], [field]: value } }));
    setResults(old => { const updated = { ...old }; delete updated[key]; return updated; });
  }

  function applyRates() {
    setDrafts(old => {
      const updated = { ...old };
      for (const row of editable) {
        const key = keyOf(month, row.contractId);
        updated[key] = { ...updated[key], ...Object.fromEntries(Object.entries(rates).filter(([, value]) => value.trim() !== '')) };
      }
      return updated;
    });
    setResults(old => {
      const updated = { ...old };
      for (const row of editable) delete updated[keyOf(month, row.contractId)];
      return updated;
    });
  }

  async function createInvoices() {
    if (submitting.current || !readyToUse || !editable.length) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    const combined: InvoiceBatchResult = { created: 0, skipped: 0, failed: 0, results: [] };
    try {
      // Each API request stays within the backend's batch limit.
      for (let offset = 0; offset < editable.length; offset += 100) {
        const rows = editable.slice(offset, offset + 100);
        const response = await invoicesApi.create(month, rows.map(row => invoicePayload(drafts[keyOf(month, row.contractId)], row)));
        const data = response.data;
        combined.created += data.created;
        combined.skipped += data.skipped;
        combined.failed += data.failed;
        combined.results.push(...data.results);
        setResults(old => ({ ...old, ...Object.fromEntries(data.results.filter(row => row.contractId !== null).map(row => [keyOf(month, row.contractId!), row])) }));
        setSummary({ month, data: { ...combined, results: [...combined.results] } });
      }
      refresh();
    } catch (error) {
      setError(`${errorMessage(error)}. Một số hóa đơn có thể đã được tạo. Bấm “Tải lại trạng thái” trước khi thử lại; số đã nhập được giữ lại.`);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <div className={s.page}>
    <header className={s.hero}>
      <div><p className={s.eyebrow}>QUẢN LÝ THU TIỀN</p><h1>Hóa đơn hàng tháng</h1><p>Nhập điện, nước cho nhiều phòng và theo dõi hóa đơn theo từng tháng.</p></div>
      <button className={s.primary} disabled={busy} onClick={() => setCreating(value => !value)}>{creating ? 'Xem hóa đơn đã tạo' : '+ Tạo hóa đơn tháng'}</button>
    </header>

    <div className={s.toolbar}>
      <label>Tháng hóa đơn<input type="month" min="2000-01" max="2100-12" value={month} disabled={busy} onChange={event => {
        if (!event.target.value) return;
        setMonth(event.target.value); setAddress(''); setLoading(true); setError(''); setExpandedId(null);
      }} /></label>
      <label className={s.addressFilter}>Địa chỉ phòng<select value={address} disabled={busy || !readyToUse} onChange={event => setAddress(event.target.value)}><option value="">Tất cả địa chỉ</option>{addresses.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <button className={s.secondary} onClick={refresh} disabled={busy || loading}>Tải lại trạng thái</button>
    </div>

    {error && <div className={s.errorBanner} role="alert">{error}</div>}
    {summary?.month === month && <div className={s.resultBanner} role="status">Kết quả đợt vừa tạo: <strong>{summary.data.created} thành công</strong> · {summary.data.skipped} đã có/bỏ qua · {summary.data.failed} cần sửa hoặc thử lại. Xem lý do ở từng phòng.</div>}

    {loading || loadedMonth !== month ? <div className={s.empty} role="status">{error ? 'Chưa tải được dữ liệu tháng này. Bấm tải lại trạng thái để thử lại.' : 'Đang tải hóa đơn và các phòng…'}</div> : creating ? <>
      <section className={s.instructions}>
        <h2>Tạo hóa đơn tháng {month.split('-').reverse().join('/')}</h2>
        <p>Mỗi phòng được tạo riêng. Phòng nhập thiếu hoặc sai sẽ được giữ lại để sửa; các phòng đúng vẫn tạo được.</p>
        <p>Tiền phòng lấy từ hợp đồng và thu đủ tháng, kể cả tháng bắt đầu/kết thúc thuê. Lần đầu cần nhập chỉ số cũ thực tế; từ tháng sau hệ thống nối tiếp chỉ số cuối của tháng trước.</p>
      </section>
      <section className={s.rates} aria-label="Điền đơn giá chung">
        <div><h3>Điền nhanh đơn giá chung</h3><p>Chỉ áp dụng cho các phòng chưa có hóa đơn đang hiển thị. Ô để trống sẽ giữ giá từng phòng.</p></div>
        {(['electricityUnitPrice', 'waterUnitPrice', 'serviceFee'] as const).map(field => <label key={field}>{field === 'electricityUnitPrice' ? 'Điện (đ/kWh)' : field === 'waterUnitPrice' ? 'Nước (đ/m³)' : 'Phí dịch vụ (đ)'}<input type="number" min="0" step="0.01" value={rates[field]} disabled={busy || !readyToUse} placeholder="Nhập số tiền" onChange={event => setRates(old => ({ ...old, [field]: event.target.value }))} /></label>)}
        <button className={s.secondary} disabled={busy || !readyToUse || !editable.length} onClick={applyRates}>Áp dụng</button>
      </section>

      <div className={s.tableWrap}>
        <table className={s.entryTable}><caption className={s.srOnly}>Nhập chỉ số và phí cho các phòng tháng {month}</caption>
          <thead><tr><th scope="col">Phòng / Người thuê</th><th scope="col">Tiền phòng</th><th scope="col">Điện (kWh)</th><th scope="col">Nước (m³)</th><th scope="col">Phụ phí</th><th scope="col">Hạn thanh toán</th><th scope="col">Tổng / Kết quả</th></tr></thead>
          <tbody>{visibleCandidates.map(row => {
            const key = keyOf(month, row.contractId);
            const draft = drafts[key] ?? newInvoiceDraft(row);
            const result = results[key];
            const errors = { ...validateDraft(draft, row, month), ...result?.fields };
            const isDisabled = busy || !readyToUse || !!row.existingInvoice || !!row.blockedReason;
            const total = draftTotal(draft, row.rentPrice);
            const overflow = total > 9999999999.99;
            const valid = !Object.keys(errors).length && !overflow;
            const input = (field: DraftField, label: string, readOnly = false) => <label className={s.field} key={field}>{label}<input
              type={field === 'dueDate' ? 'date' : field === 'otherFeeNote' ? 'text' : 'number'}
              min={field === 'dueDate' ? (row.startDate > `${month}-01` ? row.startDate : `${month}-01`) : 0}
              step={field.endsWith('Previous') || field.endsWith('Current') ? '1' : '0.01'}
              maxLength={field === 'otherFeeNote' ? 255 : undefined}
              aria-label={`${row.roomNumber} – ${field.startsWith('electricity') ? 'Điện – ' : field.startsWith('water') ? 'Nước – ' : ''}${label}`} aria-invalid={!isDisabled && !!errors[field]}
              aria-describedby={!isDisabled && errors[field] ? `${key}-${field}` : undefined}
              value={draft[field]} disabled={isDisabled} readOnly={readOnly}
              onChange={event => updateDraft(row, field, event.target.value)}
            />{!isDisabled && errors[field] && <span className={s.fieldError} id={`${key}-${field}`}>{errors[field]}</span>}</label>;
            return <tr key={row.contractId} className={row.existingInvoice ? s.completedRow : undefined}>
              <th scope="row"><strong>Phòng {row.roomNumber}</strong><span className={s.muted}>{row.tenantName}</span><span className={s.muted}>{row.roomAddress}</span>{row.partialMonth && <span className={s.warning}>Thuê một phần tháng · thu đủ tiền phòng</span>}<span className={s.muted}>{row.previousBillingMonth ? `Chỉ số từ tháng ${row.previousBillingMonth}` : 'Lần đầu: nhập chỉ số đầu kỳ'}</span></th>
              <td className={s.amount}>{money(row.rentPrice)}</td>
              <td>{input('electricityPrevious', 'Chỉ số cũ', row.electricityPrevious !== null)}{input('electricityCurrent', 'Chỉ số mới')}{input('electricityUnitPrice', 'Đơn giá (đ/kWh)')}</td>
              <td>{input('waterPrevious', 'Chỉ số cũ', row.waterPrevious !== null)}{input('waterCurrent', 'Chỉ số mới')}{input('waterUnitPrice', 'Đơn giá (đ/m³)')}</td>
              <td>{input('serviceFee', 'Dịch vụ (đ)')}{input('otherFee', 'Phí khác (đ)')}{input('otherFeeNote', 'Lý do phí khác')}</td>
              <td>{input('dueDate', 'Hạn thanh toán')}</td>
              <td><strong className={s.amount}>{row.existingInvoice ? 'Đã có hóa đơn' : valid ? money(total) : 'Chưa đủ thông tin'}</strong>
                {row.existingInvoice ? <><span className={s.success}>{statusLabels[row.existingInvoice.status as keyof typeof statusLabels]}</span><span className={s.muted}>Không tạo trùng</span></> : row.blockedReason ? <span className={s.warning}>{row.blockedReason}</span> : <>
                  {overflow && <span className={s.fieldError}>Tổng tiền vượt giới hạn. Kiểm tra lại đơn giá/chỉ số.</span>}
                  {result ? <span className={result.outcome === 'ERROR' ? s.fieldError : s.success}>{result.message}</span> : <span className={valid ? s.success : s.muted}>{valid ? 'Sẵn sàng tạo' : 'Điền các ô còn thiếu hoặc sai'}</span>}
                </>}
              </td>
            </tr>;
          })}</tbody>
        </table>
        {!visibleCandidates.length && <div className={s.empty}>Không có hợp đồng đang hiệu lực trong tháng và địa chỉ đã chọn.</div>}
      </div>
      <div className={s.footer}><div><strong>{validCount}/{editable.length} phòng đã đủ thông tin</strong><p>Các phòng đã có hóa đơn sẽ được bỏ qua. Số đã nhập được giữ lại khi tải lại trạng thái.</p></div><button className={s.primary} disabled={busy || !readyToUse || !editable.length} onClick={createInvoices}>{busy ? 'Đang tạo hóa đơn…' : 'Tạo hóa đơn cho các phòng trên'}</button></div>
    </> : <>
      <div className={s.stats}><div><span>Hóa đơn tháng này</span><strong>{visibleInvoices.length}</strong></div><div><span>Tổng tiền hóa đơn đang thu</span><strong>{money(visibleInvoices.filter(row => row.status !== 'CANCELLED' && row.status !== 'DRAFT').reduce((sum, row) => sum + row.totalAmount, 0))}</strong></div><div><span>Chưa thanh toán</span><strong>{money(visibleInvoices.filter(row => row.status === 'PENDING' || row.status === 'OVERDUE').reduce((sum, row) => sum + row.totalAmount, 0))}</strong></div></div>
      <div className={s.tableWrap}><table className={s.listTable}><caption className={s.srOnly}>Hóa đơn đã tạo tháng {month}</caption><thead><tr><th scope="col">Hóa đơn / Phòng</th><th scope="col">Người thuê</th><th scope="col">Tổng tiền</th><th scope="col">Hạn thanh toán</th><th scope="col">Trạng thái</th><th scope="col">Chi tiết</th></tr></thead><tbody>{visibleInvoices.map(invoice => <InvoiceRows key={invoice.id} invoice={invoice} expanded={expandedId === invoice.id} onToggle={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)} />)}</tbody></table>{!visibleInvoices.length && <div className={s.empty}><h2>Chưa có hóa đơn tháng này</h2><p>Bấm “Tạo hóa đơn tháng” để nhập điện, nước cho các phòng.</p></div>}</div>
    </>}
  </div>;
}

function InvoiceRows({ invoice, expanded, onToggle }: { invoice: LandlordInvoice; expanded: boolean; onToggle: () => void }) {
  return <>
    <tr><th scope="row"><strong>Phòng {invoice.roomNumber}</strong><span className={s.muted}>{invoice.roomAddress}</span><span className={s.invoiceNumber}>{invoice.invoiceNumber}</span></th><td>{invoice.tenantName}</td><td className={s.amount}>{money(invoice.totalAmount)}</td><td>{invoice.dueDate.split('-').reverse().join('/')}</td><td><span className={`${s.badge} ${invoice.status === 'OVERDUE' ? s.dangerBadge : invoice.status === 'PAID' ? s.paidBadge : ''}`}>{statusLabels[invoice.status]}</span></td><td><button className={s.secondary} aria-expanded={expanded} aria-controls={`invoice-${invoice.id}`} onClick={onToggle}>{expanded ? 'Thu gọn' : 'Xem'}</button></td></tr>
    {expanded && <tr><td colSpan={6} id={`invoice-${invoice.id}`}><div className={s.details}>
      <div><h3>Tiền phòng</h3><p>{money(invoice.roomRent)}</p><span className={s.muted}>Kỳ {invoice.billingMonth.split('-').reverse().join('/')}</span></div>
      <div><h3>Điện</h3><p>{invoice.electricityCurrent} − {invoice.electricityPrevious} = {invoice.electricityUsage} kWh</p><p>{invoice.electricityUsage} × {money(invoice.electricityUnitPrice)} = <strong>{money(invoice.electricityTotal)}</strong></p></div>
      <div><h3>Nước</h3><p>{invoice.waterCurrent} − {invoice.waterPrevious} = {invoice.waterUsage} m³</p><p>{invoice.waterUsage} × {money(invoice.waterUnitPrice)} = <strong>{money(invoice.waterTotal)}</strong></p></div>
      <div><h3>Phụ phí</h3><p>Dịch vụ: {money(invoice.serviceFee)}</p><p>Phí khác: {money(invoice.otherFee)}</p>{invoice.otherFeeNote && <p>{invoice.otherFeeNote}</p>}</div>
    </div></td></tr>}
  </>;
}
