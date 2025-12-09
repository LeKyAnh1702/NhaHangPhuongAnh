// Script để cập nhật customerPhone cho các order cũ
// Chạy: node scripts/update-orders-customer-phone.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Khởi tạo Firebase Admin nếu chưa được khởi tạo
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updateOrdersCustomerPhone() {
    try {
        console.log('Bắt đầu cập nhật customerPhone cho các order...\n');
        
        // Lấy tất cả orders
        const ordersSnapshot = await db.collection('orders').get();
        console.log(`Tìm thấy ${ordersSnapshot.size} orders\n`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // Xử lý từng order
        for (const orderDoc of ordersSnapshot.docs) {
            const orderData = orderDoc.data();
            const orderId = orderDoc.id;
            
            // Kiểm tra xem order đã có customerPhone chưa
            if (orderData.customerPhone && orderData.customerPhone !== null && orderData.customerPhone !== '') {
                console.log(`Order ${orderId}: Đã có customerPhone (${orderData.customerPhone}), bỏ qua`);
                skippedCount++;
                continue;
            }
            
            // Nếu không có customerId, không thể cập nhật
            if (!orderData.customerId) {
                console.log(`Order ${orderId}: Không có customerId, không thể cập nhật customerPhone`);
                skippedCount++;
                continue;
            }
            
            try {
                // Lấy thông tin customer từ collection customers
                const customerDoc = await db.collection('customers').doc(orderData.customerId).get();
                
                if (!customerDoc.exists) {
                    console.log(`Order ${orderId}: Không tìm thấy customer với ID ${orderData.customerId}`);
                    skippedCount++;
                    continue;
                }
                
                const customerData = customerDoc.data();
                const customerPhone = customerData.phone;
                
                if (!customerPhone || customerPhone === null || customerPhone === '') {
                    console.log(`Order ${orderId}: Customer không có phone number`);
                    skippedCount++;
                    continue;
                }
                
                // Cập nhật order với customerPhone
                await db.collection('orders').doc(orderId).update({
                    customerPhone: customerPhone,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`✓ Order ${orderId}: Đã cập nhật customerPhone = ${customerPhone}`);
                updatedCount++;
                
            } catch (error) {
                console.error(`✗ Order ${orderId}: Lỗi khi cập nhật - ${error.message}`);
                errorCount++;
            }
        }
        
        console.log('\n=== KẾT QUẢ ===');
        console.log(`Tổng số orders: ${ordersSnapshot.size}`);
        console.log(`Đã cập nhật: ${updatedCount}`);
        console.log(`Đã bỏ qua: ${skippedCount}`);
        console.log(`Lỗi: ${errorCount}`);
        console.log('\nHoàn thành!');
        
    } catch (error) {
        console.error('Lỗi khi chạy script:', error);
        process.exit(1);
    }
}

// Chạy script
updateOrdersCustomerPhone()
    .then(() => {
        console.log('\nScript đã hoàn thành.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Lỗi:', error);
        process.exit(1);
    });

