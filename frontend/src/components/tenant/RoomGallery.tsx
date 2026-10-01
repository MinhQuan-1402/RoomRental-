"use client";

import { useState } from "react";
import styles from "./TenantDashboard.module.css";

export default function RoomGallery({ images, roomNumber }: { images: { url: string }[]; roomNumber: string }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const count = images.length;
  const move = (step: number) => setIndex(current => (current + step + count) % count);

  if (!count) return <div className={styles.galleryEmpty}>Chủ trọ chưa cập nhật hình ảnh phòng.</div>;

  return <section className={styles.gallery} aria-label={`Hình ảnh phòng ${roomNumber}`} onKeyDown={event => {
    if (count < 2) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  }}>
    <div className={styles.galleryStage}>
      {failed[index] ? <p className={styles.galleryEmpty}>Không tải được ảnh này. Bạn có thể chọn ảnh khác.</p> : <img key={index} src={images[index].url} alt={`Phòng ${roomNumber} — ảnh ${index + 1} trong ${count}`} onError={() => setFailed(previous => ({ ...previous, [index]: true }))}/>}
      {count > 1 && <><button type="button" className={styles.previousImage} aria-label="Ảnh trước" onClick={() => move(-1)}>‹</button><button type="button" className={styles.nextImage} aria-label="Ảnh tiếp theo" onClick={() => move(1)}>›</button></>}
      <span className={styles.imageCounter} aria-live="polite">{index + 1} / {count} ảnh</span>
    </div>
    {count > 1 && <div className={styles.thumbnails}>{images.map((image, imageIndex) => <button key={`${image.url}-${imageIndex}`} type="button" aria-label={`Xem ảnh ${imageIndex + 1} của phòng ${roomNumber}`} aria-pressed={index === imageIndex} onClick={() => setIndex(imageIndex)}>
      {failed[imageIndex] ? <span>Ảnh {imageIndex + 1}</span> : <img src={image.url} alt="" loading="lazy" onError={() => setFailed(previous => ({ ...previous, [imageIndex]: true }))}/>}
    </button>)}</div>}
  </section>;
}
