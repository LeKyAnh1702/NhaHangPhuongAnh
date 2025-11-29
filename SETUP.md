# Hướng Dẫn Cài Đặt

## Bước 1: Cài đặt Dependencies

```bash
npm install
```

## Bước 2: Cấu hình Firebase

### 2.1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Ghi lại Project ID

### 2.2. Bật Authentication

1. Vào **Authentication** > **Sign-in method**
2. Bật **Email/Password**
3. Lưu lại

### 2.3. Tạo Firestore Database

1. Vào **Firestore Database**
2. Chọn **Create database**
3. Chọn chế độ **Production mode** hoặc **Test mode** (để test)
4. Chọn location gần nhất

### 2.4. Tải Service Account Key

1. Vào **Project Settings** (biểu tượng bánh răng)
2. Chọn tab **Service accounts**
3. Click **Generate new private key**
4. Tải file JSON về
5. Đổi tên file thành `serviceAccountKey.json` và đặt vào thư mục gốc của project

### 2.5. Cấu hình Firebase Client

1. Vào **Project Settings** > **General**
2. Scroll xuống phần **Your apps**
3. Click **Web** (biểu tượng `</>`)
4. Đăng ký app (nếu chưa có)
5. Copy thông tin config và cập nhật vào:
   - `public/customer/customer.js`
   - `public/manager/manager.js` (nếu cần)
   - `public/admin/admin.js` (nếu cần)

## Bước 3: Tạo file .env

1. Copy file `.env.example` thành `.env`
2. Điền thông tin Firebase của bạn:

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

PORT=3000
NODE_ENV=development
```

## Bước 4: Khởi động Server

```bash
npm start
```

Hoặc chạy ở chế độ development (tự động reload):

```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

## Bước 5: Truy cập các trang

- **Trang chủ**: http://localhost:3000
- **Customer (Đặt hàng)**: http://localhost:3000/customer
- **Manager (Quản lý)**: http://localhost:3000/manager
- **Admin**: http://localhost:3000/admin

## Cấu trúc Database Firestore

Dự án sẽ tự động tạo các collection sau khi sử dụng:

### Collections:

1. **users** - Thông tin người dùng
   - `email`, `name`, `role`, `points`, `createdAt`

2. **orders** - Đơn hàng
   - `userId`, `items`, `total`, `discount`, `finalTotal`, `status`, `paymentStatus`, `createdAt`

3. **menu** - Thực đơn
   - `name`, `description`, `price`, `category`, `ingredients`, `imageUrl`, `isActive`

4. **inventory** - Kho hàng
   - `name`, `quantity`, `unit`, `minStock`, `price`, `supplier`

5. **tables** - Bàn ăn
   - `number`, `capacity`, `location`, `status`

6. **vouchers** - Mã giảm giá
   - `code`, `discount`, `isActive`, `expiryDate`

7. **inventory_logs** - Lịch sử nhập/xuất kho
   - `inventoryId`, `type`, `quantity`, `createdAt`

## Firestore Security Rules (Quan trọng!)

Thêm các rules sau vào Firestore để bảo mật:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users - chỉ user đó mới đọc được thông tin của mình
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Orders - user chỉ đọc được đơn của mình
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin']);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
    }
    
    // Menu - tất cả đều đọc được
    match /menu/{menuId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Inventory - chỉ manager và admin
    match /inventory/{inventoryId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Tables - chỉ manager và admin
    match /tables/{tableId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Vouchers - tất cả đều đọc được
    match /vouchers/{voucherId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Lưu ý

- Đảm bảo file `serviceAccountKey.json` không được commit lên Git (đã có trong .gitignore)
- Cập nhật Firebase config trong các file JavaScript client-side
- Kiểm tra Firestore Security Rules trước khi deploy production
- Tạo user với role phù hợp (customer, manager, admin) trong Authentication

## Troubleshooting

### Lỗi: "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### Lỗi: "Service account key not found"
- Kiểm tra file `serviceAccountKey.json` có trong thư mục gốc
- Kiểm tra tên file chính xác

### Lỗi: "Permission denied" khi truy cập Firestore
- Kiểm tra Firestore Security Rules
- Kiểm tra Service Account có quyền truy cập Firestore


