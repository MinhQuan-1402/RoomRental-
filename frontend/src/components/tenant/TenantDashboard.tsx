"use client";

import { useRef, useState } from "react";
import type { AvailableRoom, MyActiveContract } from "@/app/(authenticated)/dashboard/page";
import styles from "./TenantDashboard.module.css";
import RoomGallery from "./RoomGallery";
import RentRoomAction from "./RentRoomAction";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

function HomeIcon() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7M8 9h.01M16 9h.01"/></svg>;
}

export function TenantHero({ user, contract }: { user: { fullName: string }; contract: MyActiveContract | null }) {
  const fullName = (user.fullName ?? "").trim();
  const initials = (() => {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  })();

  return <header className={styles.hero}>
    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "linear-gradient(135deg, #176d55, #0f4f3f)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 0.5,
            boxShadow: "0 10px 30px #0f4f3f33",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p className={styles.eyebrow}>KHÔNG GIAN CỦA BẠN</p>
          <h1>Xin chào, {user.fullName}</h1>
        </div>
      </div>
      <p className={styles.intro}>{contract ? "Theo dõi phòng thuê và hợp đồng của bạn trong một không gian." : "Một nơi ở phù hợp, một khởi đầu mới. Khám phá các phòng đang chờ bạn."}</p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className={styles.heroNote}><span />{contract ? `Đang thuê · Phòng ${contract.room.roomNumber}` : "Cùng tìm nơi bạn muốn gọi là nhà"}</span>
        {contract && (
          <div style={{ display: "flex", gap: 8, marginLeft: 4, flexWrap: "wrap" }}>
            <a className={styles.quickAction} href="/my-invoices" aria-label="Mở hóa đơn của tôi">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
              Hóa đơn
            </a>
            <a className={styles.quickAction} href="/my-contract" aria-label="Mở hợp đồng của tôi">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Hợp đồng
            </a>
            <a className={styles.quickAction} href="/maintenance/new" aria-label="Tạo yêu cầu bảo trì / báo sự cố">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              Báo sự cố
            </a>
          </div>
        )}
      </div>
    </div>
    <div className={styles.heroArt} aria-hidden="true"><HomeIcon /><span>RoomRental</span><small>Nơi ở, an tâm.</small></div>
  </header>;
}

function RoomCover({ room }: { room: AvailableRoom }) {
  const [failed, setFailed] = useState(false);
  const url = room.images?.[0]?.url;
  return <div className={styles.cover}>
    {url && !failed ? <img src={url} alt={`Phòng ${room.roomNumber}`} loading="lazy" onError={() => setFailed(true)} /> : <div className={styles.placeholder}><HomeIcon /><span>Hình ảnh đang được cập nhật</span></div>}
    <span className={styles.available}><span />Còn trống</span>
  </div>;
}

export function TenantBrowse({ rooms }: { rooms: AvailableRoom[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [selected, setSelected] = useState<AvailableRoom | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const filtered = rooms.filter(room => normalize(`${room.roomNumber} ${room.address}`).includes(normalize(query.trim())));
  if (sort !== "default") filtered.sort((a, b) => sort === "low" ? a.price - b.price : b.price - a.price);

  return <section className={styles.browse} aria-labelledby="available-rooms-title">
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>KHÁM PHÁ PHÒNG TRỌ</p><h2 id="available-rooms-title">Tìm nơi ở phù hợp với bạn</h2><p>Thông tin rõ ràng, dễ dàng so sánh và lựa chọn.</p></div><span className={styles.count}>{rooms.length} phòng còn trống</span></div>
    <div className={styles.toolbar}>
      <label className={styles.search}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input aria-label="Tìm theo số phòng hoặc địa chỉ" placeholder="Tìm số phòng, địa chỉ..." value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label className={styles.sort}>Sắp xếp<select value={sort} onChange={e => setSort(e.target.value)}><option value="default">Mặc định</option><option value="low">Giá thấp đến cao</option><option value="high">Giá cao đến thấp</option></select></label>
    </div>
    <p className={styles.results} aria-live="polite">Hiển thị {filtered.length} phòng{query.trim() ? ` cho “${query.trim()}”` : " đang cho thuê"}</p>
    <div className={styles.grid}>{filtered.map(room => <article className={styles.card} key={room.id}>
      <RoomCover room={room} />
      <div className={styles.cardBody}><h3>Phòng {room.roomNumber}</h3><p className={styles.address}>{room.address || "Địa chỉ đang được cập nhật"}</p>
        <div className={styles.facts}><span>{room.area != null ? `${room.area} m²` : "Chưa có diện tích"}</span>{room.floor !== null && <span>{room.floor === 0 ? "Tầng trệt" : `Tầng ${room.floor}`}</span>}</div>
        <p className={styles.description}>{room.description || "Xem thông tin chi tiết để tìm hiểu thêm về phòng."}</p>
        <div className={styles.cardFooter}><div><small>Giá thuê mỗi tháng</small><p><strong>{money(room.price)} <span>đ</span></strong></p></div><button type="button" aria-label={`Xem chi tiết phòng ${room.roomNumber}`} onClick={() => { setSelected(room); dialog.current?.showModal(); }}>Chi tiết <span aria-hidden="true">↗</span></button></div>
      </div>
    </article>)}</div>
    {filtered.length === 0 && <div className={styles.empty}><HomeIcon /><h3>{rooms.length ? "Chưa tìm thấy phòng phù hợp" : "Hiện chưa có phòng trống"}</h3><p>{rooms.length ? "Thử tìm theo số phòng hoặc một địa chỉ khác." : "Bạn có thể quay lại sau khi chủ trọ cập nhật phòng mới."}</p>{query && <button onClick={() => setQuery("")}>Xóa tìm kiếm</button>}</div>}
    <dialog ref={dialog} aria-labelledby="room-detail-title" className={styles.dialog} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      {selected && <><div className={styles.dialogHeading}><h2 id="room-detail-title">Phòng {selected.roomNumber}</h2><button autoFocus aria-label="Đóng chi tiết phòng" onClick={() => dialog.current?.close()}>×</button></div><RoomGallery key={selected.id} images={selected.images ?? []} roomNumber={selected.roomNumber}/><div className={styles.dialogBody}><p className={styles.price}>{money(selected.price)} đ <small>/ tháng</small></p><dl className={styles.detailFacts}><div><dt>Địa chỉ</dt><dd>{selected.address || "Chưa cập nhật"}</dd></div><div><dt>Diện tích</dt><dd>{selected.area != null ? `${selected.area} m²` : "Chưa cập nhật"}</dd></div><div><dt>Tầng</dt><dd>{selected.floor != null ? (selected.floor === 0 ? "Tầng trệt" : `Tầng ${selected.floor}`) : "Chưa cập nhật"}</dd></div><div><dt>Trạng thái</dt><dd>{selected.status === "AVAILABLE" ? "Còn trống" : selected.status === "OCCUPIED" ? "Đang thuê" : "Bảo trì"}</dd></div></dl><h3>Mô tả phòng</h3><p className={styles.fullDescription}>{selected.description || "Chủ trọ chưa cập nhật mô tả cho phòng này."}</p><RentRoomAction key={selected.id} room={selected}/></div></>}
    </dialog>
  </section>;
}
