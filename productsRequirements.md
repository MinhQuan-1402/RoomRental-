# Product Requirements Document (PRD)

## Rental Management System

**Version:** 1.0
**Status:** Draft / MVP
**Product Type:** Web Application
**Frontend:** Next.js + TypeScript
**Backend:** Node.js + Express + TypeScript
**Database:** MongoDB + Mongoose

---

# 1. Tổng quan sản phẩm

## 1.1. Tên dự án

**Rental Management System**

Hệ thống quản lý phòng trọ dành cho chủ trọ, giúp quản lý tập trung nhiều khu trọ, phòng, người thuê, hợp đồng, hóa đơn, tiền điện/nước và thanh toán.

Hệ thống cũng cung cấp một cổng dành cho người thuê để theo dõi thông tin thuê phòng và thanh toán tiền phòng trực tuyến.

Trong các phiên bản sau, hệ thống sẽ tích hợp **AI Agent** để chủ trọ có thể tương tác với hệ thống bằng ngôn ngữ tự nhiên thay vì phải thao tác thủ công trên nhiều màn hình.

---

# 2. Problem Statement

## 2.1. Vấn đề

Chủ trọ có nhiều phòng thường phải quản lý:

* Danh sách phòng.
* Tình trạng phòng.
* Thông tin người thuê.
* Hợp đồng.
* Tiền phòng hàng tháng.
* Điện/nước.
* Các khoản phí khác.
* Công nợ.
* Lịch sử thanh toán.
* Doanh thu.

Khi quản lý bằng Excel, giấy tờ hoặc nhiều ứng dụng riêng biệt, chủ trọ dễ gặp:

* Khó theo dõi nhiều phòng.
* Dễ quên hạn thanh toán.
* Khó kiểm tra phòng đang trống.
* Khó theo dõi người thuê nào còn nợ.
* Khó tổng hợp doanh thu.
* Dễ xảy ra sai sót khi tính tiền điện/nước.
* Khó kiểm tra lịch sử thanh toán.
* Mất thời gian khi phải thực hiện nhiều thao tác lặp lại.

## 2.2. Giải pháp

Xây dựng một nền tảng web cho phép chủ trọ quản lý toàn bộ hoạt động cho thuê trên một hệ thống duy nhất.

Hệ thống tập trung vào chuỗi nghiệp vụ:

**Property → Room → Tenant → Contract → Invoice → Payment → Revenue**

---

# 3. Product Goals

## 3.1. Mục tiêu chính

### Goal 1 — Quản lý tập trung

Cho phép một landlord quản lý nhiều khu trọ và nhiều phòng trên cùng một tài khoản.

### Goal 2 — Quản lý người thuê

Theo dõi thông tin người thuê, phòng đang ở và hợp đồng.

### Goal 3 — Quản lý tài chính

Theo dõi:

* Tiền phòng.
* Tiền điện.
* Tiền nước.
* Phí dịch vụ.
* Hóa đơn.
* Thanh toán.
* Công nợ.
* Doanh thu.

### Goal 4 — Giảm thao tác thủ công

Tự động hóa các công việc như:

* Tính tổng hóa đơn.
* Cập nhật trạng thái hóa đơn.
* Cập nhật trạng thái phòng.
* Ghi nhận thanh toán.
* Tổng hợp doanh thu.

### Goal 5 — Tạo nền tảng cho AI Agent

Kiến trúc backend phải cho phép AI Agent sử dụng các business service có sẵn để:

* Đọc dữ liệu.
* Tìm kiếm dữ liệu.
* Thực hiện các thao tác được phép.
* Yêu cầu người dùng xác nhận trước những hành động thay đổi dữ liệu.

---

# 4. Target Users

## 4.1. Landlord

Chủ nhà/chủ trọ quản lý một hoặc nhiều khu trọ.

Nhu cầu:

* Quản lý phòng.
* Quản lý người thuê.
* Quản lý hợp đồng.
* Thu tiền.
* Theo dõi công nợ.
* Theo dõi doanh thu.
* Quản lý nhiều property.

---

## 4.2. Tenant

Người thuê phòng.

Nhu cầu:

* Xem thông tin phòng.
* Xem hợp đồng.
* Xem hóa đơn.
* Xem tiền điện/nước.
* Thanh toán.
* Xem lịch sử thanh toán.
* Nhận thông báo.

---

## 4.3. Admin

Quản trị viên của hệ thống.

Nhu cầu:

* Quản lý người dùng.
* Theo dõi hoạt động hệ thống.
* Theo dõi giao dịch.
* Xem báo cáo.
* Xử lý các vấn đề liên quan đến tài khoản.

---

# 5. Roles & Permissions

## 5.1. LANDLORD

Landlord có quyền:

```text
CREATE
READ
UPDATE
DELETE
```

đối với dữ liệu thuộc quyền sở hữu của mình.

Landlord có thể:

* Quản lý properties.
* Quản lý rooms.
* Quản lý tenants.
* Quản lý contracts.
* Quản lý invoices.
* Xem payments.
* Xem revenue.
* Xem outstanding debts.

Landlord **không được truy cập dữ liệu của landlord khác**.

---

# 5.2. TENANT

Tenant có quyền:

* Xem thông tin cá nhân.
* Xem phòng đang thuê.
* Xem hợp đồng của mình.
* Xem hóa đơn của mình.
* Thanh toán hóa đơn.
* Xem lịch sử thanh toán.
* Gửi yêu cầu hỗ trợ.

Tenant không được:

* Xem tenant khác.
* Xem property khác.
* Thay đổi giá phòng.
* Thay đổi hóa đơn.
* Thay đổi trạng thái thanh toán.

---

# 5.3. ADMIN

Admin có quyền quản trị toàn hệ thống:

* Quản lý users.
* Xem properties.
* Xem rooms.
* Xem tenants.
* Xem contracts.
* Xem invoices.
* Xem payments.
* Xem audit logs.

Admin không được tùy ý thay đổi dữ liệu tài chính nếu không có nghiệp vụ được định nghĩa rõ ràng.

---

# 6. MVP Scope

MVP tập trung vào nghiệp vụ cốt lõi.

## 6.1. Authentication

* Register.
* Login.
* Logout.
* Refresh token.
* Password hashing.
* JWT authentication.
* Role-based authorization.

---

# 6.2. Property Management

Landlord có thể:

* Tạo property.
* Xem property.
* Cập nhật property.
* Xóa property nếu không vi phạm business rules.
* Xem số lượng phòng.
* Xem số phòng đang thuê.
* Xem số phòng trống.

Property gồm:

```text
name
address
description
landlordId
createdAt
updatedAt
```

---

# 6.3. Room Management

Landlord có thể:

* Tạo phòng.
* Xem danh sách phòng.
* Xem chi tiết phòng.
* Cập nhật phòng.
* Xóa phòng.
* Thay đổi giá phòng.
* Xem trạng thái phòng.

Room status:

```text
AVAILABLE
OCCUPIED
RESERVED
MAINTENANCE
```

MVP ưu tiên:

```text
AVAILABLE
OCCUPIED
MAINTENANCE
```

`RESERVED` có thể sử dụng khi mở rộng chức năng đặt phòng.

Room gồm:

```text
propertyId
roomNumber
floor
price
area
status
description
createdAt
updatedAt
```

---

# 6.4. Tenant Management

Landlord có thể:

* Tạo tenant.
* Xem danh sách tenant.
* Xem thông tin tenant.
* Cập nhật tenant.
* Xem phòng tenant đang thuê.
* Xem hợp đồng tenant.

Thông tin tenant:

```text
fullName
phone
email
identityNumber
dateOfBirth
address
userId
landlordId
```

`userId` có thể nullable trong trường hợp landlord tạo hồ sơ tenant trước khi tenant tạo tài khoản.

---

# 6.5. Contract Management

Landlord có thể:

* Tạo hợp đồng.
* Xem hợp đồng.
* Cập nhật hợp đồng.
* Chấm dứt hợp đồng.
* Xem lịch sử hợp đồng.

Contract gồm:

```text
roomId
tenantId
landlordId
startDate
endDate
rentPrice
deposit
billingDay
status
terms
```

Contract status:

```text
PENDING
ACTIVE
EXPIRED
TERMINATED
```

---

# 6.6. Invoice Management

Landlord có thể:

* Tạo hóa đơn.
* Xem hóa đơn.
* Xem hóa đơn theo tháng.
* Xem hóa đơn theo phòng.
* Xem hóa đơn theo tenant.
* Xem hóa đơn chưa thanh toán.
* Xem hóa đơn quá hạn.

Tenant có thể:

* Xem hóa đơn của mình.
* Xem chi tiết hóa đơn.
* Thanh toán hóa đơn.

Invoice gồm:

```text
invoiceNumber
contractId
roomId
tenantId
billingMonth
roomRent
electricity
water
serviceFee
otherFee
totalAmount
dueDate
status
```

Invoice status:

```text
DRAFT
PENDING
PAID
OVERDUE
CANCELLED
```

---

# 6.7. Utility Management

MVP hỗ trợ:

* Electricity.
* Water.

Mỗi kỳ hóa đơn có thể lưu:

```text
electricityPrevious
electricityCurrent
electricityUsage
electricityUnitPrice

waterPrevious
waterCurrent
waterUsage
waterUnitPrice
```

Công thức:

```text
electricityUsage =
electricityCurrent - electricityPrevious
```

```text
electricityCost =
electricityUsage × electricityUnitPrice
```

Tương tự đối với nước.

Backend phải kiểm tra:

```text
currentReading >= previousReading
```

Không cho phép số điện/nước hiện tại nhỏ hơn số trước đó trong MVP.

---

# 6.8. Payment Management

Tenant có thể tạo yêu cầu thanh toán cho invoice.

Flow:

```text
Tenant
   ↓
Select Invoice
   ↓
Create Payment
   ↓
Payment QR / Payment Link
   ↓
Bank Transfer
   ↓
Payment Provider
   ↓
Webhook
   ↓
Backend Verification
   ↓
Payment SUCCESS
   ↓
Invoice PAID
```

Payment gồm:

```text
invoiceId
tenantId
amount
provider
transactionCode
status
paidAt
createdAt
```

Payment status:

```text
PENDING
SUCCESS
FAILED
CANCELLED
```

## Payment Rules

Không được đánh dấu invoice `PAID` chỉ dựa vào:

* Frontend redirect.
* User click "Đã thanh toán".
* Client gửi request với status `PAID`.

Invoice chỉ chuyển thành `PAID` sau khi backend xác nhận giao dịch hợp lệ.

Payment webhook phải hỗ trợ idempotency để tránh ghi nhận một giao dịch nhiều lần.

---

# 7. Dashboard

## 7.1. Landlord Dashboard

Dashboard hiển thị:

### Overview

* Total properties.
* Total rooms.
* Occupied rooms.
* Available rooms.
* Occupancy rate.
* Total tenants.

### Financial

* Revenue this month.
* Revenue this year.
* Outstanding debt.
* Paid invoices.
* Unpaid invoices.
* Overdue invoices.

### Room Overview

Ví dụ:

```text
Total rooms: 50

Occupied: 42
Available: 6
Maintenance: 2

Occupancy rate: 84%
```

### Revenue Chart

Hiển thị doanh thu theo tháng.

---

# 8. Notifications

Notification system sẽ được triển khai ở MVP hoặc ngay sau MVP.

Các trường hợp:

### Landlord

* Invoice chưa thanh toán.
* Invoice quá hạn.
* Payment thành công.
* Contract sắp hết hạn.

### Tenant

* Có invoice mới.
* Invoice sắp đến hạn.
* Invoice quá hạn.
* Payment thành công.
* Contract sắp hết hạn.

Notification gồm:

```text
userId
title
message
type
isRead
createdAt
```

---

# 9. Maintenance Request

Tính năng này có thể được triển khai sau core MVP.

Tenant có thể:

* Tạo yêu cầu sửa chữa.
* Mô tả vấn đề.
* Upload hình ảnh.
* Theo dõi trạng thái.

Landlord có thể:

* Xem request.
* Cập nhật trạng thái.
* Ghi chú xử lý.

Status:

```text
OPEN
IN_PROGRESS
RESOLVED
CANCELLED
```

---

# 10. AI Agent

AI Agent là tính năng khác biệt của hệ thống và được triển khai **sau khi core business hoàn thiện**.

## 10.1. Mục tiêu

Cho phép landlord sử dụng ngôn ngữ tự nhiên để:

* Tra cứu dữ liệu.
* Tạo dữ liệu.
* Thực hiện các nghiệp vụ.

Ví dụ:

> "Có bao nhiêu phòng đang trống?"

AI:

> "Hiện tại có 8 phòng đang trống."

---

Ví dụ:

> "Doanh thu tháng này là bao nhiêu?"

AI sẽ gọi:

```text
getRevenue()
```

và trả về kết quả.

---

Ví dụ:

> "Thêm phòng 203 giá 3 triệu vào khu trọ Sơn Trà."

AI:

```text
createRoom({
    roomNumber: "203",
    price: 3000000
})
```

Nhưng trước khi thực hiện:

```text
AI:
"Tôi sẽ tạo phòng 203 với giá 3.000.000đ.
Bạn có muốn xác nhận không?"
```

User:

```text
Xác nhận
```

→ Backend thực hiện.

---

# 10.2. AI Tools

Read tools:

```text
getRooms()
getAvailableRooms()
getOccupiedRooms()
getTenants()
getRevenue()
getOutstandingInvoices()
getInvoiceStatus()
getOccupancyRate()
```

Write tools:

```text
createRoom()
createTenant()
createContract()
createInvoice()
```

Các thao tác nguy hiểm:

```text
deleteRoom()
terminateContract()
cancelInvoice()
refundPayment()
```

phải yêu cầu confirmation.

---

# 10.3. AI Security Rules

AI Agent:

* Không được truy cập MongoDB trực tiếp.
* Không được bypass authorization.
* Không được tự ý thực hiện destructive actions.
* Phải sử dụng business services/tools.
* Phải sử dụng authenticated user context.
* Phải kiểm tra ownership.
* Các action phải được ghi log.

Flow:

```text
User
 ↓
AI Agent
 ↓
Tool Selection
 ↓
Authorization
 ↓
Business Service
 ↓
MongoDB
```

Không:

```text
User
 ↓
AI
 ↓
MongoDB
```

---

# 11. Core Business Rules

## BR-01 — Ownership

Mỗi property thuộc về một landlord.

```text
Property.landlordId
```

Backend phải xác nhận property thuộc landlord hiện tại.

Không tin:

```text
req.body.landlordId
```

nếu thông tin landlord đã có từ authentication context.

---

## BR-02 — Property Ownership

Landlord A không được:

* Xem property của Landlord B.
* Tạo room vào property của Landlord B.
* Xem tenant thuộc property của Landlord B.
* Xem invoice của Landlord B.

---

## BR-03 — Room Number

Trong cùng một property:

```text
roomNumber
```

phải unique.

Ví dụ:

```text
Property A
Room 101
Room 102
Room 103
```

Không được có:

```text
Room 101
Room 101
```

trong cùng property.

Nhưng property khác có thể có room 101.

---

## BR-04 — Active Contract

Một room chỉ được có **một ACTIVE contract tại một thời điểm**.

Không được:

```text
Room 203
 ├── Contract A → ACTIVE
 └── Contract B → ACTIVE
```

---

## BR-05 — Contract Activation

Khi contract chuyển thành:

```text
ACTIVE
```

room phải chuyển:

```text
AVAILABLE → OCCUPIED
```

---

## BR-06 — Contract Termination

Khi contract kết thúc:

```text
ACTIVE → TERMINATED
```

room có thể chuyển:

```text
OCCUPIED → AVAILABLE
```

nếu không có contract ACTIVE khác.

---

## BR-07 — Invoice Ownership

Tenant chỉ được xem invoice thuộc contract của chính tenant.

---

## BR-08 — Invoice Total

`totalAmount` luôn được tính ở backend.

Không tin giá trị total từ frontend.

---

## BR-09 — Payment

Chỉ payment đã được backend xác minh mới có thể cập nhật:

```text
Invoice → PAID
```

---

## BR-10 — Revenue

Doanh thu được tính dựa trên **successful payments**, không phải tổng giá trị invoices.

Ví dụ:

```text
Invoices:
10.000.000đ

Paid:
7.000.000đ

Revenue:
7.000.000đ
```

Không phải:

```text
Revenue = 10.000.000đ
```

---

## BR-11 — Outstanding Debt

Công nợ là tổng các invoice chưa được thanh toán.

Ví dụ:

```text
Invoice A = 3.000.000 → PAID
Invoice B = 3.500.000 → PENDING
Invoice C = 4.000.000 → OVERDUE

Outstanding debt =
3.500.000 + 4.000.000
= 7.500.000đ
```

---

## BR-12 — Utility Reading

Không cho phép:

```text
currentReading < previousReading
```

---

# 12. Main User Flows

## Flow 1 — Landlord tạo property

```text
Login
 ↓
Dashboard
 ↓
Properties
 ↓
Create Property
 ↓
Enter information
 ↓
Validate
 ↓
Create Property
 ↓
Success
```

---

# Flow 2 — Landlord tạo room

```text
Property
 ↓
Rooms
 ↓
Create Room
 ↓
Enter room information
 ↓
Validate property ownership
 ↓
Check room number
 ↓
Create Room
 ↓
Room = AVAILABLE
```

---

# Flow 3 — Landlord tạo tenant

```text
Tenants
 ↓
Create Tenant
 ↓
Enter tenant information
 ↓
Validate
 ↓
Create Tenant
```

---

# Flow 4 — Create Contract

```text
Tenant
      \
       → Create Contract
      /
Room

 ↓

Validate:
- Room exists
- Tenant exists
- Room belongs to landlord
- Tenant belongs to landlord
- No ACTIVE contract

 ↓

Create Contract

 ↓

Room = OCCUPIED
```

---

# Flow 5 — Monthly Invoice

```text
Active Contract
       ↓
Billing Period
       ↓
Utility Readings
       ↓
Calculate:
Room Rent
+ Electricity
+ Water
+ Service Fee
+ Other Fee
       ↓
Create Invoice
       ↓
PENDING
```

---

# Flow 6 — Tenant Payment

```text
Tenant
 ↓
Invoice
 ↓
Pay
 ↓
Payment Provider
 ↓
Bank Transfer
 ↓
Webhook
 ↓
Verify transaction
 ↓
Create/Update Payment
 ↓
Invoice = PAID
 ↓
Notify Tenant
 ↓
Notify Landlord
```

---

# Flow 7 — Contract Termination

```text
Landlord
 ↓
Contract
 ↓
Terminate
 ↓
Validate
 ↓
Contract = TERMINATED
 ↓
Room = AVAILABLE
```

---

# 13. Non-Functional Requirements

## 13.1. Security

System phải:

* Hash password bằng bcrypt.
* Sử dụng JWT.
* Validate request body.
* Validate query parameters.
* Validate route parameters.
* Enforce RBAC.
* Enforce resource ownership.
* Không expose password.
* Không lưu secret trong source code.
* Sử dụng environment variables.
* Có centralized error handling.

---

# 13.2. API Security

Không tin dữ liệu authorization từ client.

Ví dụ không nên:

```json
{
  "landlordId": "123"
}
```

và backend sử dụng trực tiếp.

Thay vào đó:

```text
JWT
 ↓
authenticate middleware
 ↓
req.user
 ↓
service
```

---

# 13.3. Validation

Backend phải validate tất cả input.

Ví dụ:

```text
roomNumber
price
phone
email
dates
utility readings
```

Frontend validation chỉ nhằm cải thiện UX.

Backend validation mới là nguồn xác thực chính.

---

# 13.4. Error Handling

API phải sử dụng response format thống nhất.

Ví dụ:

```json
{
  "success": false,
  "message": "Room already exists",
  "code": "ROOM_ALREADY_EXISTS"
}
```

Success:

```json
{
  "success": true,
  "data": {}
}
```

---

# 13.5. Performance

MVP cần:

* Pagination cho danh sách lớn.
* Index các field thường xuyên query.
* Không trả về toàn bộ collection khi không cần thiết.
* Projection khi phù hợp.
* Query có filter/sort rõ ràng.

---

# 14. Initial Database Collections

MVP:

```text
users
properties
rooms
tenants
contracts
invoices
payments
```

Post-MVP:

```text
utility_readings
notifications
maintenance_requests
ai_conversations
ai_messages
ai_actions
audit_logs
```

---

# 15. High-Level Data Relationships

```text
User
 │
 ├── LANDLORD
 │       │
 │       └── Properties
 │               │
 │               └── Rooms
 │                       │
 │                       └── Contracts
 │                               │
 │                               └── Tenant
 │                                       │
 │                                       └── Invoices
 │                                               │
 │                                               └── Payments
 │
 └── TENANT
```

---

# 16. MVP Acceptance Criteria

MVP được xem là hoàn thành khi landlord có thể thực hiện đầy đủ flow:

```text
Register
 ↓
Login
 ↓
Create Property
 ↓
Create Room
 ↓
Create Tenant
 ↓
Create Contract
 ↓
Room becomes OCCUPIED
 ↓
Create Invoice
 ↓
Tenant views Invoice
 ↓
Tenant creates Payment
 ↓
Payment Provider processes payment
 ↓
Webhook reaches Backend
 ↓
Backend verifies payment
 ↓
Invoice becomes PAID
 ↓
Revenue is updated
```

Ngoài ra:

* Tenant không thể xem dữ liệu tenant khác.
* Landlord không thể truy cập property của landlord khác.
* Room không thể có hai ACTIVE contracts.
* Invoice total được tính server-side.
* Payment không thể tự đánh dấu PAID từ frontend.
* API validation hoạt động.
* Authentication hoạt động.
* RBAC hoạt động.
* Error handling thống nhất.

---

# 17. Out of Scope — MVP

Các tính năng sau **không triển khai ngay**:

* Mobile app.
* Multi-language.
* AI Agent hoàn chỉnh.
* Advanced analytics.
* Predictive analytics.
* Automatic OCR giấy tờ.
* Face recognition.
* E-contract/e-signature.
* Complex multi-tenant contracts.
* Multiple landlords sharing ownership.
* Advanced accounting.
* Tax management.
* Automated legal document generation.
* Full maintenance management.
* Advanced notification automation.

Những chức năng này chỉ được triển khai sau khi core MVP ổn định.

---

# 18. Future Roadmap

## Phase 1 — Core MVP

```text
Authentication
Properties
Rooms
Tenants
Contracts
Invoices
Payments
Dashboard
```

## Phase 2 — Automation

```text
Automatic monthly invoice
Utility management
Notifications
Contract expiry reminders
Maintenance requests
```

## Phase 3 — AI Agent

```text
AI Chat
Natural Language Query
Read Tools
Write Tools
Confirmation
AI Action Logs
```

## Phase 4 — Advanced Analytics

```text
Revenue Analytics
Occupancy Analytics
Debt Analytics
Tenant Analytics
Financial Reports
```

## Phase 5 — Production Improvements

```text
Redis
Queue
Realtime Notifications
Advanced Monitoring
Rate Limiting
Audit Logs
CI/CD
Automated Testing
```

---

# 19. Development Principles

Project được phát triển theo nguyên tắc:

## 19.1. Backend là nguồn sự thật

Business rules phải được enforce ở backend.

Frontend không được quyết định:

* Authorization.
* Invoice total.
* Payment status.
* Room ownership.
* Contract validity.

---

## 19.2. Modular Architecture

Backend sử dụng Modular Monolith.

Mỗi module chịu trách nhiệm một domain:

```text
auth
users
properties
rooms
tenants
contracts
invoices
payments
```

Không sử dụng microservices ở MVP.

---

## 19.3. Service-oriented Business Logic

Controller chỉ xử lý:

```text
Request
 ↓
Validation
 ↓
Service
 ↓
Response
```

Business logic nằm trong service.

---

## 19.4. AI không được bypass business logic

AI Agent phải sử dụng các service/tool đã được kiểm soát.

Ví dụ:

```text
AI
 ↓
createRoom tool
 ↓
RoomService
 ↓
Authorization
 ↓
Validation
 ↓
MongoDB
```

Không:

```text
AI
 ↓
MongoDB
```

---

# 20. Definition of Done

Một feature chỉ được coi là hoàn thành khi:

* [ ] Requirement rõ ràng.
* [ ] API được thiết kế.
* [ ] Validation được implement.
* [ ] Authorization được implement.
* [ ] Ownership được kiểm tra.
* [ ] Business rules được enforce.
* [ ] Error handling đầy đủ.
* [ ] Database operation hoạt động.
* [ ] Frontend integration hoạt động.
* [ ] Test cơ bản đã chạy.
* [ ] Không phá vỡ feature cũ.
* [ ] Code được review.
* [ ] Git commit được tạo.

---

# 21. Development Strategy

Project không được xây dựng bằng một prompt duy nhất.

Thay vào đó:

```text
Requirement
     ↓
Design
     ↓
Small Task
     ↓
AI Coding
     ↓
Run
     ↓
Test
     ↓
Review
     ↓
Fix
     ↓
Git Commit
     ↓
Next Task
```

Ví dụ:

```text
feat: setup backend
feat: setup mongodb
feat: implement authentication
feat: implement property management
feat: implement room management
feat: implement tenant management
feat: implement contract management
feat: implement invoice management
feat: implement payment management
feat: implement landlord dashboard
```

---

# 22. Product Success Criteria

MVP thành công khi một landlord có thể quản lý toàn bộ vòng đời của một phòng:

```text
PHÒNG TRỐNG
     ↓
NGƯỜI THUÊ
     ↓
HỢP ĐỒNG
     ↓
PHÒNG ĐANG THUÊ
     ↓
HÓA ĐƠN HÀNG THÁNG
     ↓
THANH TOÁN
     ↓
DOANH THU
     ↓
THEO DÕI CÔNG NỢ
```

Đây là **core business loop** của toàn bộ hệ thống.

---

# 23. MVP Priority

| Priority | Module             | Level    |
| -------- | ------------------ | -------- |
| P0       | Authentication     | Critical |
| P0       | User & RBAC        | Critical |
| P0       | Property           | Critical |
| P0       | Room               | Critical |
| P0       | Tenant             | Critical |
| P0       | Contract           | Critical |
| P0       | Invoice            | Critical |
| P0       | Payment            | Critical |
| P1       | Dashboard          | High     |
| P1       | Utility            | High     |
| P1       | Notification       | High     |
| P2       | Maintenance        | Medium   |
| P2       | AI Agent           | Medium   |
| P3       | Advanced Analytics | Future   |

---

# 24. Final Product Vision

Rental Management System không chỉ là một ứng dụng CRUD quản lý phòng trọ.

Mục tiêu dài hạn là xây dựng một **Property Rental Management Platform** trong đó:

```text
              LANDLORD
                  │
        ┌─────────┴─────────┐
        │                   │
    Dashboard           AI Agent
        │                   │
        └─────────┬─────────┘
                  │
              MANAGEMENT
                  │
     ┌────────────┼────────────┐
     │            │            │
  Property      Tenant       Finance
     │            │            │
   Room       Contract      Invoice
                              │
                           Payment
                              │
                           Revenue
```

AI Agent sẽ trở thành lớp tương tác thông minh phía trên hệ thống, giúp landlord có thể quản lý dữ liệu và thực hiện nghiệp vụ bằng ngôn ngữ tự nhiên.

**Core principle:**

> Automate repetitive rental-management tasks while keeping financial operations, authorization, and business rules reliable and auditable.
