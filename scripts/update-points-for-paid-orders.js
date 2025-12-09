// Script để cập nhật điểm tích lũy cho các hóa đơn đã thanh toán nhưng chưa được tích điểm
// Chạy: node scripts/update-points-for-paid-orders.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Khởi tạo Firebase Admin nếu chưa được khởi tạo
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updatePointsForPaidOrders() {
    try {
        console.log('Bắt đầu cập nhật điểm tích lũy cho các hóa đơn đã thanh toán...\n');
        
        // Lấy tất cả đơn hàng đã thanh toán và hoàn thành
        const ordersSnapshot = await db.collection('orders')
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'paid')
            .get();
        
        console.log(`Tìm thấy ${ordersSnapshot.size} đơn hàng đã thanh toán\n`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // Xử lý từng order
        for (const orderDoc of ordersSnapshot.docs) {
            const orderData = orderDoc.data();
            const orderId = orderDoc.id;
            
            console.log(`\n=== Processing Order ${orderId} ===`);
            console.log(`Customer Name: ${orderData.customerName || 'N/A'}`);
            console.log(`Customer Phone: ${orderData.customerPhone || 'N/A'}`);
            console.log(`Customer ID: ${orderData.customerId || 'N/A'}`);
            console.log(`Final Total: ${orderData.finalTotal || orderData.total || 0} VNĐ`);
            
            // Tính điểm: 1 điểm = 200 nghìn
            const amount = orderData.finalTotal || orderData.total || 0;
            const pointsToAdd = Math.floor(amount / 200000);
            
            if (pointsToAdd <= 0) {
                console.log(`Skipping: Amount too small (${amount} VNĐ = ${pointsToAdd} points)`);
                skippedCount++;
                continue;
            }
            
            let customerId = orderData.customerId;
            
            // Nếu không có customerId, thử tìm từ customerPhone
            if (!customerId && orderData.customerPhone) {
                try {
                    console.log(`No customerId, trying to find by phone: ${orderData.customerPhone}`);
                    // Load tất cả customers và filter (tránh lỗi index)
                    const allCustomers = await db.collection('customers').get();
                    const foundCustomer = allCustomers.docs.find(doc => {
                        const data = doc.data();
                        return data.phone === orderData.customerPhone && data.isActive !== false;
                    });
                    
                    if (foundCustomer) {
                        customerId = foundCustomer.id;
                        console.log(`✓ Found customerId by phone: ${customerId}`);
                    } else {
                        console.log(`✗ Customer not found by phone`);
                    }
                } catch (error) {
                    console.error(`✗ Error finding customer by phone:`, error);
                }
            }
            
            // Nếu vẫn không có customerId, thử tìm theo tên
            if (!customerId && orderData.customerName && orderData.customerName !== 'Khách lẻ') {
                try {
                    console.log(`No customerId, trying to find by name: ${orderData.customerName}`);
                    // Load tất cả customers và filter (tránh lỗi index)
                    const allCustomers = await db.collection('customers').get();
                    const foundCustomer = allCustomers.docs.find(doc => {
                        const data = doc.data();
                        return data.name === orderData.customerName && data.isActive !== false;
                    });
                    
                    if (foundCustomer) {
                        customerId = foundCustomer.id;
                        console.log(`✓ Found customerId by name: ${customerId}`);
                    } else {
                        console.log(`✗ Customer not found by name`);
                    }
                } catch (error) {
                    console.error(`✗ Error finding customer by name:`, error);
                }
            }
            
            if (!customerId) {
                console.log(`✗ Cannot find customerId for order ${orderId}, skipping`);
                skippedCount++;
                continue;
            }
            
            try {
                // Lấy thông tin customer hiện tại
                const customerRef = db.collection('customers').doc(customerId);
                const customerDoc = await customerRef.get();
                
                if (!customerDoc.exists) {
                    console.log(`✗ Customer not found: ${customerId}`);
                    skippedCount++;
                    continue;
                }
                
                const customerData = customerDoc.data();
                const currentPoints = customerData.points || 0;
                const newPoints = currentPoints + pointsToAdd;
                
                console.log(`Current points: ${currentPoints}`);
                console.log(`Points to add: ${pointsToAdd}`);
                console.log(`New points: ${newPoints}`);
                
                // Cập nhật điểm
                await customerRef.update({
                    points: newPoints,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                // Lưu lịch sử tích điểm
                await db.collection('pointsHistory').add({
                    customerId: customerId,
                    points: pointsToAdd,
                    amount: amount,
                    type: 'earned',
                    orderId: orderId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                // Cập nhật customerId vào order nếu chưa có
                if (!orderData.customerId) {
                    await db.collection('orders').doc(orderId).update({
                        customerId: customerId,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`✓ Updated customerId in order`);
                }
                
                console.log(`✓ Successfully updated points for customer ${customerId}`);
                updatedCount++;
                
            } catch (error) {
                console.error(`✗ Error updating points for order ${orderId}:`, error);
                errorCount++;
            }
        }
        
        console.log('\n=== KẾT QUẢ ===');
        console.log(`Tổng số đơn hàng đã thanh toán: ${ordersSnapshot.size}`);
        console.log(`Đã cập nhật điểm: ${updatedCount}`);
        console.log(`Đã bỏ qua: ${skippedCount}`);
        console.log(`Lỗi: ${errorCount}`);
        console.log('\nHoàn thành!');
        
    } catch (error) {
        console.error('Lỗi khi chạy script:', error);
        process.exit(1);
    }
}

// Chạy script
updatePointsForPaidOrders()
    .then(() => {
        console.log('\nScript đã hoàn thành.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Lỗi:', error);
        process.exit(1);
    });

