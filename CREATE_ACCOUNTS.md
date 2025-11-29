# Hướng Dẫn Tạo Tài Khoản Admin và Manager

## Tài khoản đã được tạo sẵn trên Firebase

### Tài khoản Admin:
- **Username**: `lekyanh123`
- **Email**: `admin@nhahangphuonganh.com`
- **Password**: `nhahangphuonganh`
- **Role**: `admin`

### Tài khoản Manager:
- **Username**: `lekyanh172`
- **Email**: `manager@nhahangphuonganh.com`
- **Password**: `nhahangphuonganh`
- **Role**: `manager`

## Cách đăng nhập

1. Truy cập trang chủ: http://localhost:3000
2. Click nút **"Đăng Nhập"** ở menu
3. Nhập username và password:
   - Admin: `lekyanh123` / `nhahangphuonganh`
   - Manager: `lekyanh172` / `nhahangphuonganh`
4. Hệ thống sẽ tự động chuyển hướng đến trang tương ứng

## Nếu cần tạo lại tài khoản

Nếu tài khoản chưa được tạo hoặc cần tạo lại, chạy script:

```bash
node scripts/create-accounts.js
```

**Lưu ý**: Script này yêu cầu file `serviceAccountKey.json` phải có trong thư mục gốc.

## Tạo tài khoản thủ công trên Firebase Console

1. Vào Firebase Console > Authentication
2. Click "Add user"
3. Nhập email và password
4. Vào Firestore Database > Collection `users`
5. Tạo document với:
   - `email`: email vừa tạo
   - `name`: Tên hiển thị
   - `role`: `admin` hoặc `manager`
   - `username`: `lekyanh123` hoặc `lekyanh172`
   - `isActive`: `true`

## Lưu ý

- Customer **KHÔNG CẦN** đăng nhập để đặt hàng
- Chỉ Admin và Manager mới cần đăng nhập
- Customer chỉ cần nhập tên và số điện thoại khi đặt hàng

