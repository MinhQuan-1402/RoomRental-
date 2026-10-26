import type { CSSProperties, ReactNode } from "react";

export type IconName = "dashboard" | "building" | "door" | "users" | "file" | "invoice" | "wallet" | "menu" | "close" | "search" | "chevron" | "logout" | "home" | "arrow" | "plus" | "key" | "alert" | "grid" | "list";
const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  building: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3"/></>,
  door: <><path d="M4 21h16M7 21V4l10-2v19M7 4h12v17m-6-9h.01"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 2 4v3"/></>,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8m-8 4h5"/></>,
  invoice: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 7h6m-6 4h6m-6 4h3"/></>,
  wallet: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h3"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  chevron: <path d="m7 10 5 5 5-5"/>, logout: <><path d="M9 3H5v18h4m5-14 5 5-5 5m-5-5h11"/></>,
  home: <><path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/></>,
  arrow: <path d="M6 18 18 6M6 6h12v12"/>, plus: <path d="M12 5v14M5 12h14"/>,
  key: <><circle cx="8" cy="15" r="5"/><path d="m12 11 8-8m-4 4 3 3m-1-5 3 3"/></>,
  alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  list: <path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>,
};
export default function AppIcon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
