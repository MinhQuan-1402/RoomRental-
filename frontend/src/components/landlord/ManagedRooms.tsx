"use client";
import { useState } from "react";
import type { RoomListItem } from "@/types/room";
import s from "./Management.module.css";

const labels = { AVAILABLE: "Còn trống", OCCUPIED: "Đang thuê", MAINTENANCE: "Bảo trì" };
export default function ManagedRooms({ rooms, onEdit, onDelete }: { rooms: RoomListItem[]; onEdit: (room: RoomListItem) => void; onDelete: (room: RoomListItem) => void }) {
  return <div className={s.grid}>{rooms.map(room => <article className={s.card} key={room.id}>
    <Cover room={room}/><div className={s.body}><h2>Phòng {room.roomNumber}</h2><p className={s.address}>{room.address || "Chưa cập nhật địa chỉ"}</p><div className={s.facts}>{room.area != null && <span>{room.area} m²</span>}{room.floor != null && <span>{room.floor === 0 ? "Tầng trệt" : `Tầng ${room.floor}`}</span>}<span>{room.images?.length ?? 0} ảnh</span></div><p className={s.price}><strong>{new Intl.NumberFormat("vi-VN").format(room.price)} đ</strong><span>/ tháng</span></p><div className={s.actions}><button onClick={() => onEdit(room)} aria-label={`Chỉnh sửa phòng ${room.roomNumber}`}>Chi tiết & chỉnh sửa ↗</button><button onClick={() => onDelete(room)} aria-label={`Xóa phòng ${room.roomNumber}`}>Xóa</button></div></div>
  </article>)}</div>;
}
function Cover({ room }: { room: RoomListItem }) {
  const [failed, setFailed] = useState(false);
  return <div className={s.cover}>{room.images?.[0]?.url && !failed ? <img src={room.images[0].url} alt={`Phòng ${room.roomNumber}`} loading="lazy" onError={() => setFailed(true)}/> : <div className={s.placeholder}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></svg><span>Chưa có hình ảnh phòng</span></div>}<span className={s.badge}>{labels[room.status]}</span></div>;
}
