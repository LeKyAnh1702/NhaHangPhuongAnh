# Hướng Dẫn Cấu Hình Firebase - Chi Tiết Từng Bước

## Bước 1: Tạo Firebase Project

1. Truy cập: https://console.firebase.google.com/
2. Click **"Add project"** hoặc chọn project có sẵn
3. Nhập tên project (ví dụ: "nha-hang-phuong-anh")
4. Click **"Continue"** và làm theo hướng dẫn
5. **Ghi lại Project ID** (sẽ cần dùng sau)

## Bước 2: Bật Authentication (Email/Password)

1. Trong Firebase Console, vào menu bên trái, chọn **"Authentication"**
2. Click **"Get started"** (nếu lần đầu)
3. Chọn tab **"Sign-in method"**
4. Click vào **"Email/Password"**
5. Bật **"Enable"** cho Email/Password
6. Click **"Save"**

## Bước 3: Tạo Firestore Database

1. Vào menu bên trái, chọn **"Firestore Database"**
2. Click **"Create database"**
3. Chọn chế độ:
   - **Production mode** (cho production)
   - **Test mode** (cho development - cho phép đọc/ghi trong 30 ngày)
4. Chọn **location** gần nhất (ví dụ: `asia-southeast1` cho Việt Nam)
5. Click **"Enable"**

## Bước 4: Lấy Firebase Config (cho Client-side)

1. Vào **Project Settings** (biểu tượng bánh răng ⚙️ bên cạnh "Project Overview")
2. Scroll xuống phần **"Your apps"**
3. Click vào biểu tượng **Web** (`</>`)
4. Đăng ký app:
   - Nhập tên app (ví dụ: "Nhà Hàng Phương Anh")
   - **KHÔNG** tick "Also set up Firebase Hosting"
   - Click **"Register app"**
5. Copy đoạn code config hiển thị, ví dụ:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

6. **Lưu lại các giá trị này** để điền vào file `.env` và các file JavaScript

## Bước 5: Tải Service Account Key (cho Server-side)

1. Vẫn trong **Project Settings**
2. Chọn tab **"Service accounts"**
3. Click **"Generate new private key"**
4. Click **"Generate key"** trong popup xác nhận
5. File JSON sẽ được tải xuống (tên file dạng: `your-project-id-firebase-adminsdk-xxxxx-xxxxx.json`)
6. **Đổi tên file thành `serviceAccountKey.json`**
7. **Di chuyển file vào thư mục gốc của project** (`E:\NhaHangPhuongAnh\`)

⚠️ **QUAN TRỌNG:** File này chứa thông tin bảo mật, KHÔNG được commit lên Git!

## Bước 6: Tạo file .env

1. Tạo file mới tên `.env` trong thư mục gốc của project
2. Copy nội dung sau và điền thông tin từ Firebase:

```env
# Firebase Configuration (lấy từ Bước 4)
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop

# Server Configuration
PORT=3000
NODE_ENV=development
```

3. Thay thế các giá trị:
   - `FIREBASE_API_KEY` = giá trị `apiKey` từ Bước 4
   - `FIREBASE_AUTH_DOMAIN` = giá trị `authDomain` từ Bước 4
   - `FIREBASE_PROJECT_ID` = giá trị `projectId` từ Bước 4
   - `FIREBASE_STORAGE_BUCKET` = giá trị `storageBucket` từ Bước 4
   - `FIREBASE_MESSAGING_SENDER_ID` = giá trị `messagingSenderId` từ Bước 4
   - `FIREBASE_APP_ID` = giá trị `appId` từ Bước 4

## Bước 7: Cập nhật Firebase Config trong Client-side

### 7.1. Cập nhật `public/customer/customer.js`

Mở file `public/customer/customer.js`, tìm dòng:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};
```

Thay thế bằng thông tin từ Bước 4.

### 7.2. (Tùy chọn) Cập nhật các file khác nếu cần

Nếu bạn muốn sử dụng Firebase trong `manager.js` hoặc `admin.js`, cũng cập nhật tương tự.

## Bước 8: Cấu hình Firestore Security Rules

1. Vào **Firestore Database** trong Firebase Console
2. Chọn tab **"Rules"**
3. Copy và paste đoạn rules sau:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function để kiểm tra role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Users - user chỉ đọc được thông tin của mình
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Orders - user đọc được đơn của mình, manager/admin đọc được tất cả
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         getUserRole() in ['manager', 'admin']);
      allow create: if request.auth != null;
      allow update: if request.auth != null && getUserRole() in ['manager', 'admin'];
    }
    
    // Menu - tất cả đều đọc được, chỉ admin mới viết được
    match /menu/{menuId} {
      allow read: if true;
      allow write: if request.auth != null && getUserRole() == 'admin';
    }
    
    // Inventory - chỉ manager và admin
    match /inventory/{inventoryId} {
      allow read: if request.auth != null && getUserRole() in ['manager', 'admin'];
      allow write: if request.auth != null && getUserRole() == 'admin';
    }
    
    // Tables - chỉ manager và admin
    match /tables/{tableId} {
      allow read: if request.auth != null && getUserRole() in ['manager', 'admin'];
      allow write: if request.auth != null && getUserRole() == 'admin';
    }
    
    // Vouchers - tất cả đều đọc được, chỉ admin mới viết được
    match /vouchers/{voucherId} {
      allow read: if true;
      allow write: if request.auth != null && getUserRole() == 'admin';
    }
    
    // Inventory logs - chỉ admin
    match /inventory_logs/{logId} {
      allow read: if request.auth != null && getUserRole() == 'admin';
      allow write: if request.auth != null && getUserRole() == 'admin';
    }
  }
}
```

4. Click **"Publish"**

## Bước 9: Kiểm tra cấu hình

1. Đảm bảo file `serviceAccountKey.json` có trong thư mục gốc
2. Đảm bảo file `.env` có trong thư mục gốc và đã điền đầy đủ thông tin
3. Khởi động server:

```bash
npm start
```

4. Nếu không có lỗi, server sẽ chạy tại: `http://localhost:3000`

## Troubleshooting

### Lỗi: "Cannot find module './serviceAccountKey.json'"
- Kiểm tra file `serviceAccountKey.json` có trong thư mục gốc
- Kiểm tra tên file chính xác (không có khoảng trắng, đúng extension)

### Lỗi: "Error: Could not load the default credentials"
- Kiểm tra file `serviceAccountKey.json` có đúng format JSON
- Kiểm tra file không bị corrupt

### Lỗi: "Permission denied" khi truy cập Firestore
- Kiểm tra Firestore Security Rules đã được publish
- Kiểm tra Service Account có quyền truy cập Firestore
- Vào IAM & Admin trong Google Cloud Console để kiểm tra permissions

### Lỗi: "Firebase: Error (auth/invalid-api-key)"
- Kiểm tra lại `FIREBASE_API_KEY` trong file `.env`
- Kiểm tra lại `apiKey` trong `customer.js`

## Checklist hoàn thành

- [ ] Firebase project đã được tạo
- [ ] Authentication (Email/Password) đã được bật
- [ ] Firestore Database đã được tạo
- [ ] Service Account Key đã được tải và đặt vào thư mục gốc (đổi tên thành `serviceAccountKey.json`)
- [ ] File `.env` đã được tạo và điền đầy đủ thông tin
- [ ] Firebase config trong `customer.js` đã được cập nhật
- [ ] Firestore Security Rules đã được cấu hình và publish
- [ ] Server đã khởi động thành công không có lỗi

Sau khi hoàn thành tất cả các bước trên, hệ thống của bạn đã sẵn sàng để sử dụng!

