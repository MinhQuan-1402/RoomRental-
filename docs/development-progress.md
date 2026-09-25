# Development Progress Tracker

**Project:** Rental Management System  
**Architecture:** Modular Monolith (Express.js + TypeScript + MySQL + Prisma + Next.js)
**Current Phase:** Frontend Shell (Phase 0) — Complete. Next: Phase 1 Properties Module

---

## Progress Overview

| Task | Title | Status | Completion Date | Artifacts / Deliverables |
| :--- | :--- | :---: | :--- | :--- |
| **Task 1** | PRD Analysis & Workspace Inspection | ✅ Completed | 2026-09-08 | `productsRequirements.md` analysis |
| **Task 2** | User Stories, RBAC Matrix & Acceptance Criteria | ✅ Completed | 2026-09-08 | Acceptance Criteria & State Transitions |
| **Task 3** | MongoDB Database Schema Design | ✅ Completed | 2026-09-08 | Schema design, indexes, and ACID transactions |
| **Task 4** | RESTful API Specification Design | ✅ Completed | 2026-09-09 | `docs/api-specification.md` |
| **Task 5** | Backend Foundation Implementation | ✅ Completed | 2026-09-09 | Express + TS + Mongoose Foundation |
| **Task 6** | Authentication & Authorization Module | ✅ Completed | 2026-09-09 | JWT Auth, RBAC (`OWNER`/`TENANT`), Repositories |
| **Phase 0** | Frontend Shell — Layout, Auth Context, Route Groups | ✅ Completed | 2026-09-21 | Sidebar nav, AuthGuard, AuthContext, Shell pages |
| **Phase 1** | Property & Room Management Module | ⏳ Pending | — | In queue |

---

## Task 5: Backend Foundation Implementation Details

### 1. Overview
Đã hoàn thành thiết lập nền tảng backend (Backend Foundation) cho hệ thống Rental Management System theo mô hình Modular Monolith, đảm bảo khả năng mở rộng sạch sẽ cho các module nghiệp vụ tiếp theo.

### 2. File & Folder Structure Created
```text
backend/
├── src/
│   ├── config/
│   │   ├── db.ts                     # Mongoose connection & disconnect logic
│   │   └── env.ts                    # Zod environment variable validation
│   ├── middlewares/
│   │   ├── error.middleware.ts       # Global error handler (AppError, ZodError, standard JSON)
│   │   └── not-found.middleware.ts   # 404 Route not found handler
│   ├── modules/                      # Modular Monolith module placeholders
│   │   ├── ai/
│   │   ├── auth/
│   │   ├── contracts/
│   │   ├── invoices/
│   │   ├── maintenance/
│   │   ├── notifications/
│   │   ├── payments/
│   │   ├── properties/
│   │   ├── rooms/
│   │   ├── tenants/
│   │   ├── users/
│   │   └── utilities/
│   ├── routes/
│   │   └── index.ts                  # Central API router (/api/health)
│   ├── utils/
│   │   ├── app-error.ts              # Operational AppError class
│   │   └── response.ts               # Standard API response helpers
│   ├── app.ts                        # Express configuration, helmet, cors, parsers
│   └── server.ts                     # Server bootstrap & graceful shutdown
├── tests/
│   └── foundation.test.ts            # Verification test suite for foundation
├── .env                              # Local environment variables
├── .env.example                      # Environment variables template
├── .gitignore                        # Git exclusion rules
├── package.json                      # Dependencies & scripts (dev, build, start)
└── tsconfig.json                     # Strict TypeScript compiler options
```

---

## Task 6: Authentication & Authorization Details

### 1. Overview
Đã hoàn thành triển khai phân hệ **Authentication & Authorization** theo mô hình Modular Monolith:
* Định nghĩa User Schema với các vai trò được kiểm soát nghiêm ngặt: `OWNER` và `TENANT`.
* Phân tách tầng kiến trúc rõ ràng: `Model -> Repository -> Service -> Controller -> Routes`.
* Xác thực Stateless JWT với cặp Access Token (15m) & Refresh Token (7d) độc lập secret.
* Hệ thống Middleware: `authMiddleware` xác thực Bearer token và `authorizeRoles` phân quyền RBAC.

### 2. Files Created & Modified
* `src/modules/users/user.types.ts`: Interface `IUser`, `UserRole` (`'OWNER' | 'TENANT'`), `UserResponse`.
* `src/modules/users/user.model.ts`: Mongoose model cho User, áp dụng `toJSON` transform xóa bỏ triệt để `passwordHash` và `refreshToken` khỏi mọi output JSON.
* `src/modules/users/user.repository.ts`: Lớp truy cập cơ sở dữ liệu `UserRepository` (CRUD, findByEmail, updateRefreshToken, updateStatus).
* `src/modules/auth/auth.types.ts`: DTOs `RegisterDTO`, `LoginDTO`, `RefreshDTO`, `AuthTokens`, `JWTPayload`, `AuthResponse`.
* `src/modules/auth/auth.validation.ts`: Zod validation schemas (`registerSchema`, `loginSchema`, `refreshTokenSchema`).
* `src/modules/auth/auth.service.ts`: Xử lý toàn bộ business logic (hash password bcrypt, so sánh hash, sinh token JWT, thu hồi token khi logout).
* `src/modules/auth/auth.controller.ts`: Xử lý HTTP request/response, parse Zod validation và invoke service.
* `src/modules/auth/auth.routes.ts`: Định tuyến các endpoint của Auth module.
* `src/middlewares/auth.middleware.ts`: Middleware xác thực Bearer Token, kiểm tra hết hạn, gắn `req.user`.
* `src/middlewares/role.middleware.ts`: Middleware `authorizeRoles(...roles)` chặn 403 `FORBIDDEN` nếu sai role.
* `src/types/express.d.ts`: Khai báo kiểu TypeScript toàn cục cho `Express.Request.user`.
* `src/routes/index.ts`: Gắn `authRouter` tại `/api/auth` và endpoint test role `/api/test/owner-only`.
* `src/config/env.ts`: Validate nghiêm ngặt các biến môi trường `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`.
* `tests/auth.test.ts`: Test suite tự động kiểm thử toàn bộ 17 kịch bản xác thực và phân quyền.

### 3. APIs Implemented
* `POST /api/auth/register`: Đăng ký tài khoản (`OWNER` hoặc `TENANT`), tự động băm mật khẩu, trả về user info an toàn.
* `POST /api/auth/login`: Đăng nhập, kiểm tra tài khoản `isActive`, so khớp bcrypt, trả về user info + Access & Refresh Tokens.
* `POST /api/auth/refresh`: Nhận Refresh Token, xác thực token hợp lệ và cấp mới Access Token.
* `POST /api/auth/logout`: Yêu cầu đăng nhập, thu hồi và xóa Refresh Token trong DB.
* `GET /api/auth/me`: Yêu cầu đăng nhập, trả về thông tin người dùng hiện tại từ context xác thực.

### 4. Security Decisions
* **Không bao giờ lưu mật khẩu dạng rõ:** Mật khẩu được băm bằng `bcryptjs` với salt rounds = 10.
* **Không rò rỉ hash mật khẩu:** `passwordHash` được loại bỏ hoàn toàn trong schema transform `toJSON` và trong tầng Service.
* **Secret Token độc lập:** `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` là 2 chuỗi bí mật hoàn toàn tách biệt.
* **Bảo vệ tài khoản khóa:** Người dùng có `isActive: false` sẽ bị từ chối đăng nhập và làm mới token (HTTP 403 `ACCOUNT_LOCKED`).
* **Đăng nhập an toàn:** Thông báo lỗi chung `INVALID_CREDENTIALS` (401) khi sai email hoặc sai mật khẩu để tránh rò rỉ danh tính người dùng.
* **Thu hồi Token khi Đăng xuất:** Refresh token được gán về `null` trong database khi người dùng gọi `/logout`.

### 5. Test Suite Results (`tests/auth.test.ts`)
Toàn bộ 17/17 test cases đều vượt qua thành công:
1. ✅ Register thành công (OWNER).
2. ✅ Register với email đã tồn tại $\rightarrow$ 409 `EMAIL_ALREADY_EXISTS`.
3. ✅ Register với input không hợp lệ (sai định dạng email, password ngắn, sai role) $\rightarrow$ 422 `VALIDATION_ERROR`.
4. ✅ Mật khẩu trong DB là bcrypt hash, không lưu plain text.
5. ✅ Login thành công, nhận cặp Access Token và Refresh Token.
6. ✅ Login sai password $\rightarrow$ 401 `INVALID_CREDENTIALS`.
7. ✅ Login với user không tồn tại $\rightarrow$ 401 `INVALID_CREDENTIALS`.
8. ✅ Access token hợp lệ $\rightarrow$ 200 OK.
9. ✅ Access token sai định dạng $\rightarrow$ 401 `INVALID_TOKEN`.
10. ✅ Access token hết hạn $\rightarrow$ 401 `TOKEN_EXPIRED`.
11. ✅ Refresh token hợp lệ $\rightarrow$ cấp Access Token mới thành công.
12. ✅ Refresh token giả mạo / sai lệch $\rightarrow$ 401 `INVALID_TOKEN`.
13. ✅ Request yêu cầu auth nhưng không có token $\rightarrow$ 401 `UNAUTHORIZED`.
14. ✅ OWNER truy cập route yêu cầu OWNER $\rightarrow$ 200 OK (`Owner access granted`).
15. ✅ TENANT truy cập route yêu cầu OWNER $\rightarrow$ 403 `FORBIDDEN`.
16. ✅ `/api/auth/me` trả về đúng thông tin user của token context.
17. ✅ Logout thành công $\rightarrow$ refresh token cũ bị thu hồi không thể tái sử dụng.
