# Firestore Security Rules

## Vấn đề

Nếu bạn gặp lỗi "Missing or insufficient permissions" khi đăng nhập, đó là do Firestore Security Rules đang chặn truy vấn từ client-side.

## Giải pháp

### Cách 1: Cập nhật Firestore Security Rules (Khuyến nghị)

1. Vào Firebase Console: https://console.firebase.google.com/
2. Chọn project: **nha-hang-phuong-anh**
3. Vào **Firestore Database** → **Rules**
4. Copy và paste đoạn rules sau:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function để kiểm tra user đã đăng nhập
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function để lấy role của user
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Users - user có thể đọc thông tin của chính mình, hoặc query theo email để đăng nhập
    match /users/{userId} {
      allow read: if isSignedIn() && (
        request.auth.uid == userId || 
        request.query.limit == 1 // Cho phép query với limit 1 để tìm user theo email
      );
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
    
    // Orders - user chỉ đọc được đơn của mình, manager/admin đọc được tất cả
    match /orders/{orderId} {
      allow read: if isSignedIn() && (
        resource.data.userId == request.auth.uid || 
        getUserRole() in ['manager', 'admin']
      );
      allow create: if isSignedIn();
      allow update: if isSignedIn() && getUserRole() in ['manager', 'admin'];
    }
    
    // Menu - tất cả đều đọc được, chỉ admin mới viết được
    match /menu/{menuId} {
      allow read: if true; // Cho phép đọc công khai
      allow write: if isSignedIn() && getUserRole() == 'admin';
    }
    
    // Combos - tất cả đều đọc được
    match /combos/{comboId} {
      allow read: if true;
      allow write: if isSignedIn() && getUserRole() == 'admin';
    }
    
    // Inventory - chỉ manager và admin
    match /inventory/{inventoryId} {
      allow read: if isSignedIn() && getUserRole() in ['manager', 'admin'];
      allow write: if isSignedIn() && getUserRole() == 'admin';
    }
    
    // Tables - chỉ manager và admin
    match /tables/{tableId} {
      allow read: if isSignedIn() && getUserRole() in ['manager', 'admin'];
      allow write: if isSignedIn() && getUserRole() == 'admin';
    }
    
    // Vouchers - tất cả đều đọc được, chỉ admin mới viết được
    match /vouchers/{voucherId} {
      allow read: if true;
      allow write: if isSignedIn() && getUserRole() == 'admin';
    }
    
    // Suppliers - chỉ admin
    match /suppliers/{supplierId} {
      allow read: if isSignedIn() && getUserRole() == 'admin';
      allow write: if isSignedIn() && getUserRole() == 'admin';
    }
    
    // Inventory logs - chỉ admin
    match /inventory_logs/{logId} {
      allow read: if isSignedIn() && getUserRole() == 'admin';
      allow write: if isSignedIn() && getUserRole() == 'admin';
    }
    
    // Payment logs - chỉ admin và manager
    match /payment_logs/{logId} {
      allow read: if isSignedIn() && getUserRole() in ['manager', 'admin'];
      allow write: if isSignedIn();
    }
    
    // Points history - user chỉ đọc được của mình
    match /points_history/{historyId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow write: if isSignedIn();
    }
  }
}
```

5. Click **"Publish"** để lưu rules

### Cách 2: Sử dụng Test Mode (Chỉ để test, không dùng cho production)

1. Vào **Firestore Database** → **Rules**
2. Thay đổi rules thành:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

⚠️ **Cảnh báo**: Rules này cho phép đọc/ghi tất cả trong 30 ngày. Chỉ dùng để test!

### Cách 3: Code đã có fallback

Code hiện tại đã có fallback - nếu Firestore query thất bại, nó sẽ sử dụng role từ mapping (`accounts` object). Vì vậy đăng nhập vẫn sẽ hoạt động ngay cả khi Firestore Rules chặn.

## Kiểm tra Rules

Sau khi cập nhật rules, thử đăng nhập lại. Nếu vẫn lỗi, kiểm tra:
1. Rules đã được publish chưa
2. User đã đăng nhập Firebase Auth chưa (cần đăng nhập trước khi query Firestore)
3. Console có log gì không

## Lưu ý

- Rules ở trên cho phép user đã đăng nhập query collection `users` với `limit(1)` để tìm user theo email
- Điều này cần thiết cho chức năng đăng nhập
- Trong production, nên tạo API endpoint để lấy role từ server-side thay vì query trực tiếp từ client

