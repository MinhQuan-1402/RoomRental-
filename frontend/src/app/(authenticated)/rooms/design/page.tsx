"use client";

import { useRouter } from "next/navigation";
import { RoomsGrid, MOCK_ROOMS, type RoomCardData } from "@/components/rooms/RoomsGrid";

export default function RoomsDesignPage() {
  const router = useRouter();

  const handlePrimary = (room: RoomCardData) => {
    console.log("[Primary action]", room.id, room.status);
    if (room.status === "AVAILABLE") {
      alert(`Tạo hợp đồng cho phòng ${room.roomNumber}`);
    } else if (room.status === "OCCUPIED") {
      alert(`Gửi nhắc phí cho khách phòng ${room.roomNumber}`);
    } else if (room.status === "LEAVING_SOON") {
      alert(`Nghiệm thu phòng ${room.roomNumber}`);
    } else {
      alert(`Xem chi tiết bảo trì phòng ${room.roomNumber}`);
    }
  };

  const handleView = (room: RoomCardData) => {
    console.log("[View]", room.id);
    alert(`Xem chi tiết phòng ${room.roomNumber}`);
  };

  const handleMore = (room: RoomCardData) => {
    console.log("[More]", room.id);
    alert(`Menu thêm cho phòng ${room.roomNumber}`);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold text-slate-900 m-0 mb-1">
            Quản lý phòng trọ
          </h1>
          <p className="text-[13px] text-slate-500 m-0">
            Thiết kế mới — dạng lưới với 4 trạng thái phòng (Tailwind CSS)
          </p>
        </div>
        <button
          onClick={() => router.push("/rooms")}
          className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-[13px] font-medium hover:bg-slate-50 transition-colors cursor-pointer"
        >
          ← Quay lại danh sách cũ
        </button>
      </header>

      <RoomsGrid
        rooms={MOCK_ROOMS}
        onPrimary={handlePrimary}
        onView={handleView}
        onMore={handleMore}
      />
    </div>
  );
}
