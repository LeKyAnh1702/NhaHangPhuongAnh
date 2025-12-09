// Script để tính lại điểm tích lũy và tự động đổi voucher cho tất cả khách hàng
// Chạy: node scripts/recalculate-points-and-vouchers.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function recalculatePointsAndVouchers() {
    console.log('Bắt đầu tính lại điểm tích lũy và tự động đổi voucher cho tất cả khách hàng...\n');

    try {
        const customersSnapshot = await db.collection('customers')
            .where('isActive', '!=', false)
            .get();

        const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Tìm thấy ${customers.length} khách hàng\n`);

        let updatedCount = 0;
        let vouchersCreatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const customer of customers) {
            try {
                console.log(`=== Xử lý khách hàng: ${customer.name || 'N/A'} (${customer.id}) ===`);
                
                // Lấy tất cả hóa đơn đã thanh toán
                // Tìm theo customerId, phone, hoặc name
                const allPaidOrdersSnapshot = await db.collection('orders')
                    .where('status', '==', 'completed')
                    .where('paymentStatus', '==', 'paid')
                    .get();
                
                // Lọc hóa đơn của khách hàng này
                const paidOrders = allPaidOrdersSnapshot.docs.filter(doc => {
                    const orderData = doc.data();
                    // Kiểm tra theo customerId
                    if (orderData.customerId === customer.id) return true;
                    // Kiểm tra theo phone
                    if (customer.phone && (
                        orderData.customerPhone === customer.phone ||
                        (orderData.customer && orderData.customer.phone === customer.phone)
                    )) return true;
                    // Kiểm tra theo name
                    if (customer.name && (
                        orderData.customerName === customer.name ||
                        (orderData.customer && orderData.customer.name === customer.name)
                    )) return true;
                    return false;
                });
                
                const paidOrdersSnapshot = {
                    docs: paidOrders,
                    size: paidOrders.length
                };
                
                // Cập nhật customerId cho các hóa đơn chưa có
                for (const orderDoc of paidOrders) {
                    const orderData = orderDoc.data();
                    if (orderData.customerId !== customer.id) {
                        await orderDoc.ref.update({
                            customerId: customer.id,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`✓ Cập nhật customerId cho hóa đơn ${orderDoc.id}`);
                    }
                }
                
                // Tính tổng doanh thu
                let totalRevenue = 0;
                paidOrdersSnapshot.docs.forEach(doc => {
                    const orderData = doc.data();
                    totalRevenue += (orderData.finalTotal || orderData.total || 0);
                });
                
                console.log(`Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
                
                // Tính tổng điểm
                const totalPoints = Math.floor(totalRevenue / 200000);
                console.log(`Tổng điểm: ${totalPoints}`);
                
                // Đếm số voucher đã đổi
                const vouchersSnapshot = await db.collection('vouchers')
                    .where('customerId', '==', customer.id)
                    .get();
                
                const vouchersCount = vouchersSnapshot.size;
                const pointsUsedForVouchers = vouchersCount * 50;
                let remainingPoints = totalPoints - pointsUsedForVouchers;
                
                console.log(`Số voucher hiện có: ${vouchersCount}`);
                console.log(`Điểm đã dùng để đổi voucher: ${pointsUsedForVouchers}`);
                console.log(`Điểm còn lại: ${remainingPoints}`);
                
                // Tự động đổi voucher nếu đạt điều kiện: 10 hóa đơn, 5 triệu VNĐ và 50 điểm
                const ordersCount = paidOrdersSnapshot.size;
                let vouchersCreated = 0;
                
                console.log(`Số hóa đơn: ${ordersCount}, Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
                console.log(`Điều kiện đổi voucher: ${ordersCount >= 10 ? '✓' : '✗'} (>= 10 hóa đơn), ${totalRevenue >= 5000000 ? '✓' : '✗'} (>= 5 triệu), ${remainingPoints >= 50 ? '✓' : '✗'} (>= 50 điểm)`);
                
                while (remainingPoints >= 50 && ordersCount >= 10 && totalRevenue >= 5000000) {
                    // Tạo voucher trị giá 500k
                    const voucherData = {
                        customerId: customer.id,
                        value: 500000,
                        pointsUsed: 50,
                        status: 'active',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        expiresAt: null
                    };
                    
                    await db.collection('vouchers').add(voucherData);
                    vouchersCreated++;
                    remainingPoints -= 50;
                    console.log(`✓ Tự động tạo voucher ${vouchersCreated}, điểm còn lại: ${remainingPoints}`);
                }
                
                // Cập nhật điểm còn lại
                await db.collection('customers').doc(customer.id).update({
                    points: remainingPoints,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`✓ Cập nhật điểm còn lại: ${remainingPoints}`);
                
                if (vouchersCreated > 0) {
                    vouchersCreatedCount += vouchersCreated;
                }
                updatedCount++;
                
                console.log('\n');
            } catch (error) {
                console.error(`✗ Lỗi khi xử lý khách hàng ${customer.id}:`, error);
                errorCount++;
            }
        }

        console.log('=== KẾT QUẢ ===');
        console.log(`Tổng số khách hàng: ${customers.length}`);
        console.log(`Đã cập nhật: ${updatedCount}`);
        console.log(`Tổng số voucher được tạo: ${vouchersCreatedCount}`);
        console.log(`Đã bỏ qua: ${skippedCount}`);
        console.log(`Lỗi: ${errorCount}`);

        console.log('\nHoàn thành!');
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi tải danh sách khách hàng:', error);
        process.exit(1);
    }
}

recalculatePointsAndVouchers();

