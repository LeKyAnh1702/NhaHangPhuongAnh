# Hệ Thống Quản Lý Nhà Hàng Phương Anh

Hệ thống quản lý nhà hàng hoàn chỉnh với Node.js, Express và Firebase.

## Tính năng

### Customer (Khách hàng)
- Đặt hàng online
- Tích điểm và đổi điểm
- Tìm kiếm món ăn
- Nhập voucher giảm giá
- Thanh toán online
- Xem lịch sử đơn hàng

### Manager (Quản lý)
- Xác nhận đơn đặt hàng
- Tạo đơn hàng
- Cập nhật đơn hàng (thanh toán, trạng thái)
- Tìm kiếm đơn hàng
- Quản lý kho thực phẩm, NVL
- Thống kê, báo cáo bán hàng
- Cảnh báo tồn kho

### Admin
- Quản lý kho, NVL (nhập/xuất)
- Quản lý thực đơn, combo
- Quản lý bàn ăn
- Báo cáo doanh thu, tồn kho

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` từ `.env.example` và điền thông tin Firebase của bạn

3. Tạo file `serviceAccountKey.json` từ Firebase Console (Project Settings > Service Accounts)

4. Khởi động server:
```bash
npm start
```

Hoặc chạy ở chế độ development:
```bash
npm run dev
```

## Cấu trúc dự án

```
├── config/
│   └── firebase.js          # Cấu hình Firebase Admin
├── routes/
│   ├── auth.js              # API xác thực
│   ├── customer.js          # API cho khách hàng
│   ├── manager.js           # API cho quản lý
│   └── admin.js             # API cho admin
├── public/
│   ├── index.html           # Trang chủ
│   ├── customer/            # Trang khách hàng
│   ├── manager/             # Trang quản lý
│   └── admin/               # Trang admin
├── images/                  # Thư mục ảnh
├── server.js                # Server Express
└── package.json
```

## Firebase Setup

1. Tạo project mới trên Firebase Console
2. Bật Authentication (Email/Password)
3. Tạo Firestore Database
4. Tải serviceAccountKey.json
5. Cập nhật thông tin trong `.env`

## Database Schema

### Collections:
- `users` - Thông tin người dùng
- `orders` - Đơn hàng
- `menu` - Thực đơn
- `inventory` - Kho hàng
- `tables` - Bàn ăn
- `vouchers` - Mã giảm giá
- `inventory_logs` - Lịch sử nhập/xuất kho

## API Endpoints

### Customer
- `POST /api/customer/orders` - Đặt hàng
- `GET /api/customer/orders/:userId` - Lấy đơn hàng
- `POST /api/customer/points/add` - Tích điểm
- `GET /api/customer/menu` - Lấy thực đơn
- `GET /api/customer/menu/search` - Tìm kiếm món

### Manager
- `PUT /api/manager/orders/:orderId/confirm` - Xác nhận đơn
- `POST /api/manager/orders` - Tạo đơn
- `PUT /api/manager/orders/:orderId` - Cập nhật đơn
- `GET /api/manager/inventory` - Lấy kho hàng
- `GET /api/manager/reports/sales` - Báo cáo bán hàng

### Admin
- `POST /api/admin/inventory/import` - Nhập kho
- `POST /api/admin/inventory/export` - Xuất kho
- `POST /api/admin/menu` - Thêm món
- `GET /api/admin/tables` - Lấy danh sách bàn
- `GET /api/admin/reports/revenue` - Báo cáo doanh thu
- `GET /api/admin/reports/inventory` - Báo cáo tồn kho

## License

ISC


