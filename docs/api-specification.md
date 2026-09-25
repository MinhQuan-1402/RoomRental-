# RESTful API Specification (MVP)

**Project:** Rental Management System  
**Version:** 1.0 (MVP)  
**Status:** Approved Specification / Implementation Ready  
**Base URL:** `/api`  
**Protocol:** HTTPS / JSON  

---

## 1. API Overview

Tài liệu này định nghĩa chi tiết hợp đồng giao tiếp (API Contract) giữa:
* **Frontend:** Next.js (App Router, TanStack Query, React Hook Form, Zod)
* **Backend:** Node.js + Express.js + TypeScript (Modular Monolith)
* **Database:** MongoDB + Mongoose

Tất cả các endpoint tuân thủ kiến trúc RESTful, trả về dữ liệu chuẩn JSON, hỗ trợ xác thực qua JSON Web Token (JWT) và kiểm soát truy cập dựa trên vai trò (RBAC) kết hợp cô lập quyền sở hữu tài nguyên (Resource Ownership).

---

## 2. Base URL & Protocol

* **Base URL:** `/api`
* **Môi trường cục bộ:** `http://localhost:5000/api`
* **Content-Type:** `application/json` cho toàn bộ Request và Response body (ngoại trừ Webhook có thể có cấu trúc riêng).

---

## 3. Authentication (Xác thực)

Hệ thống sử dụng cơ chế **Bearer Token (JWT)**:
* **Access Token:** Thời hạn ngắn (15 - 60 phút), gửi trong header của mỗi HTTP request:
  ```http
  Authorization: Bearer <access_token>
  ```
* **Refresh Token:** Thời hạn dài (7 ngày), dùng để cấp phát mới Access Token khi hết hạn mà không bắt người dùng đăng nhập lại.
* **Payload tối thiểu của JWT Access Token:**
  ```json
  {
    "userId": "66d9f8c12a4b8c001f3e4a11",
    "role": "LANDLORD",
    "iat": 1725888000,
    "exp": 1725891600
  }
  ```
* **Nguyên tắc bảo mật:** Không lưu trữ mật khẩu hay thông tin nhạy cảm trong token. Mọi request cần xác thực phải đi qua middleware `authenticate`. Nếu token thiếu, hết hạn hoặc không hợp lệ, trả về HTTP `401 Unauthorized`.

---

## 4. Authorization & RBAC (Phân quyền)

Hệ thống hỗ trợ 3 vai trò (Roles):
1. `LANDLORD`: Quản lý tài sản, phòng, người thuê, hợp đồng, hóa đơn, nhận thanh toán và xem dashboard.
2. `TENANT`: Xem thông tin phòng đang thuê, hợp đồng, hóa đơn và thực hiện thanh toán trực tuyến.
3. `ADMIN`: Giám sát toàn hệ thống, quản lý tài khoản người dùng, xem logs. Không tự ý sửa đổi dữ liệu tài chính.

### Cơ chế kiểm tra quyền sở hữu (Ownership Guard):
* Với `LANDLORD`: Toàn bộ thao tác CRUD tài nguyên (`Property`, `Room`, `Tenant`, `Contract`, `Invoice`) bắt buộc phải gán và đối soát với:
  $$\text{landlordId} = \text{req.user.userId}$$
  Client **không được phép** tự gửi `landlordId` trong request body/query để quyết định quyền sở hữu.
* Với `TENANT`: Quyền truy cập giải quyết thông qua chuỗi:
  $$\text{req.user.userId} \rightarrow \text{Tenant.userId} \rightarrow \text{Contract (ACTIVE)} \rightarrow \text{Room / Invoice / Payment}$$

---

## 5. Common Request Format

Mọi payload gửi lên dưới dạng JSON object chuẩn.
* Ngày tháng: Định dạng chuẩn ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ` hoặc `YYYY-MM-DD`).
* Chuỗi ký tự (String): Được tự động trim khoảng trắng thừa đầu cuối.
* Email: Tự động chuyển thành chữ thường (lowercase).

---

## 6. Common Response Format

Toàn bộ response của API được chuẩn hóa thống nhất theo 2 định dạng:

### 6.1. Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Thao tác thành công"
}
```
*Đối với danh sách có phân trang:*
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Lấy danh sách thành công"
}
```

### 6.2. Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Mô tả lỗi dễ hiểu cho người dùng",
    "details": {}
  }
}
```

---

## 7. Error Handling & HTTP Status Codes

### 7.1. Danh mục HTTP Status Code sử dụng
* `200 OK`: Truy vấn, cập nhật thành công hoặc trả về kết quả xử lý.
* `201 Created`: Tạo mới tài nguyên thành công (`Property`, `Room`, `Contract`, `Invoice`,...).
* `204 No Content`: Xóa thành công, không cần trả về body.
* `400 Bad Request`: Lỗi cú pháp request, vi phạm nghiệp vụ (vd: số điện mới nhỏ hơn số cũ).
* `401 Unauthorized`: Chưa đăng nhập, token thiếu, không hợp lệ hoặc đã hết hạn.
* `403 Forbidden`: Đã đăng nhập nhưng không có quyền truy cập (sai Role hoặc không phải chủ sở hữu).
* `404 Not Found`: Không tìm thấy tài nguyên trong DB.
* `409 Conflict`: Xung đột dữ liệu (trùng email, trùng số phòng, phòng đã có hợp đồng active).
* `422 Unprocessable Entity`: Dữ liệu gửi lên không vượt qua validation (Zod schema).
* `500 Internal Server Error`: Lỗi hệ thống ngoài dự kiến.

### 7.2. Bảng mã lỗi chuẩn hóa (Standard Error Catalog)

| Error Code | HTTP Status | Mô tả |
| :--- | :---: | :--- |
| `VALIDATION_ERROR` | 422 | Dữ liệu đầu vào sai định dạng hoặc thiếu trường bắt buộc |
| `UNAUTHORIZED` | 401 | Thiếu token hoặc token không hợp lệ |
| `INVALID_CREDENTIALS` | 401 | Email hoặc mật khẩu không chính xác |
| `TOKEN_EXPIRED` | 401 | Access Token hoặc Refresh Token đã hết hạn |
| `FORBIDDEN` | 403 | Không có quyền thao tác trên tài nguyên này |
| `ACCOUNT_LOCKED` | 403 | Tài khoản đã bị khóa bởi Quản trị viên |
| `NOT_FOUND` | 404 | Tài nguyên không tồn tại |
| `EMAIL_ALREADY_EXISTS` | 409 | Email đã được sử dụng bởi người khác |
| `ROOM_NUMBER_EXISTS` | 409 | Số phòng đã tồn tại trong khu trọ này (BR-03) |
| `ACTIVE_CONTRACT_EXISTS` | 409 | Phòng hiện đã có một hợp đồng ACTIVE (BR-04) |
| `ROOM_NOT_AVAILABLE` | 400 | Phòng đang bảo trì hoặc đang có người ở, không thể tạo hợp đồng |
| `INVALID_UTILITY_READING` | 400 | Chỉ số mới nhỏ hơn chỉ số cũ (BR-12) |
| `INVOICE_ALREADY_PAID` | 400 | Hóa đơn đã được thanh toán, không thể hủy hoặc thanh toán lại |
| `PAYMENT_ALREADY_COMPLETED` | 400 | Giao dịch thanh toán này đã được xác nhận trước đó |
| `INVALID_WEBHOOK_SIGNATURE` | 400 | Chữ ký số từ cổng thanh toán không khớp |
| `DUPLICATE_WEBHOOK` | 200 | Webhook đã được xử lý thành công trước đó (Idempotency) |

---

## 8. Pagination, Filtering, Sorting (Quy chuẩn danh sách)

Các endpoint dạng danh sách (`GET`) hỗ trợ query params:
* `page`: Số trang hiện tại (Mặc định: `1`, min: `1`).
* `limit`: Số phần tử trên mỗi trang (Mặc định: `20`, min: `1`, max: `100`).
* `sort`: Trường sắp xếp và thứ tự (vd: `createdAt:desc`, `price:asc`).
* `search`: Từ khóa tìm kiếm theo tên, số điện thoại, mã hóa đơn.

---

## 9. Module 1: Authentication APIs

### 9.1. Đăng ký tài khoản (Register)
* **Method & Endpoint:** `POST /api/auth/register`
* **Auth Requirement:** Public
* **Allowed Roles:** Guest
* **Purpose:** Tạo tài khoản mới cho chủ trọ (`LANDLORD`) hoặc khách thuê (`TENANT`).
* **Request Body:**
  ```json
  {
    "email": "landlord@example.com",
    "password": "Password123@",
    "fullName": "Nguyễn Văn A",
    "phone": "0987654321",
    "role": "LANDLORD"
  }
  ```
* **Validation Rules:**
  * `email`: Bắt buộc, email hợp lệ.
  * `password`: Bắt buộc, tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số.
  * `fullName`: Bắt buộc, 2 - 100 ký tự.
  * `phone`: Bắt buộc, định dạng số điện thoại Việt Nam 10 chữ số.
  * `role`: Bắt buộc, chỉ chấp nhận `'LANDLORD'` hoặc `'TENANT'`. **Cấm truyền `'ADMIN'`**.
* **Business Rules:**
  * Mật khẩu băm bằng `bcrypt` trước khi lưu.
  * Email là duy nhất (không phân biệt hoa thường).
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "66d9f8c12a4b8c001f3e4a11",
      "email": "landlord@example.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0987654321",
      "role": "LANDLORD",
      "createdAt": "2026-09-09T08:00:00.000Z"
    },
    "message": "Đăng ký tài khoản thành công"
  }
  ```
* **Error Responses:**
  * `409 Conflict` (`EMAIL_ALREADY_EXISTS`): Email đã được đăng ký.
  * `422 Unprocessable Entity` (`VALIDATION_ERROR`): Sai định dạng hoặc thiếu trường.

---

### 9.2. Đăng nhập (Login)
* **Method & Endpoint:** `POST /api/auth/login`
* **Auth Requirement:** Public
* **Allowed Roles:** Guest
* **Purpose:** Xác thực tài khoản và cấp cặp token JWT.
* **Request Body:**
  ```json
  {
    "email": "landlord@example.com",
    "password": "Password123@"
  }
  ```
* **Validation Rules:**
  * `email`: Bắt buộc.
  * `password`: Bắt buộc.
* **Business Rules:**
  * So khớp mật khẩu với hash trong DB.
  * Kiểm tra tài khoản `isActive: true`.
  * Sinh Access Token và Refresh Token.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "66d9f8c12a4b8c001f3e4a11",
        "email": "landlord@example.com",
        "fullName": "Nguyễn Văn A",
        "role": "LANDLORD"
      },
      "tokens": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
      }
    },
    "message": "Đăng nhập thành công"
  }
  ```
* **Error Responses:**
  * `401 Unauthorized` (`INVALID_CREDENTIALS`): Sai email hoặc mật khẩu.
  * `403 Forbidden` (`ACCOUNT_LOCKED`): Tài khoản bị khóa.

---

### 9.3. Làm mới Access Token (Refresh Token)
* **Method & Endpoint:** `POST /api/auth/refresh`
* **Auth Requirement:** Public
* **Allowed Roles:** All
* **Purpose:** Cấp Access Token mới khi token cũ hết hạn.
* **Request Body:**
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
  ```
* **Validation Rules:** `refreshToken` bắt buộc.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    },
    "message": "Cấp mới access token thành công"
  }
  ```
* **Error Responses:** `401 Unauthorized` (`TOKEN_EXPIRED` hoặc `INVALID_TOKEN`).

---

### 9.4. Đăng xuất (Logout)
* **Method & Endpoint:** `POST /api/auth/logout`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD, TENANT, ADMIN
* **Purpose:** Hủy Refresh Token của phiên làm việc hiện tại.
* **Request Body:** Không có hoặc tùy chọn `refreshToken`.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": null,
    "message": "Đăng xuất thành công"
  }
  ```

---

### 9.5. Lấy thông tin tài khoản hiện tại (Get Current User)
* **Method & Endpoint:** `GET /api/auth/me`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD, TENANT, ADMIN
* **Purpose:** Lấy thông tin chi tiết của người dùng đang đăng nhập dựa trên token.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "66d9f8c12a4b8c001f3e4a11",
      "email": "landlord@example.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0987654321",
      "role": "LANDLORD",
      "createdAt": "2026-09-09T08:00:00.000Z"
    },
    "message": "Lấy thông tin người dùng thành công"
  }
  ```

---

## 10. Module 2: Users APIs

### 10.1. Danh sách người dùng hệ thống (Admin User Listing)
* **Method & Endpoint:** `GET /api/users`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** ADMIN
* **Query Parameters:** `page`, `limit`, `role`, `search` (theo tên, email, sđt), `isActive`.
* **Success Response (200 OK):** Trả về danh sách phân trang người dùng (loại trừ trường `password` và `refreshToken`).

### 10.2. Khóa / Mở khóa tài khoản (Toggle User Status)
* **Method & Endpoint:** `PATCH /api/users/:id/status`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** ADMIN
* **Request Body:** `{ "isActive": false }`
* **Success Response (200 OK):** Cập nhật trạng thái thành công.

---

## 11. Module 3: Properties APIs

### 11.1. Tạo mới khu trọ (Create Property)
* **Method & Endpoint:** `POST /api/properties`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Purpose:** Tạo khu trọ mới do Landlord hiện tại sở hữu.
* **Request Body:**
  ```json
  {
    "name": "Khu trọ Hạnh Phúc - Cơ sở 1",
    "address": "123 Đường Số 5, Phường Linh Trung, TP. Thủ Đức",
    "description": "Nhà trọ 3 tầng, có camera an ninh, giờ giấc tự do"
  }
  ```
* **Validation Rules:**
  * `name`: Bắt buộc, 2 - 150 ký tự.
  * `address`: Bắt buộc, 5 - 300 ký tự.
  * `description`: Tùy chọn, tối đa 1000 ký tự.
* **Ownership Rule:** Backend tự động gán `landlordId = req.user.userId`. Bỏ qua bất kỳ `landlordId` nào gửi trong body.
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "66d9f9a02a4b8c001f3e4b01",
      "landlordId": "66d9f8c12a4b8c001f3e4a11",
      "name": "Khu trọ Hạnh Phúc - Cơ sở 1",
      "address": "123 Đường Số 5, Phường Linh Trung, TP. Thủ Đức",
      "description": "Nhà trọ 3 tầng, có camera an ninh, giờ giấc tự do",
      "createdAt": "2026-09-09T08:15:00.000Z"
    },
    "message": "Tạo khu trọ thành công"
  }
  ```

---

### 11.2. Danh sách khu trọ của tôi (List My Properties)
* **Method & Endpoint:** `GET /api/properties`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Query Parameters:** `page`, `limit`, `search`
* **Ownership Rule:** Chỉ trả về các khu trọ có `landlordId === req.user.userId`.
* **Success Response (200 OK):** Trả về danh sách kèm số lượng thống kê phòng (`totalRooms`, `occupiedRooms`, `availableRooms`).

---

### 11.3. Chi tiết khu trọ (Get Property Detail)
* **Method & Endpoint:** `GET /api/properties/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Path Parameters:** `id` (ObjectId của Property)
* **Ownership Rule:** Trả về `404 Not Found` nếu Property không tồn tại hoặc không thuộc quyền sở hữu của Landlord hiện tại.

---

### 11.4. Cập nhật khu trọ (Update Property)
* **Method & Endpoint:** `PATCH /api/properties/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Request Body:** `{ "name"?: string, "address"?: string, "description"?: string }`
* **Success Response (200 OK):** Trả về Property sau cập nhật.

---

### 11.5. Xóa khu trọ (Delete Property)
* **Method & Endpoint:** `DELETE /api/properties/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Business Rule:** Chỉ được xóa nếu khu trọ **không có phòng nào đang có hợp đồng `ACTIVE`**.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": null,
    "message": "Xóa khu trọ thành công"
  }
  ```
* **Error Response:** `400 Bad Request` (`CANNOT_DELETE_PROPERTY_WITH_ACTIVE_ROOMS`).

---

## 12. Module 4: Rooms APIs

### 12.1. Tạo phòng mới trong khu trọ (Create Room)
* **Method & Endpoint:** `POST /api/properties/:propertyId/rooms`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Path Parameters:** `propertyId`
* **Request Body:**
  ```json
  {
    "roomNumber": "101",
    "floor": 1,
    "price": 3500000,
    "area": 25,
    "description": "Phòng có ban công thoáng mát, máy lạnh"
  }
  ```
* **Validation Rules:**
  * `roomNumber`: Bắt buộc, trim, 1 - 20 ký tự.
  * `price`: Bắt buộc, số nguyên $\ge 0$.
  * `floor`: Tùy chọn, số nguyên $\ge 0$ (mặc định: 1).
  * `area`: Tùy chọn, số dương $\ge 0$.
* **Business Rules:**
  * Kiểm tra `propertyId` thuộc quyền sở hữu của `req.user.userId`.
  * **BR-03:** `roomNumber` là duy nhất trong cùng khu trọ (`propertyId`). Trùng ném `409 Conflict`.
  * Trạng thái mặc định luôn là `AVAILABLE`.
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "66d9fa012a4b8c001f3e4c01",
      "propertyId": "66d9f9a02a4b8c001f3e4b01",
      "roomNumber": "101",
      "floor": 1,
      "price": 3500000,
      "area": 25,
      "status": "AVAILABLE",
      "description": "Phòng có ban công thoáng mát, máy lạnh",
      "createdAt": "2026-09-09T08:30:00.000Z"
    },
    "message": "Tạo phòng mới thành công"
  }
  ```

---

### 12.2. Danh sách phòng trong khu trọ (List Rooms by Property)
* **Method & Endpoint:** `GET /api/properties/:propertyId/rooms`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Query Parameters:** `page`, `limit`, `status` (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`), `floor`, `minPrice`, `maxPrice`.
* **Success Response (200 OK):** Danh sách phòng theo điều kiện lọc.

---

### 12.3. Danh sách toàn bộ phòng của Landlord (List All My Rooms)
* **Method & Endpoint:** `GET /api/rooms`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Query Parameters:** `propertyId`, `status`, `page`, `limit`, `search` (theo số phòng).
* **Success Response (200 OK):** Danh sách phòng thuộc tất cả khu trọ của chủ trọ.

---

### 12.4. Chi tiết phòng (Get Room Details)
* **Method & Endpoint:** `GET /api/rooms/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD, TENANT
* **Ownership & Access Rules:**
  * LANDLORD: Phải là chủ sở hữu của Property chứa phòng.
  * TENANT: Phải có hợp đồng `ACTIVE` gắn với phòng này.

---

### 12.5. Cập nhật thông tin phòng (Update Room)
* **Method & Endpoint:** `PATCH /api/rooms/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Request Body:**
  ```json
  {
    "roomNumber"?: "101A",
    "price"?: 3800000,
    "floor"?: 1,
    "area"?: 25,
    "status"?: "MAINTENANCE",
    "description"?: "Đang sửa điện"
  }
  ```
* **Business Rules:**
  * Nếu đổi `roomNumber`, phải kiểm tra không trùng lặp trong cùng khu trọ.
  * **Cấm tùy tiện đổi status sang `AVAILABLE` nếu phòng đang có hợp đồng `ACTIVE`**.
  * Thay đổi giá `price` của phòng **không làm thay đổi** `rentPrice` trên các hợp đồng `ACTIVE` đã ký.
* **Success Response (200 OK):** Trả về thông tin phòng sau cập nhật.

---

### 12.6. Xóa phòng (Delete Room)
* **Method & Endpoint:** `DELETE /api/rooms/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Business Rules:** Không được xóa phòng nếu đang có hợp đồng `ACTIVE` hoặc còn hóa đơn chưa thanh toán.

---

## 13. Module 5: Tenants APIs

### 13.1. Tạo hồ sơ người thuê (Create Tenant Profile)
* **Method & Endpoint:** `POST /api/tenants`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Purpose:** Chủ trọ tạo hồ sơ quản lý khách thuê trước hoặc khi ký hợp đồng.
* **Request Body:**
  ```json
  {
    "fullName": "Trần Thị B",
    "phone": "0912345678",
    "email": "tranthib@gmail.com",
    "identityNumber": "079199001234",
    "dateOfBirth": "1999-05-20",
    "address": "Số 10 Xã A, Huyện B, Tỉnh C"
  }
  ```
* **Validation Rules:**
  * `fullName`: Bắt buộc, 2 - 100 ký tự.
  * `phone`: Bắt buộc, regex SĐT VN.
  * `identityNumber`: Bắt buộc, 9 hoặc 12 số CCCD/CMND.
  * `email`: Tùy chọn, email hợp lệ.
* **Business Rules:**
  * Gán `landlordId = req.user.userId`.
  * `userId` mặc định là `null` (chưa liên kết tài khoản).
  * Không cho phép trùng `identityNumber` trong cùng 1 Landlord.
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "66d9fb012a4b8c001f3e4d01",
      "landlordId": "66d9f8c12a4b8c001f3e4a11",
      "userId": null,
      "fullName": "Trần Thị B",
      "phone": "0912345678",
      "email": "tranthib@gmail.com",
      "identityNumber": "079199001234",
      "dateOfBirth": "1999-05-20T00:00:00.000Z",
      "address": "Số 10 Xã A, Huyện B, Tỉnh C",
      "createdAt": "2026-09-09T08:45:00.000Z"
    },
    "message": "Tạo hồ sơ khách thuê thành công"
  }
  ```

---

### 13.2. Danh sách khách thuê của Landlord (List Tenants)
* **Method & Endpoint:** `GET /api/tenants`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Query Parameters:** `page`, `limit`, `search` (tên, SĐT, CCCD).

---

### 13.3. Xem & Cập nhật hồ sơ khách thuê (Get / Update Tenant)
* **Method & Endpoint:** `GET /api/tenants/:id` | `PATCH /api/tenants/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD (sở hữu hồ sơ)

---

### 13.4. Khách thuê xem thông tin thuê phòng của mình (Tenant Portal Me)
* **Method & Endpoint:** `GET /api/tenant/me`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** TENANT
* **Purpose:** Trả về hồ sơ cá nhân của người thuê kèm thông tin phòng và hợp đồng `ACTIVE` hiện tại.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "profile": {
        "fullName": "Trần Thị B",
        "phone": "0912345678",
        "email": "tranthib@gmail.com"
      },
      "activeRental": {
        "contractId": "66d9fc012a4b8c001f3e4e01",
        "propertyName": "Khu trọ Hạnh Phúc - Cơ sở 1",
        "roomNumber": "101",
        "rentPrice": 3500000,
        "startDate": "2026-09-01T00:00:00.000Z",
        "endDate": "2027-08-31T00:00:00.000Z",
        "billingDay": 5
      }
    },
    "message": "Lấy thông tin thuê phòng thành công"
  }
  ```

---

## 14. Module 6: Contracts APIs

### 14.1. Tạo mới hợp đồng thuê phòng (Create Contract)
* **Method & Endpoint:** `POST /api/contracts`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Purpose:** Ký hợp đồng cho thuê phòng giữa Landlord, Room và Tenant.
* **Request Body:**
  ```json
  {
    "roomId": "66d9fa012a4b8c001f3e4c01",
    "tenantId": "66d9fb012a4b8c001f3e4d01",
    "startDate": "2026-09-01",
    "endDate": "2027-08-31",
    "rentPrice": 3500000,
    "deposit": 3500000,
    "billingDay": 5,
    "status": "ACTIVE",
    "terms": "Thanh toán tiền phòng từ ngày 1 đến ngày 5 hàng tháng."
  }
  ```
* **Validation Rules:**
  * `roomId`: Bắt buộc, ObjectId hợp lệ.
  * `tenantId`: Bắt buộc, ObjectId hợp lệ.
  * `startDate`, `endDate`: Bắt buộc, định dạng ngày hợp lệ; `endDate > startDate`.
  * `rentPrice`: Bắt buộc, số nguyên $\ge 0$.
  * `deposit`: Bắt buộc, số nguyên $\ge 0$ (mặc định: 0).
  * `billingDay`: Bắt buộc, số nguyên từ 1 đến 28.
  * `status`: Tùy chọn (`'PENDING'` hoặc `'ACTIVE'`, mặc định: `'PENDING'`).
* **Critical Business Rules & Atomic Transaction:**
  1. Xác nhận `Room` và `Tenant` thuộc quyền sở hữu của Landlord (`req.user.userId`).
  2. **BR-04:** Kiểm tra không có hợp đồng `ACTIVE` nào khác trên `roomId` này.
  3. Nếu `status === 'ACTIVE'`:
     * Sử dụng **MongoDB Transaction Session**.
     * Tạo bản ghi `Contract`.
     * **BR-05:** Cập nhật đồng thời `Room.status = 'OCCUPIED'`.
     * Commit Transaction.
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "66d9fc012a4b8c001f3e4e01",
      "roomId": "66d9fa012a4b8c001f3e4c01",
      "tenantId": "66d9fb012a4b8c001f3e4d01",
      "rentPrice": 3500000,
      "deposit": 3500000,
      "billingDay": 5,
      "status": "ACTIVE",
      "startDate": "2026-09-01T00:00:00.000Z",
      "endDate": "2027-08-31T00:00:00.000Z"
    },
    "message": "Tạo hợp đồng thành công"
  }
  ```
* **Error Responses:**
  * `409 Conflict` (`ACTIVE_CONTRACT_EXISTS`): Phòng đã có hợp đồng có hiệu lực.
  * `400 Bad Request` (`ROOM_NOT_AVAILABLE`): Phòng đang ở trạng thái bảo trì.

---

### 14.2. Kích hoạt hợp đồng (Activate Contract)
* **Method & Endpoint:** `POST /api/contracts/:id/activate`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Purpose:** Chuyển hợp đồng từ `PENDING` $\rightarrow$ `ACTIVE`.
* **Business Rules (Transaction):**
  * Kiểm tra hợp đồng thuộc Landlord.
  * Kiểm tra phòng chưa có hợp đồng active nào khác.
  * Update `Contract.status = 'ACTIVE'` và `Room.status = 'OCCUPIED'`.

---

### 14.3. Chấm dứt hợp đồng (Terminate Contract)
* **Method & Endpoint:** `POST /api/contracts/:id/terminate`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Purpose:** Thanh lý hợp đồng thuê phòng khi khách trả phòng.
* **Business Rules (Transaction):**
  * Kiểm tra hợp đồng đang ở trạng thái `ACTIVE`.
  * Update `Contract.status = 'TERMINATED'`.
  * **BR-06:** Cập nhật `Room.status = 'AVAILABLE'`.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "status": "TERMINATED" },
    "message": "Chấm dứt hợp đồng thành công, phòng đã chuyển về trạng thái sẵn sàng"
  }
  ```

---

### 14.4. Danh sách hợp đồng (List Contracts)
* **Method & Endpoint:** `GET /api/contracts`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Query Parameters:** `page`, `limit`, `status`, `propertyId`, `roomId`.

---

### 14.5. Khách thuê xem hợp đồng của mình (Tenant View Contracts)
* **Method & Endpoint:** `GET /api/tenant/contracts`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** TENANT
* **Ownership Rule:** Chỉ xem hợp đồng liên kết với tài khoản của chính mình.

---

## 15. Module 7: Invoices APIs

### 15.1. Lập hóa đơn hàng tháng (Create Monthly Invoice)
* **Method & Endpoint:** `POST /api/invoices`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Purpose:** Tạo hóa đơn thu tiền phòng, điện nước và phụ phí hàng tháng.
* **Request Body:**
  ```json
  {
    "contractId": "66d9fc012a4b8c001f3e4e01",
    "billingMonth": "2026-09",
    "electricity": {
      "currentReading": 350,
      "unitPrice": 3500
    },
    "water": {
      "currentReading": 45,
      "unitPrice": 20000
    },
    "serviceFee": 150000,
    "otherFee": 50000,
    "otherFeeNote": "Thay bóng đèn hành lang",
    "dueDate": "2026-09-10"
  }
  ```
* **Validation Rules:**
  * `contractId`: Bắt buộc.
  * `billingMonth`: Bắt buộc, regex format `YYYY-MM`.
  * `electricity.currentReading`, `electricity.unitPrice`: Bắt buộc, số $\ge 0$.
  * `water.currentReading`, `water.unitPrice`: Bắt buộc, số $\ge 0$.
  * `dueDate`: Bắt buộc, ngày hợp lệ.
* **Critical Calculation & Security Rules (Backend Driven):**
  1. **Previous Readings:** Backend **tự động truy vấn** từ hóa đơn tháng trước của phòng (`createdAt: -1`). Nếu là hóa đơn đầu tiên của hợp đồng, lấy chỉ số ban đầu từ hợp đồng. **Client không được phép tự truyền `previousReading`**.
  2. **BR-12 Validation:** `electricity.currentReading >= electricity.previousReading` và `water.currentReading >= water.previousReading`. Nếu nhỏ hơn, trả về `400 Bad Request` (`INVALID_UTILITY_READING`).
  3. **Usage & Cost:**
     * $\text{electricityUsage} = \text{currentReading} - \text{previousReading}$
     * $\text{electricityCost} = \text{electricityUsage} \times \text{unitPrice}$
     * $\text{waterUsage} = \text{currentReading} - \text{previousReading}$
     * $\text{waterCost} = \text{waterUsage} \times \text{unitPrice}$
  4. **BR-08 Server-side Total:**
     $$\text{totalAmount} = \text{contract.rentPrice} + \text{electricityCost} + \text{waterCost} + \text{serviceFee} + \text{otherFee}$$
  5. Sinh `invoiceNumber` duy nhất dạng `INV-YYYYMM-XXXX`.
  6. Trạng thái mặc định: `PENDING`.
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "66d9fd012a4b8c001f3e4f01",
      "invoiceNumber": "INV-202609-0001",
      "billingMonth": "2026-09",
      "roomRent": 3500000,
      "electricity": {
        "previousReading": 300,
        "currentReading": 350,
        "usage": 50,
        "unitPrice": 3500,
        "totalCost": 175000
      },
      "water": {
        "previousReading": 40,
        "currentReading": 45,
        "usage": 5,
        "unitPrice": 20000,
        "totalCost": 100000
      },
      "serviceFee": 150000,
      "otherFee": 50000,
      "otherFeeNote": "Thay bóng đèn hành lang",
      "totalAmount": 3975000,
      "dueDate": "2026-09-10T00:00:00.000Z",
      "status": "PENDING",
      "createdAt": "2026-09-09T09:00:00.000Z"
    },
    "message": "Tạo hóa đơn thành công"
  }
  ```

---

### 15.2. Danh sách hóa đơn (List Invoices - Landlord)
* **Method & Endpoint:** `GET /api/invoices`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Query Parameters:** `page`, `limit`, `status` (`DRAFT`, `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`), `propertyId`, `roomId`, `billingMonth`.

---

### 15.3. Chi tiết hóa đơn (Get Invoice Detail)
* **Method & Endpoint:** `GET /api/invoices/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD (chủ sở hữu), TENANT (người có hóa đơn).

---

### 15.4. Hủy hóa đơn (Cancel Invoice)
* **Method & Endpoint:** `PATCH /api/invoices/:id/cancel`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Business Rule:** Chỉ được hủy hóa đơn ở trạng thái `PENDING`, `OVERDUE` hoặc `DRAFT`. Không được hủy hóa đơn đã `PAID`.

---

### 15.5. Khách thuê xem hóa đơn của mình (Tenant Invoices)
* **Method & Endpoint:** `GET /api/tenant/invoices`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** TENANT
* **Query Parameters:** `page`, `limit`, `status`, `billingMonth`.

---

## 16. Module 8: Payments APIs

### 16.1. Khởi tạo giao dịch thanh toán (Create Payment Intent)
* **Method & Endpoint:** `POST /api/payments/create-intent`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** TENANT
* **Purpose:** Khách thuê bấm thanh toán hóa đơn để nhận mã thanh toán / QR chuyển khoản.
* **Request Body:**
  ```json
  {
    "invoiceId": "66d9fd012a4b8c001f3e4f01"
  }
  ```
* **Business Rules:**
  * Kiểm tra hóa đơn thuộc về Tenant đang đăng nhập.
  * Hóa đơn phải ở trạng thái `PENDING` hoặc `OVERDUE`. Nếu đã `PAID` $\rightarrow$ Báo lỗi `400 Bad Request` (`INVOICE_ALREADY_PAID`).
  * Kiểm tra nếu đã có Payment `PENDING` cho hóa đơn này trong vòng 15 phút, có thể trả về thông tin thanh toán cũ để tránh spam giao dịch.
  * Tạo bản ghi `Payment`:
    * `amount = invoice.totalAmount`
    * `status = 'PENDING'`
    * `provider = 'MOCK'` (mở rộng PayOS/SePay sau)
    * `transactionCode`: Mã ngẫu nhiên duy nhất (vd: `TXN260909123456`)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "paymentId": "66d9fe012a4b8c001f3e5001",
      "transactionCode": "TXN260909123456",
      "amount": 3975000,
      "provider": "MOCK",
      "qrCodeUrl": "https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=3975000&addInfo=TXN260909123456",
      "transferContent": "TXN260909123456",
      "status": "PENDING",
      "expiresAt": "2026-09-09T09:30:00.000Z"
    },
    "message": "Tạo yêu cầu thanh toán thành công"
  }
  ```

---

### 16.2. Webhook tiếp nhận thanh toán (Payment Webhook)
* **Method & Endpoint:** `POST /api/payments/webhook`
* **Auth Requirement:** Public (Xác thực bằng Webhook Signature / Secret Token)
* **Allowed Roles:** External Payment Provider / Mock Service
* **Purpose:** Nhận thông báo giao dịch thành công từ cổng thanh toán để tự động gạch nợ hóa đơn.
* **Headers:** `x-webhook-signature: <hmac_sha256_hash>` hoặc token bí mật.
* **Request Body:**
  ```json
  {
    "transactionCode": "TXN260909123456",
    "amount": 3975000,
    "provider": "MOCK",
    "providerTransactionId": "BANK_REF_998877",
    "status": "SUCCESS"
  }
  ```
* **Critical Business & Idempotency Rules (Transaction):**
  1. **Xác minh chữ ký (Signature Verification):** Đảm bảo webhook đến từ nguồn hợp lệ.
  2. **Kiểm tra Idempotency:** Tìm bản ghi `Payment` theo `transactionCode`. Nếu `payment.status === 'SUCCESS'`, lập tức trả về `200 OK` (không xử lý lại).
  3. **Đối soát số tiền:** `payment.amount === invoice.totalAmount`.
  4. **MongoDB Transaction Session:**
     * `Payment.status = 'SUCCESS'`, lưu `paidAt = now()`, `providerMetadata = req.body`.
     * `Invoice.status = 'PAID'`, lưu `paidAt = now()`.
     * Commit Transaction.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Webhook processed successfully"
  }
  ```
* **Error Response:** `400 Bad Request` (`INVALID_WEBHOOK_SIGNATURE`).

---

### 16.3. Giả lập thanh toán Webhook trong môi trường Dev (Mock Pay Endpoint)
* **Method & Endpoint:** `POST /api/payments/mock-pay`
* **Auth Requirement:** Authenticated (hoặc Dev mode)
* **Allowed Roles:** TENANT (hoặc LANDLORD để test)
* **Purpose:** Cho phép tester/developer kích hoạt giả lập sự kiện Webhook thành công ngay trong môi trường phát triển MVP.
* **Request Body:** `{ "paymentId": "66d9fe012a4b8c001f3e5001" }`
* **Business Rule:** Gọi thẳng vào logic xử lý của Webhook với transaction code tương ứng.

---

### 16.4. Tra cứu trạng thái giao dịch (Get Payment Status)
* **Method & Endpoint:** `GET /api/payments/:id`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** TENANT (chủ giao dịch), LANDLORD (người thụ hưởng)
* **Success Response (200 OK):** Trả về trạng thái hiện tại (`PENDING`, `SUCCESS`, `FAILED`).

---

## 17. Module 9: Dashboard APIs

### 17.1. Tổng quan số liệu vận hành & tài chính (Landlord Overview)
* **Method & Endpoint:** `GET /api/dashboard/overview`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Purpose:** Cung cấp đầy đủ các chỉ số KPIs phục vụ hiển thị màn hình chính của Landlord.
* **Query Parameters:** `propertyId` (tùy chọn: lọc theo khu trọ cụ thể hoặc toàn bộ).
* **Detailed Calculation Rules (Strict Backend Driven):**
  1. **Phòng trọ:**
     * `totalRooms`: Tổng số phòng thuộc quyền quản lý.
     * `occupiedRooms`: Số phòng có `status = 'OCCUPIED'`.
     * `availableRooms`: Số phòng có `status = 'AVAILABLE'`.
     * `maintenanceRooms`: Số phòng có `status = 'MAINTENANCE'`.
     * **Tỷ lệ lấp đầy (Occupancy Rate):**
       $$\text{occupancyRate} = \frac{\text{occupiedRooms}}{\text{occupiedRooms} + \text{availableRooms}} \times 100\%$$
       *(Lưu ý: Không cộng phòng bảo trì vào mẫu số khả dụng).*
  2. **Doanh thu thực tế (BR-10):**
     * `revenueThisMonth`: Tổng `amount` các `Payment` có `status = 'SUCCESS'` và `paidAt` nằm trong tháng hiện tại.
     * `revenueThisYear`: Tổng `amount` các `Payment` có `status = 'SUCCESS'` và `paidAt` nằm trong năm hiện tại.
  3. **Công nợ chưa thu (BR-11):**
     * `outstandingDebt`: Tổng `totalAmount` các `Invoice` có trạng thái `PENDING` hoặc `OVERDUE`.
     * `unpaidInvoicesCount`: Số lượng hóa đơn chưa thanh toán.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "rooms": {
        "total": 30,
        "occupied": 25,
        "available": 4,
        "maintenance": 1,
        "occupancyRate": 86.2
      },
      "finances": {
        "revenueThisMonth": 87500000,
        "revenueThisYear": 650000000,
        "outstandingDebt": 12500000,
        "unpaidInvoicesCount": 3
      },
      "invoices": {
        "paidCount": 27,
        "pendingCount": 2,
        "overdueCount": 1
      }
    },
    "message": "Lấy dữ liệu dashboard thành công"
  }
  ```

---

### 17.2. Biểu đồ doanh thu theo tháng (Revenue Chart)
* **Method & Endpoint:** `GET /api/dashboard/revenue-chart`
* **Auth Requirement:** Authenticated
* **Allowed Roles:** LANDLORD
* **Query Parameters:** `year` (mặc định: năm hiện tại)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "year": 2026,
      "monthlyData": [
        { "month": "2026-01", "revenue": 85000000 },
        { "month": "2026-02", "revenue": 82000000 },
        { "month": "2026-09", "revenue": 87500000 }
      ]
    },
    "message": "Lấy dữ liệu biểu đồ thành công"
  }
  ```

---

## 18. Business Flow Examples (Minh họa Luồng Nghiệp vụ Đầu - Cuối)

### Luồng 1: Vòng đời cho thuê phòng (Onboarding & Leasing)
```
1. POST /api/properties                 -> Tạo khu trọ (Property A)
2. POST /api/properties/:id/rooms       -> Tạo phòng 101 (Trạng thái: AVAILABLE)
3. POST /api/tenants                    -> Tạo hồ sơ khách thuê Nguyễn Văn B
4. POST /api/contracts                  -> Tạo hợp đồng với status: ACTIVE
                                           (Backend tự động đổi phòng 101 -> OCCUPIED)
```

### Luồng 2: Thu tiền hàng tháng & Gạch nợ (Billing & Payment)
```
1. POST /api/invoices                   -> Landlord nhập số điện/nước mới
                                           (Backend lấy số cũ từ DB, tự tính tổng tiền, trạng thái: PENDING)
2. GET  /api/tenant/invoices            -> Tenant thấy hóa đơn cần đóng
3. POST /api/payments/create-intent     -> Tenant bấm thanh toán, lấy QR Code (Payment: PENDING)
4. POST /api/payments/webhook           -> Cổng thanh toán báo tiền đã vào tài khoản
                                           (Backend atomic commit: Payment -> SUCCESS & Invoice -> PAID)
5. GET  /api/dashboard/overview         -> Doanh thu tháng của Landlord lập tức tăng lên
```

---

## 19. Security Rules & Data Isolation Summary

1. **Strict Context Extraction:** Cấm nhận `landlordId` hoặc `role` từ client. Luôn trích xuất từ `req.user` do middleware cấp phát sau khi giải mã JWT.
2. **Multi-tenant Data Isolation:** Mọi query `find`, `update`, `delete` đều phải chứa bộ lọc `landlordId: req.user.userId`.
3. **Database-level Race Condition Protection:**
   * Compound unique index `{ propertyId: 1, roomNumber: 1 }` chặn trùng số phòng.
   * Partial unique index `{ roomId: 1 }, { partialFilterExpression: { status: 'ACTIVE' } }` đảm bảo không bao giờ có 2 hợp đồng `ACTIVE` cho cùng 1 phòng.
4. **Idempotent Webhooks:** Dựa vào `transactionCode` unique index để loại bỏ triệt để việc xử lý trùng lặp giao dịch khi cổng thanh toán retry.
5. **Client-controlled vs Backend-controlled:**
   * *Client-controlled:* Tên, địa chỉ, số phòng, chỉ số điện/nước mới, ngày ký, hạn đóng tiền.
   * *Backend-controlled:* `landlordId`, `status` hợp đồng/hóa đơn/thanh toán, `previousReading`, `usage`, `totalAmount`, `paidAt`, `invoiceNumber`.

---

## 20. MVP Scope / Out of Scope

### 20.1. Nằm trong MVP (In Scope)
* 9 Modules: Auth, Users (Admin view), Properties, Rooms, Tenants, Contracts, Invoices, Payments (Mock Webhook), Dashboard.
* RBAC 3 vai trò: `LANDLORD`, `TENANT`, `ADMIN`.
* Kiểm soát tính nhất quán dữ liệu bằng MongoDB Transactions.

### 20.2. Ngoài phạm vi MVP (Out of Scope)
* Tích hợp trực tiếp SDK cổng thanh toán sản xuất (PayOS, SePay - được thiết kế sẵn sàng để cắm vào ở Phase sau).
* Hệ thống thông báo tự động (SMS, Zalo ZNS, Email tự động).
* Quản lý yêu cầu bảo trì / sửa chữa (`Maintenance Requests`).
* Trò chuyện thời gian thực (`Socket.IO Chat`).
* AI Agent & Tool Calling (Sẽ triển khai sau khi Core API hoàn thiện).
* Ký hợp đồng điện tử pháp lý (E-signature).
