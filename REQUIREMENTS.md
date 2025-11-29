# Yêu Cầu Chức Năng Hệ Thống Quản Lý Nhà Hàng

## 1. Actors trong hệ thống

- **Customer (Khách hàng)**
- **Quản lý (Manager)**
- **Admin (Quản trị hệ thống)**

## 2. Chức năng theo từng Actor

### 2.1. Customer (Khách hàng)

#### Đăng ký / Đăng nhập
- Đăng ký tài khoản mới
- Đăng nhập hệ thống
- Quên mật khẩu (nếu cần)

#### Quản lý tài khoản
- Cập nhật thông tin cá nhân
- Xem lịch sử đơn hàng
- Xem chi tiết từng đơn hàng

#### Đặt hàng online
- Chọn món trong thực đơn, combo
- Chọn hình thức nhận:
  - Tại bàn
  - Mang về
  - Giao tận nơi (nếu có)
- Xem giỏ hàng
- Chỉnh sửa số lượng, xóa món

#### Tích điểm, đổi điểm
- Nhận điểm sau mỗi đơn hàng
- Xem điểm hiện có
- Dùng điểm để giảm giá đơn hàng
- Xem lịch sử tích điểm

#### Tìm kiếm
- Tìm món theo tên
- Tìm món theo loại/category
- Tìm combo
- Lọc theo giá, phổ biến

#### Voucher giảm giá
- Nhập mã khuyến mãi
- Hệ thống kiểm tra điều kiện áp dụng
- Xem danh sách voucher có thể dùng

#### Thanh toán online
- Tích hợp cổng thanh toán:
  - VNPay
  - Momo
  - PayPal (tùy đề tài)
- Lưu trạng thái thanh toán vào đơn hàng
- Xem hóa đơn điện tử

### 2.2. Quản lý (Manager)

#### Xác nhận đơn đặt hàng
- Xác nhận các đơn khách đặt online
- Kiểm tra tình trạng món
- Kiểm tra số lượng tồn kho trước khi xác nhận
- Từ chối đơn nếu không đủ nguyên liệu

#### Tạo đơn hàng
- Tạo đơn tại quầy cho khách đến trực tiếp
- Chọn bàn (nếu có)
- Nhập thông tin khách hàng
- Chọn món từ thực đơn

#### Cập nhật đơn hàng
- Cập nhật trạng thái:
  - Đang chuẩn bị
  - Đang phục vụ
  - Hoàn thành
  - Hủy
- Cập nhật thông tin thanh toán:
  - Chưa thanh toán
  - Đã thanh toán
  - Công nợ (nếu có)
- Thêm ghi chú cho đơn hàng

#### Tìm kiếm
- Tìm đơn hàng theo mã
- Tìm theo số bàn
- Tìm theo tên khách
- Tìm theo ngày
- Lọc theo trạng thái

#### Quản lý kho thực phẩm, nguyên vật liệu
- Xem số lượng tồn
- Điều chỉnh tồn thực tế (kiểm kê)
- Xem lịch sử thay đổi tồn kho
- Cảnh báo tồn kho thấp

#### Thống kê, báo cáo bán hàng
- Doanh thu theo ngày, tuần, tháng
- Món bán chạy nhất
- Combo bán chạy
- Báo cáo theo ca làm việc
- Xuất file Excel/PDF

#### Cảnh báo tồn kho
- Khi số lượng một NVL dưới định mức, hệ thống hiện cảnh báo
- Notification trên web
- Email (nếu cấu hình)
- Hiển thị trên dashboard

### 2.3. Admin (Quản trị hệ thống)

#### Quản lý kho, nguyên vật liệu (nhập / xuất)
- Tạo phiếu nhập kho:
  - Nhà cung cấp
  - Số lượng
  - Đơn giá
  - Ngày nhập
  - Người nhập
- Tạo phiếu xuất kho:
  - Cho bếp
  - Cho chi nhánh khác (nếu có)
  - Lý do xuất
- Xem lịch sử nhập xuất
- In phiếu nhập/xuất

#### Quản lý thực đơn, combo
- Thêm, sửa, xóa món
- Cài đặt giá, mô tả, hình ảnh món ăn
- Tạo combo:
  - Chọn nhiều món
  - Đặt giá combo
  - Mô tả combo
- Thiết lập trạng thái:
  - Còn bán
  - Tạm ngưng
- Quản lý danh mục món ăn
- Thiết lập nguyên liệu cho từng món

#### Quản lý bàn ăn
- Tạo danh sách bàn
- Số bàn, khu vực
- Cập nhật trạng thái bàn:
  - Trống
  - Đã đặt trước
  - Đang phục vụ
  - Bảo trì
- Xem bản đồ bàn (nếu có)

#### Quản lý tài khoản người dùng
- Tạo tài khoản mới
- Phân quyền (Customer, Manager, Admin)
- Khóa/mở khóa tài khoản
- Xem danh sách người dùng
- Reset mật khẩu

#### Báo cáo doanh thu, tồn kho
- Xem tổng quan doanh thu toàn hệ thống
- Báo cáo tồn kho chi tiết
- Lọc theo:
  - Ngày, tháng, năm
  - Ca làm việc
  - Chi nhánh (nếu sau này mở rộng)
- Xuất báo cáo Excel/PDF

#### Quản lý voucher
- Tạo voucher mới
- Thiết lập điều kiện áp dụng
- Giới hạn số lượng sử dụng
- Thời gian hiệu lực
- Xem lịch sử sử dụng voucher

## 3. Use Case List

### Customer
- UC1: Đăng ký tài khoản
- UC2: Đăng nhập hệ thống
- UC3: Xem thực đơn
- UC4: Tìm kiếm món
- UC5: Đặt hàng online
- UC6: Nhập voucher giảm giá
- UC7: Thanh toán online
- UC8: Xem điểm thưởng hiện có
- UC9: Dùng điểm đổi ưu đãi
- UC10: Xem lịch sử đơn hàng
- UC11: Cập nhật thông tin cá nhân
- UC12: Chọn hình thức nhận hàng

### Quản lý
- UC13: Xác nhận đơn hàng
- UC14: Tạo đơn hàng tại quầy
- UC15: Cập nhật trạng thái đơn hàng
- UC16: Cập nhật trạng thái thanh toán
- UC17: Tra cứu đơn hàng
- UC18: Xem thống kê bán hàng
- UC19: Xem tình trạng tồn kho
- UC20: Nhận cảnh báo tồn kho thấp
- UC21: Điều chỉnh tồn kho (kiểm kê)

### Admin
- UC22: Quản lý tài khoản người dùng
- UC23: Quản lý kho NVL (nhập / xuất)
- UC24: Quản lý thực đơn
- UC25: Quản lý combo
- UC26: Quản lý bàn ăn
- UC27: Xem báo cáo doanh thu tổng hợp
- UC28: Xem báo cáo tồn kho tổng hợp
- UC29: Quản lý voucher
- UC30: Quản lý nhà cung cấp

## 4. Database Schema

### Collections cần có:

1. **users** - Người dùng
2. **orders** - Đơn hàng
3. **menu** - Thực đơn
4. **combos** - Combo món ăn
5. **inventory** - Kho hàng
6. **inventory_logs** - Lịch sử nhập/xuất kho
7. **tables** - Bàn ăn
8. **vouchers** - Mã giảm giá
9. **suppliers** - Nhà cung cấp
10. **payment_logs** - Lịch sử thanh toán
11. **points_history** - Lịch sử tích điểm
12. **notifications** - Thông báo

## 5. API Endpoints cần bổ sung

### Customer
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `PUT /api/customer/profile` - Cập nhật thông tin
- `GET /api/customer/orders/:orderId` - Chi tiết đơn hàng
- `POST /api/customer/orders/:orderId/payment` - Thanh toán
- `GET /api/customer/menu/categories` - Danh mục món
- `GET /api/customer/vouchers/available` - Voucher có thể dùng

### Manager
- `GET /api/manager/orders/pending` - Đơn chờ xác nhận
- `POST /api/manager/orders/:orderId/check-inventory` - Kiểm tra tồn kho
- `PUT /api/manager/orders/:orderId/status` - Cập nhật trạng thái
- `GET /api/manager/reports/shifts` - Báo cáo theo ca
- `GET /api/manager/reports/popular-items` - Món bán chạy

### Admin
- `GET /api/admin/users` - Danh sách người dùng
- `POST /api/admin/users` - Tạo người dùng
- `PUT /api/admin/users/:id` - Cập nhật người dùng
- `GET /api/admin/inventory/logs` - Lịch sử nhập xuất
- `POST /api/admin/suppliers` - Quản lý nhà cung cấp
- `GET /api/admin/vouchers` - Quản lý voucher
- `POST /api/admin/vouchers` - Tạo voucher

