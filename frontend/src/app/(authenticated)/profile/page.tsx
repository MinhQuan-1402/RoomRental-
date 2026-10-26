"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AppIcon from "@/components/ui/AppIcon";
import AvatarUploader from "@/components/profile/AvatarUploader";
import s from "./profile.module.css";

function date(value?: string) {
  if (!value) return "Chưa cập nhật";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Chưa cập nhật" : parsed.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p className={s.loading} role="status">Đang tải hồ sơ...</p>;
  if (!user) return null;
  const landlord = user.role === "LANDLORD";
  const role = landlord ? "Chủ nhà" : "Người thuê";
  const provider = user.authProvider === "GOOGLE" ? "Tài khoản Google" : user.authProvider === "LOCAL" ? "Email và mật khẩu" : "Chưa cập nhật";
  return <div className={s.page}>
    <header className={s.heading}><div><p className={s.eyebrow}>TÀI KHOẢN CỦA BẠN</p><h1>Hồ sơ của tôi</h1><p>Thông tin cá nhân và tài khoản RoomRental của bạn.</p></div><Link className={s.back} href="/dashboard">Về tổng quan<AppIcon name="arrow" size={16}/></Link></header>
    <section className={s.hero} aria-label="Thông tin người dùng"><div className={s.heroIdentity}><AvatarUploader/><div className={s.identity}><span className={s.role}><AppIcon name={landlord ? "home" : "users"} size={14}/>{role}</span><h2>{user.fullName || "Chưa cập nhật họ tên"}</h2><p>{user.email}</p></div></div><div className={s.member}><span>Thành viên từ</span><strong>{date(user.createdAt)}</strong></div></section>
    <div className={s.grid}>
      <section className={s.panel} aria-labelledby="personal-info"><div className={s.panelHeading}><span className={s.icon}><AppIcon name="users"/></span><div><h2 id="personal-info">Thông tin cá nhân</h2><p>Thông tin được lưu trên tài khoản của bạn.</p></div></div><dl className={s.fields}><div><dt>Họ và tên</dt><dd>{user.fullName?.trim() || "Chưa cập nhật"}</dd></div><div><dt>Địa chỉ email</dt><dd>{user.email || "Chưa cập nhật"}</dd></div><div><dt>Số điện thoại</dt><dd className={!user.phone?.trim() ? s.missing : undefined}>{user.phone?.trim() || "Chưa cập nhật"}</dd></div><div><dt>Vai trò</dt><dd><span className={s.roleTag}>{role}</span></dd></div></dl></section>
      <section className={s.panel} aria-labelledby="account-info"><div className={s.panelHeading}><span className={s.icon}><AppIcon name="key"/></span><div><h2 id="account-info">Thông tin tài khoản</h2><p>Phương thức đăng nhập và trạng thái sử dụng.</p></div></div><dl className={s.accountFields}><div><dt>Phương thức đăng nhập</dt><dd>{provider}</dd></div><div><dt>Trạng thái tài khoản</dt><dd>{user.isActive === undefined ? "Chưa xác định" : <span className={user.isActive ? s.active : s.inactive}><i/>{user.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}</span>}</dd></div><div><dt>Ngày tham gia</dt><dd>{date(user.createdAt)}</dd></div><div><dt>Cập nhật gần nhất</dt><dd>{date(user.updatedAt)}</dd></div></dl></section>
      <section className={s.workspace}><div><span className={s.workspaceIcon}><AppIcon name={landlord ? "building" : "door"} size={26}/></span><h2>{landlord ? "Không gian chủ nhà" : "Không gian người thuê"}</h2><p>{landlord ? "Tiếp tục quản lý phòng, hợp đồng và hóa đơn trong không gian của bạn." : "Theo dõi hợp đồng thuê và các hóa đơn của bạn tại một nơi."}</p></div><div className={s.shortcuts}><Link href={landlord ? "/rooms" : "/my-contract"}>{landlord ? "Quản lý phòng trọ" : "Hợp đồng của tôi"}<AppIcon name="arrow" size={16}/></Link><Link href={landlord ? "/invoices" : "/my-invoices"}>{landlord ? "Xem hóa đơn" : "Hóa đơn của tôi"}<AppIcon name="arrow" size={16}/></Link></div></section>
    </div>
  </div>;
}
