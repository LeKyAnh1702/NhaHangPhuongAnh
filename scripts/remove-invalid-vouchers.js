// Script để xóa các voucher không đúng điều kiện hiện tại
// Điều kiện: 10 hóa đơn, 5 triệu VNĐ và 50 điểm
// Chạy: node scripts/remove-invalid-vouchers.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function removeInvalidVouchers() {
    console.log('Bắt đầu kiểm tra và xóa các voucher không đúng điều kiện...\n');
    console.log('Điều kiện để có voucher:');
    console.log('- Số hóa đơn: >= 10');
    console.log('- Tổng doanh số: >= 5 triệu VNĐ');
    console.log('- Điểm tích lũy: >= 50 điểm\n');

    try {
        // Lấy tất cả voucher
        const vouchersSnapshot = await db.collection('vouchers').get();
        const vouchers = vouchersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`Tìm thấy ${vouchers.length} voucher trong hệ thống\n`);

        // Lấy tất cả hóa đơn đã thanh toán
        const allPaidOrdersSnapshot = await db.collection('orders')
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'paid')
            .get();

        // Lấy tất cả khách hàng
        const customersSnapshot = await db.collection('customers').get();
        const customersMap = {};
        customersSnapshot.docs.forEach(doc => {
            customersMap[doc.id] = { id: doc.id, ...doc.data() };
        });

        // Chuẩn hóa số điện thoại để so sánh
        const normalizePhone = (phone) => {
            if (!phone) return '';
            return phone.toString().replace(/[\s\+\-\(\)]/g, '').trim();
        };

        let totalVouchersChecked = 0;
        let totalVouchersRemoved = 0;
        let totalVouchersKept = 0;
        let totalErrors = 0;

        // Nhóm voucher theo customerId
        const vouchersByCustomer = {};
        vouchers.forEach(voucher => {
            if (!vouchersByCustomer[voucher.customerId]) {
                vouchersByCustomer[voucher.customerId] = [];
            }
            vouchersByCustomer[voucher.customerId].push(voucher);
        });

        for (const customerId in vouchersByCustomer) {
            try {
                const customer = customersMap[customerId];
                if (!customer) {
                    console.log(`\n⚠️  Khách hàng ${customerId} không tồn tại, xóa tất cả voucher của khách hàng này`);
                    for (const voucher of vouchersByCustomer[customerId]) {
                        await db.collection('vouchers').doc(voucher.id).delete();
                        totalVouchersRemoved++;
                        console.log(`  ✓ Đã xóa voucher ${voucher.id}`);
                    }
                    continue;
                }

                console.log(`\n=== Kiểm tra khách hàng: ${customer.name || 'N/A'} (${customerId}) ===`);

                const customerPhoneNormalized = normalizePhone(customer.phone);

                // Lọc hóa đơn của khách hàng này
                const paidOrders = allPaidOrdersSnapshot.docs.filter(orderDoc => {
                    const order = orderDoc.data();
                    if (order.customerId === customerId) return true;
                    if (customerPhoneNormalized) {
                        const orderPhoneNormalized = normalizePhone(
                            order.customerPhone || 
                            (order.customer && order.customer.phone) || 
                            ''
                        );
                        if (orderPhoneNormalized && orderPhoneNormalized === customerPhoneNormalized) {
                            return true;
                        }
                    }
                    if (customer.name) {
                        const customerNameLower = customer.name.toLowerCase().trim();
                        const orderName = order.customerName || 
                            (order.customer && order.customer.name ? order.customer.name : '') || 
                            '';
                        const orderNameLower = orderName.toLowerCase().trim();
                        if (orderNameLower && orderNameLower === customerNameLower) {
                            return true;
                        }
                    }
                    return false;
                });

                // Tính tổng doanh thu
                let totalRevenue = 0;
                paidOrders.forEach(orderDoc => {
                    const order = orderDoc.data();
                    totalRevenue += (order.finalTotal || order.total || 0);
                });

                const ordersCount = paidOrders.length;
                const totalPoints = Math.floor(totalRevenue / 200000);

                // Đếm số voucher hiện có
                const vouchersCount = vouchersByCustomer[customerId].length;
                const pointsUsedForVouchers = vouchersCount * 50;
                const remainingPoints = totalPoints - pointsUsedForVouchers;

                console.log(`Số hóa đơn: ${ordersCount}`);
                console.log(`Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
                console.log(`Tổng điểm: ${totalPoints}`);
                console.log(`Số voucher hiện có: ${vouchersCount}`);
                console.log(`Điểm còn lại: ${remainingPoints}`);

                // Kiểm tra điều kiện
                const hasEnoughOrders = ordersCount >= 10;
                const hasEnoughRevenue = totalRevenue >= 5000000;
                const hasEnoughPoints = remainingPoints >= 50;

                console.log(`Điều kiện: ${hasEnoughOrders ? '✓' : '✗'} (>= 10 hóa đơn), ${hasEnoughRevenue ? '✓' : '✗'} (>= 5 triệu), ${hasEnoughPoints ? '✓' : '✗'} (>= 50 điểm)`);

                if (!hasEnoughOrders || !hasEnoughRevenue || !hasEnoughPoints) {
                    // Không đủ điều kiện, xóa tất cả voucher
                    console.log(`❌ Không đủ điều kiện, xóa ${vouchersCount} voucher`);
                    for (const voucher of vouchersByCustomer[customerId]) {
                        await db.collection('vouchers').doc(voucher.id).delete();
                        totalVouchersRemoved++;
                        console.log(`  ✓ Đã xóa voucher ${voucher.id}`);
                    }
                } else {
                    // Đủ điều kiện, nhưng cần kiểm tra số lượng voucher có hợp lý không
                    // Tính số voucher tối đa có thể có dựa trên điểm
                    const maxVouchers = Math.floor(totalPoints / 50);
                    const currentVouchers = vouchersByCustomer[customerId].length;

                    if (currentVouchers > maxVouchers) {
                        console.log(`⚠️  Số voucher (${currentVouchers}) vượt quá số voucher tối đa có thể có (${maxVouchers}), xóa ${currentVouchers - maxVouchers} voucher thừa`);
                        // Xóa voucher thừa (giữ lại voucher mới nhất)
                        const sortedVouchers = vouchersByCustomer[customerId].sort((a, b) => {
                            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                            return bTime - aTime; // Sắp xếp mới nhất trước
                        });
                        const vouchersToRemove = sortedVouchers.slice(maxVouchers);
                        for (const voucher of vouchersToRemove) {
                            await db.collection('vouchers').doc(voucher.id).delete();
                            totalVouchersRemoved++;
                            console.log(`  ✓ Đã xóa voucher ${voucher.id}`);
                        }
                        totalVouchersKept += maxVouchers;
                    } else {
                        console.log(`✓ Đủ điều kiện, giữ lại ${currentVouchers} voucher`);
                        totalVouchersKept += currentVouchers;
                    }
                }

                totalVouchersChecked += vouchersByCustomer[customerId].length;

            } catch (error) {
                console.error(`✗ Lỗi khi xử lý khách hàng ${customerId}:`, error);
                totalErrors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('KẾT QUẢ:');
        console.log(`Tổng số voucher đã kiểm tra: ${totalVouchersChecked}`);
        console.log(`Số voucher đã xóa: ${totalVouchersRemoved}`);
        console.log(`Số voucher được giữ lại: ${totalVouchersKept}`);
        console.log(`Số lỗi: ${totalErrors}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Lỗi khi chạy script:', error);
        process.exit(1);
    }
}

// Chạy script
removeInvalidVouchers()
    .then(() => {
        console.log('\nHoàn thành!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Lỗi:', error);
        process.exit(1);
    });

