/**
 * RoomRental — Design System
 * Cập nhật lần cuối: 2026-09-17
 *
 * Tone màu thương hiệu: Deep Emerald Teal
 * Đại diện: sự bền vững, minh bạch tài chính, tin cậy trong ngành bất động sản.
 *
 * → Mọi file mới trong dự án phải tuân thủ bảng màu & thang giá trị dưới đây.
 * → Token được export trong `design-tokens.css` dưới dạng CSS variables,
 *   sử dụng trong inline styles qua `var(--token-name)`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. BRAND COLORS — Màu thương hiệu & điểm nhấn chính
// ─────────────────────────────────────────────────────────────────────────────
brand.primary          = "#0F766E"  // teal-700 — nút CTA, active nav, logo
brand.primaryHover     = "#115E59"  // teal-800 — hover/active state
brand.primaryActive    = "#134E4A"  // teal-900 — pressed state
brand.primaryTint      = "#5EEAD4"  // teal-300 — điểm nhấn, accent nhẹ
brand.primarySoft      = "#CCFBF1"  // teal-100 — nền highlight card
brand.primarySofter    = "#F0FDFA"  // teal-50  — nền section rất nhẹ

// ─────────────────────────────────────────────────────────────────────────────
// 2. CANVAS & SURFACES — Nền tổng thể & thẻ
// ─────────────────────────────────────────────────────────────────────────────
surface.canvas         = "#F8FAFC"  // slate-50   — app background
surface.canvasAlt      = "#FAF8FF"  // rất nhẹ tím-xanh — alt option
surface.card           = "#FFFFFF"  // trắng thuần — nền thẻ
surface.cardMuted      = "#F1F5F9"  // slate-100  — card phụ / hover row
surface.overlay        = "rgba(15, 23, 42, 0.6)"  // slate-900/60 — modal overlay

// ─────────────────────────────────────────────────────────────────────────────
// 3. BORDERS — Viền & phân chia
// ─────────────────────────────────────────────────────────────────────────────
border.default         = "#E2E8F0"  // slate-200
border.strong          = "#CBD5E1"  // slate-300
border.subtle          = "#F1F5F9"  // slate-100

// ─────────────────────────────────────────────────────────────────────────────
// 4. TYPOGRAPHY — Màu văn bản & phân cấp thị giác
// ─────────────────────────────────────────────────────────────────────────────
text.heading           = "#0F172A"  // slate-900 — tiêu đề chính
text.body              = "#334155"  // slate-700 — nội dung
text.label             = "#64748B"  // slate-500 — nhãn, phụ
text.disabled          = "#94A3B8"  // slate-400
text.inverse           = "#FFFFFF"  // chữ trên nền primary
text.link              = "#0F766E"  // = primary — liên kết

// ─────────────────────────────────────────────────────────────────────────────
// 5. SEMANTIC STATUS — Màu trạng thái chức năng
// ─────────────────────────────────────────────────────────────────────────────
// Phòng trống / Đã thanh toán / Active
status.success         = "#059669"  // emerald-600
status.successSoft     = "#D1FAE5"  // emerald-100 — bg
status.successBorder   = "#A7F3D0"  // emerald-200

// Phòng đang thuê / Info
status.info            = "#0284C7"  // sky-600
status.infoSoft        = "#E0F2FE"  // sky-100
status.infoBorder      = "#BAE6FD"  // sky-200

// Bảo trì / Chờ thanh toán / Pending
status.warning         = "#D97706"  // amber-600
status.warningSoft     = "#FEF3C7"  // amber-100
status.warningBorder   = "#FDE68A"  // amber-200

// Quá hạn / Destructive
status.danger          = "#DC2626"  // red-600
status.dangerSoft      = "#FEE2E2"  // red-100
status.dangerBorder    = "#FECACA"  // red-200

// ─────────────────────────────────────────────────────────────────────────────
// 6. RADIUS — Bo góc
// ─────────────────────────────────────────────────────────────────────────────
radius.sm              = "6px"      // badge, chip
radius.md              = "10px"     // input, button, tab
radius.lg              = "14px"     // card nhỏ
radius.xl              = "16px"     // card chính
radius["2xl"]          = "20px"     // modal
radius.full            = "9999px"   // pill

// ─────────────────────────────────────────────────────────────────────────────
// 7. SHADOW — Đổ bóng
// ─────────────────────────────────────────────────────────────────────────────
shadow.xs              = "0 1px 2px rgba(15, 23, 42, 0.04)"
shadow.sm              = "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)"
shadow.md              = "0 4px 6px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)"
shadow.lg              = "0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.04)"
shadow.focus           = "0 0 0 3px rgba(15, 118, 110, 0.15)"  // teal focus ring

// ─────────────────────────────────────────────────────────────────────────────
// 8. SPACING — Thang khoảng cách (đa bội 4px)
// ─────────────────────────────────────────────────────────────────────────────
//      1 = 4px,  2 = 8px,  3 = 12px, 4 = 16px, 5 = 20px, 6 = 24px,
//      8 = 32px, 10 = 40px, 12 = 48px, 16 = 64px
space.xs               = "4px"
space.sm               = "8px"
space.md               = "12px"
space.base             = "16px"
space.lg               = "20px"
space.xl               = "24px"
space["2xl"]           = "32px"
space["3xl"]           = "40px"

// ─────────────────────────────────────────────────────────────────────────────
// 9. TYPOGRAPHY SCALE
// ─────────────────────────────────────────────────────────────────────────────
// Font chính: 'Inter' (đã load trong layout.tsx)
typeScale.display.fontSize       = "32px"
typeScale.display.fontWeight     = 700
typeScale.display.lineHeight    = 1.2

typeScale.h1.fontSize           = "26px"
typeScale.h1.fontWeight         = 700
typeScale.h1.lineHeight         = 1.2

typeScale.h2.fontSize           = "20px"
typeScale.h2.fontWeight         = 600
typeScale.h2.lineHeight         = 1.3

typeScale.h3.fontSize           = "17px"
typeScale.h3.fontWeight         = 600
typeScale.h3.lineHeight         = 1.4

typeScale.body.fontSize         = "14px"
typeScale.body.fontWeight       = 400
typeScale.body.lineHeight       = 1.5

typeScale.label.fontSize        = "13px"
typeScale.label.fontWeight      = 500
typeScale.label.lineHeight      = 1.4

typeScale.caption.fontSize      = "12px"
typeScale.caption.fontWeight    = 400
typeScale.caption.lineHeight    = 1.4

// ─────────────────────────────────────────────────────────────────────────────
// 10. USAGE NOTES — Quy tắc sử dụng
// ─────────────────────────────────────────────────────────────────────────────
- Primary CTA (Thanh toán ngay, Tạo tài khoản, Thêm mới) → `var(--brand-primary)` nền, chữ trắng
- Secondary action → `var(--surface-card)` nền, `var(--border-default)` viền, chữ body
- Destructive (Xóa, Hủy) → `var(--status-danger)` nền
- Input focus ring → `box-shadow: var(--shadow-focus)`
- Badge trạng thái:
    Phòng trống/Đã TT   → bg successSoft,  chữ success,  icon ●
    Đang thuê           → bg infoSoft,     chữ info,     icon ●
    Bảo trì/Chờ TT     → bg warningSoft,  chữ warning,  icon ●
    Quá hạn             → bg dangerSoft,   chữ danger,   icon ●
- Hover row table: `var(--surface-cardMuted)`
- Logo / brand mark: dùng `var(--brand-primary)` cho shape, không phải đen
- Tránh dùng blue (#2563EB) hoặc indigo — đã thay bằng teal
*/
