"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { uploadAvatar } from "@/lib/api/profile";
import UserAvatar from "@/components/ui/UserAvatar";
import s from "./AvatarUploader.module.css";

export default function AvatarUploader() {
  const { user, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected || uploadLock.current) return;
    setError(""); setMessage("");
    setFile(null); setPreview(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Vui lòng chọn ảnh JPEG, PNG hoặc WebP."); return;
    }
    if (selected.size === 0 || selected.size > 5 * 1024 * 1024) {
      setError("Vui lòng chọn ảnh có dung lượng từ 1 byte đến 5 MB."); return;
    }
    setFile(selected);
  }

  function cancel() { setFile(null); setPreview(null); setError(""); setMessage(""); }

  async function save() {
    if (!file || uploadLock.current) return;
    uploadLock.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const updated = await uploadAvatar(file);
      updateUser(updated);
      setFile(null); setPreview(null); setMessage("Đã cập nhật ảnh đại diện.");
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể tải ảnh. Vui lòng thử lại."); }
    finally { uploadLock.current = false; setSaving(false); }
  }

  return <div className={s.uploader} aria-busy={saving}>
    <UserAvatar className={s.avatar} name={user?.fullName} src={file && preview ? preview : user?.avatarUrl}/>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={saving} className={s.fileInput} tabIndex={-1} aria-label="Chọn ảnh đại diện"/>
    <button type="button" className={s.choose} onClick={() => inputRef.current?.click()} disabled={saving}>{file ? "Chọn ảnh khác" : "Đổi ảnh đại diện"}</button>
    <p className={s.hint}>JPEG, PNG, WebP · tối đa 5 MB</p>
    {file && <><p className={s.filename}>{file.name}</p><div className={s.actions}><button type="button" onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu ảnh"}</button><button type="button" onClick={cancel} disabled={saving}>Hủy</button></div></>}
    <div aria-live="polite" className={s.feedback}>{saving && <p>Đang tải ảnh lên...</p>}{message && <p>{message}</p>}</div>
    {error && <p className={s.error} role="alert">{error}</p>}
  </div>;
}
