"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LANDLORD_NAV, TENANT_NAV } from "@/lib/nav-config";
import AppIcon, { type IconName } from "@/components/ui/AppIcon";
import UserAvatar from "@/components/ui/UserAvatar";
import s from "./AuthenticatedLayout.module.css";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const navItems = user?.role === "LANDLORD" ? LANDLORD_NAV : TENANT_NAV;
  const matchingPages = navItems.filter(item => item.label.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));

  useEffect(() => {
    function dismiss(e: PointerEvent) { if (!menuRef.current?.contains(e.target as Node)) setUserMenuOpen(false); }
    function escape(e: KeyboardEvent) { if (e.key === "Escape") { setSidebarOpen(false); setUserMenuOpen(false); setQuery(""); } }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const elements = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", trap); toggleRef.current?.focus(); };
  }, [sidebarOpen]);

  async function handleLogout() {
    setLoggingOut(true); setLogoutError("");
    try { await logout(); router.replace("/auth"); }
    catch { setLogoutError("Không thể đăng xuất. Vui lòng thử lại."); setLoggingOut(false); }
  }

  return <div className={s.root}>
    <a href="#page-content" className={s.skip}>Đến nội dung chính</a>
    {sidebarOpen && <button className={s.overlay} onClick={() => setSidebarOpen(false)} aria-label="Đóng menu điều hướng" tabIndex={-1}/>}
    <aside ref={sidebarRef} id="app-sidebar" className={`${s.sidebar} ${sidebarOpen ? s.open : ""}`} role={sidebarOpen ? "dialog" : undefined} aria-modal={sidebarOpen || undefined} aria-label="Điều hướng chính">
      <div className={s.brandRow}><Link href="/dashboard" className={s.brand} onClick={() => setSidebarOpen(false)}><span><AppIcon name="home" size={21}/></span>RoomRental</Link><button ref={closeRef} className={s.close} aria-label="Đóng menu" onClick={() => setSidebarOpen(false)}><AppIcon name="close"/></button></div>
      <p className={s.navLabel}>{user?.role === "LANDLORD" ? "QUẢN LÝ" : "KHÔNG GIAN CỦA BẠN"}</p>
      <nav className={s.nav}>{navItems.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return <Link key={item.href} href={item.href} className={`${s.navItem} ${active ? s.active : ""}`} aria-current={active ? "page" : undefined} onClick={() => setSidebarOpen(false)}><AppIcon name={item.icon as IconName} size={19}/>{item.label}</Link>;
      })}</nav>
      <div className={s.sidebarFoot}><span className={s.roleDot}/><span>{user?.role === "LANDLORD" ? "Không gian chủ nhà" : "Không gian người thuê"}</span><p>Quản lý dễ dàng. An tâm mỗi ngày.</p></div>
    </aside>
    <div className={s.main} inert={sidebarOpen || undefined}>
      <header className={s.header}>
        <button ref={toggleRef} className={s.menuButton} onClick={() => setSidebarOpen(true)} aria-label="Mở menu" aria-expanded={sidebarOpen} aria-controls="app-sidebar"><AppIcon name="menu"/></button>
        <div className={s.searchWrap}>
          <form className={s.search} role="search" onSubmit={e => { e.preventDefault(); if (matchingPages[0] && query.trim()) { router.push(matchingPages[0].href); setQuery(""); } }}><AppIcon name="search" size={18}/><input aria-label="Tìm trang quản lý" placeholder="Tìm nhanh trang quản lý..." value={query} onChange={e => setQuery(e.target.value)} onBlur={e => { if (!e.currentTarget.form?.parentElement?.contains(e.relatedTarget as Node)) setQuery(""); }}/></form>
          {query.trim() && <div className={s.searchResults}>{matchingPages.length ? matchingPages.map(item => <Link key={item.href} href={item.href} onClick={() => setQuery("")}><AppIcon name={item.icon as IconName}/>{item.label}<AppIcon name="arrow" size={14}/></Link>) : <p>Không tìm thấy trang phù hợp.</p>}</div>}
        </div>
        <div className={s.account} ref={menuRef}><button className={s.userButton} onClick={() => setUserMenuOpen(!userMenuOpen)} aria-label={`Tài khoản ${user?.fullName ?? "của tôi"}`} aria-expanded={userMenuOpen} aria-controls="account-menu"><UserAvatar className={s.avatar} name={user?.fullName} src={user?.avatarUrl}/><span className={s.userInfo}><strong>{user?.fullName}</strong><small>{user?.role === "LANDLORD" ? "Chủ nhà" : "Người thuê"}</small></span><AppIcon name="chevron" size={16}/></button>
          {userMenuOpen && <div className={s.dropdown} id="account-menu"><p>{user?.email}</p><Link href="/profile" onClick={() => setUserMenuOpen(false)}><AppIcon name="users" size={17}/>Hồ sơ của tôi</Link><button onClick={handleLogout} disabled={loggingOut}><AppIcon name="logout" size={17}/>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</button>{logoutError && <p role="alert">{logoutError}</p>}</div>}
        </div>
      </header>
      <main id="page-content" tabIndex={-1} className={s.content}>{children}</main>
    </div>
  </div>;
}
