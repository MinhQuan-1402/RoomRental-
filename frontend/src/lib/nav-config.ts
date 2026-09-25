// Role-based navigation config — dùng cho sidebar trong AuthenticatedLayout

export const LANDLORD_NAV = [
  { label: "Tổng quan", href: "/dashboard", icon: "dashboard" },
  { label: "Phòng trọ", href: "/rooms", icon: "door" },
  { label: "Người thuê", href: "/tenants", icon: "users" },
  { label: "Hợp đồng", href: "/contracts", icon: "file" },
  { label: "Hóa đơn", href: "/invoices", icon: "invoice" },
  { label: "Thanh toán", href: "/payments", icon: "wallet" },
] as const;

export const TENANT_NAV = [
  { label: "Tổng quan", href: "/dashboard", icon: "dashboard" },
  { label: "Hợp đồng của tôi", href: "/my-contract", icon: "file" },
  { label: "Hóa đơn của tôi", href: "/my-invoices", icon: "invoice" },
] as const;
