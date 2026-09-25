"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LANDLORD_NAV, TENANT_NAV } from "@/lib/nav-config";

// ─── Icons ──────────────────────────────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}
function IconDoor() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
      <circle cx="15" cy="12" r="1" />
      <path d="M10 4v16" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconInvoice() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14l-5-5 5-5" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="9" fill="#0F766E" />
      <path d="M8 24V16L18 9L28 16V24H22V19H14V24H8Z" fill="white" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── Nav icon map ──────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <IconDashboard />,
  building: <IconBuilding />,
  door: <IconDoor />,
  users: <IconUsers />,
  file: <IconFile />,
  invoice: <IconInvoice />,
  wallet: <IconWallet />,
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = user?.role === "LANDLORD" ? LANDLORD_NAV : TENANT_NAV;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/auth");
  }

  return (
    <div style={styles.root}>
      {/* Mobile overlay */}
      {sidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        ...styles.sidebar,
        transform: sidebarOpen ? "translateX(0)" : undefined,
      }}>
        {/* Logo */}
        <div style={styles.sidebarLogo}>
          <Link href="/dashboard" style={styles.logoLink} onClick={() => setSidebarOpen(false)}>
            <IconLogo />
            <span style={styles.logoText}>RoomRental</span>
          </Link>
          <button
            style={styles.mobileClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <IconClose />
          </button>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          <p style={styles.navSection}>Menu</p>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : {}),
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <span style={styles.navIcon}>{ICON_MAP[item.icon]}</span>
                <span style={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={styles.sidebarFooter}>
          <div style={styles.roleTag}>
            <span style={styles.roleDot} />
            <span style={styles.roleText}>
              {user?.role === "LANDLORD" ? "Chủ nhà" : "Người thuê"}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          {/* Mobile menu button */}
          <button
            style={styles.menuBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <IconMenu />
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Right side */}
          <div style={styles.headerRight}>
            {/* Notification bell */}
            <button style={styles.iconBtn} aria-label="Thông báo">
              <IconBell />
              <span style={styles.notifDot} />
            </button>

            {/* User menu */}
            <div style={styles.userMenuWrap}>
              <button
                style={styles.userBtn}
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
              >
                <div style={styles.avatar}>
                  {user?.fullName.charAt(0).toUpperCase()}
                </div>
                <div style={styles.userInfo}>
                  <span style={styles.userName}>{user?.fullName}</span>
                  <span style={styles.userRole}>
                    {user?.role === "LANDLORD" ? "Chủ nhà" : "Người thuê"}
                  </span>
                </div>
                <IconChevron />
              </button>

              {userMenuOpen && (
                <div style={styles.dropdown}>
                  <button
                    style={styles.dropdownItem}
                    onClick={() => { setUserMenuOpen(false); router.push("/welcome"); }}
                  >
                    <IconUsers />
                    <span>Tài khoản của tôi</span>
                  </button>
                  <div style={styles.dropdownDivider} />
                  <button
                    style={{ ...styles.dropdownItem, ...styles.dropdownDanger }}
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    disabled={loggingOut}
                  >
                    <IconLogout />
                    <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  primary: "var(--brand-primary)",
  primaryHover: "var(--brand-primary-hover)",
  primarySoft: "var(--brand-primary-soft)",
  canvas: "var(--surface-canvas)",
  card: "var(--surface-card)",
  border: "var(--border-default)",
  textHead: "var(--text-heading)",
  textBody: "var(--text-body)",
  textLabel: "var(--text-label)",
  textInverse: "var(--text-inverse)",
  shadow: "var(--shadow-md)",
  focus: "var(--shadow-focus)",
  danger: "var(--status-danger)",
  dangerSoft: "var(--status-danger-soft)",
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: C.canvas,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: C.canvas,
    opacity: 0.6,
    zIndex: 40,
  },

  // Sidebar
  sidebar: {
    width: 248,
    flexShrink: 0,
    backgroundColor: C.card,
    borderRight: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
    zIndex: 50,
  },
  sidebarLogo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 16px 16px",
    borderBottom: `1px solid ${C.border}`,
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: C.textHead,
    letterSpacing: "-0.3px",
  },
  mobileClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: C.textLabel,
    padding: 4,
    display: "none",
  },
  nav: {
    flex: 1,
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    overflowY: "auto",
  },
  navSection: {
    fontSize: 11,
    fontWeight: 600,
    color: C.textLabel,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    padding: "8px 8px 4px",
    margin: 0,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: C.textBody,
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.15s",
    cursor: "pointer",
  },
  navItemActive: {
    backgroundColor: C.primarySoft,
    color: C.primary,
    fontWeight: 600,
  },
  navIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  navLabel: {},
  sidebarFooter: {
    padding: "12px 16px 20px",
    borderTop: `1px solid ${C.border}`,
  },
  roleTag: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    backgroundColor: C.primarySoft,
    borderRadius: 6,
    width: "fit-content",
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: C.primary,
    flexShrink: 0,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 600,
    color: C.primary,
  },

  // Main
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  header: {
    height: 60,
    backgroundColor: C.card,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    gap: 16,
    position: "sticky",
    top: 0,
    zIndex: 30,
  },
  menuBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: C.textBody,
    padding: 6,
    borderRadius: 6,
    display: "none",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    position: "relative",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: C.textLabel,
    padding: 8,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    transition: "background-color 0.15s",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: C.danger,
    border: "2px solid white",
  },
  userMenuWrap: {
    position: "relative",
  },
  userBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "6px 10px 6px 6px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.primary,
    color: C.textInverse,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: C.textHead,
    lineHeight: 1.2,
  },
  userRole: {
    fontSize: 11,
    color: C.textLabel,
    lineHeight: 1.2,
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    boxShadow: C.shadow,
    minWidth: 200,
    overflow: "hidden",
    zIndex: 100,
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px 14px",
    background: "none",
    border: "none",
    fontSize: 14,
    color: C.textBody,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "background-color 0.15s",
  },
  dropdownDanger: {
    color: C.danger,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: C.border,
    margin: "4px 0",
  },
  content: {
    flex: 1,
    padding: "24px",
  },
};
