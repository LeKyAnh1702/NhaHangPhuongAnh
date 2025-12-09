const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// Kiểm tra khách hàng theo số điện thoại
router.get('/check', async (req, res) => {
    // Disable cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
        let { phone } = req.query;
        
        console.log('Received phone:', phone);
        
        if (!phone || phone.trim() === '') {
            return res.status(400).json({ success: false, error: 'Phone is required' });
        }
        
        // Chuẩn hóa số điện thoại: loại bỏ khoảng trắng và ký tự đặc biệt (giữ lại số và dấu +)
        phone = phone.trim();
        
        // Loại bỏ các ký tự không phải số hoặc dấu +
        let normalizedPhone = phone.replace(/[^\d+]/g, '');
        
        // Nếu bắt đầu bằng +84, chuyển thành 0
        if (normalizedPhone.startsWith('+84')) {
            normalizedPhone = '0' + normalizedPhone.substring(3);
        }
        
        // Kiểm tra format số điện thoại (10-11 chữ số, bắt đầu bằng 0)
        if (!/^0\d{9,10}$/.test(normalizedPhone)) {
            console.log('Invalid phone format:', normalizedPhone);
            // Không trả về lỗi, chỉ trả về customer null
            return res.json({ success: true, customer: null });
        }
        
        console.log('Normalized phone:', normalizedPhone);
        
        // Tìm khách hàng theo số điện thoại (thử cả format có và không có dấu cách)
        const phoneVariants = [
            normalizedPhone,
            normalizedPhone.replace(/(\d{4})(\d{3})(\d{3,4})/, '$1 $2 $3'), // Format: 0123 456 789
            normalizedPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'), // Format: 012 345 6789
        ];
        
        console.log('Phone variants:', phoneVariants);
        
        let foundCustomer = null;
        
        // Thử tìm với từng variant
        for (const phoneVariant of phoneVariants) {
            try {
                const customers = await db.collection('customers')
                    .where('phone', '==', phoneVariant)
                    .get();
                
                customers.docs.forEach(doc => {
                    const customer = doc.data();
                    if (customer.isActive !== false && !foundCustomer) {
                        foundCustomer = { id: doc.id, ...customer };
                        // Đảm bảo points được trả về (mặc định là 0 nếu không có)
                        if (foundCustomer.points === undefined) {
                            foundCustomer.points = 0;
                        }
                    }
                });
                
                if (foundCustomer) {
                    console.log('Found customer:', foundCustomer.id);
                    break;
                }
            } catch (dbError) {
                console.error('Database error for variant', phoneVariant, ':', dbError);
            }
        }
        
        if (foundCustomer) {
            // Tính lại điểm tích lũy từ hóa đơn đã thanh toán (giống logic trong /api/manager/customers/:id)
            try {
                const allPaidOrdersSnapshot = await db.collection('orders')
                    .where('status', '==', 'completed')
                    .where('paymentStatus', '==', 'paid')
                    .get();
                
                // Chuẩn hóa số điện thoại để so sánh
                const normalizePhone = (phone) => {
                    if (!phone) return '';
                    return phone.toString().replace(/[\s\+\-\(\)]/g, '').trim();
                };
                
                const customerPhoneNormalized = normalizePhone(foundCustomer.phone);
                
                // Lọc hóa đơn của khách hàng này
                const paidOrders = allPaidOrdersSnapshot.docs.filter(orderDoc => {
                    const order = orderDoc.data();
                    if (order.customerId === foundCustomer.id) return true;
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
                    if (foundCustomer.name) {
                        const customerNameLower = foundCustomer.name.toLowerCase().trim();
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
                
                // Tính tổng tiền
                let totalRevenue = 0;
                paidOrders.forEach(orderDoc => {
                    const order = orderDoc.data();
                    const amount = order.finalTotal || order.total || 0;
                    totalRevenue += amount;
                });
                
                const totalPoints = Math.floor(totalRevenue / 200000);
                
                // Đếm số voucher đã đổi
                const vouchersSnapshot = await db.collection('vouchers')
                    .where('customerId', '==', foundCustomer.id)
                    .get();
                
                const vouchersCount = vouchersSnapshot.size;
                const pointsUsedForVouchers = vouchersCount * 50;
                let remainingPoints = totalPoints - pointsUsedForVouchers;
                
                console.log(`[API /customer/check] Customer ${foundCustomer.id} (${foundCustomer.name}):`);
                console.log(`  - Paid orders found: ${paidOrders.length}`);
                console.log(`  - Total revenue: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
                console.log(`  - Total points: ${totalPoints}`);
                console.log(`  - Vouchers count: ${vouchersCount}`);
                console.log(`  - Points used for vouchers: ${pointsUsedForVouchers}`);
                console.log(`  - Remaining points: ${remainingPoints}`);
                
                // Cập nhật điểm vào customer document nếu khác
                if (foundCustomer.points !== remainingPoints) {
                    await db.collection('customers').doc(foundCustomer.id).update({
                        points: remainingPoints,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`  - Updated points in database from ${foundCustomer.points} to ${remainingPoints}`);
                }
                
                // Trả về thông tin đầy đủ
                foundCustomer.points = remainingPoints;
                foundCustomer.totalPoints = totalPoints;
                foundCustomer.totalRevenue = totalRevenue;
                foundCustomer.totalPaidOrders = paidOrders.length;
                foundCustomer.totalPaidAmount = totalRevenue;
                
                console.log(`  - Returning customer data:`, {
                    points: foundCustomer.points,
                    totalPaidOrders: foundCustomer.totalPaidOrders,
                    totalRevenue: foundCustomer.totalRevenue
                });
            } catch (error) {
                console.error('Error calculating points for customer:', error);
                // Nếu có lỗi, vẫn trả về customer nhưng với điểm từ database
            }
            
            res.json({ success: true, customer: foundCustomer });
        } else {
            res.json({ success: true, customer: null });
        }
    } catch (error) {
        console.error('Error checking customer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cập nhật thông tin cá nhân
router.put('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = {
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(userId).update(updateData);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy chi tiết đơn hàng
router.get('/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderDoc = await db.collection('orders').doc(orderId).get();
        
        if (!orderDoc.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        res.json({ success: true, order: { id: orderDoc.id, ...orderDoc.data() } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Đặt hàng online
router.post('/orders', async (req, res) => {
    try {
        const { userId, customerName, customerPhone, items, total, discount, finalTotal, voucherId, tableId, deliveryType, deliveryAddress, numberOfPeople, eatingTime, customerId } = req.body;
        
        // Nếu có voucherId, đánh dấu voucher đã sử dụng
        if (voucherId) {
            try {
                const voucherRef = db.collection('vouchers').doc(voucherId);
                const voucherDoc = await voucherRef.get();
                
                if (voucherDoc.exists) {
                    const voucherData = voucherDoc.data();
                    if (voucherData.isUsed) {
                        return res.status(400).json({ success: false, error: 'Voucher đã được sử dụng' });
                    }
                }
            } catch (voucherError) {
                console.error('Error checking voucher:', voucherError);
            }
        }
        
        // Tạo số order ngẫu nhiên 5 chữ số
        const orderNumber = String(Math.floor(10000 + Math.random() * 90000));
        
        // Tạo đơn hàng
        const orderRef = await db.collection('orders').add({
            userId: userId || null, // Customer không cần đăng nhập
            customerId: customerId || null, // ID từ collection customers
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            items,
            total,
            discount: discount || 0,
            finalTotal: finalTotal || total,
            status: 'pending',
            voucherId: voucherId || null, // ID của voucher được sử dụng
            tableId: tableId || null,
            tableNumber: null, // Sẽ được set khi xác nhận
            tableNumbers: null, // Sẽ được set khi xác nhận
            deliveryType: deliveryType || 'at-table', // at-table, takeaway, delivery
            deliveryAddress: deliveryAddress || null,
            numberOfPeople: numberOfPeople || 1,
            eatingTime: eatingTime ? admin.firestore.Timestamp.fromDate(new Date(eatingTime)) : null,
            orderNumber: orderNumber, // Số order ngẫu nhiên 5 chữ số
            paymentStatus: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Đánh dấu voucher đã sử dụng nếu có
        if (voucherId) {
            try {
                const voucherRef = db.collection('vouchers').doc(voucherId);
                await voucherRef.update({
                    isUsed: true,
                    usedAt: admin.firestore.FieldValue.serverTimestamp(),
                    usedInOrderId: orderRef.id
                });
            } catch (voucherError) {
                console.error('Error marking voucher as used:', voucherError);
                // Không fail order nếu có lỗi với voucher
            }
        }

        // Cập nhật tồn kho
        for (const item of items) {
            const menuItem = await db.collection('menu').doc(item.menuId).get();
            if (menuItem.exists) {
                const menuData = menuItem.data();
                if (menuData.ingredients) {
                    for (const ingredient of menuData.ingredients) {
                        const inventoryRef = db.collection('inventory').doc(ingredient.id);
                        const inventoryDoc = await inventoryRef.get();
                        if (inventoryDoc.exists) {
                            const currentStock = inventoryDoc.data().quantity;
                            const newStock = currentStock - (ingredient.amount * item.quantity);
                            await inventoryRef.update({ quantity: newStock });
                        }
                    }
                }
            }
        }

        res.json({ success: true, orderId: orderRef.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy danh sách đơn hàng của customer
router.get('/orders/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const orders = await db.collection('orders')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const ordersList = orders.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, orders: ordersList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tích điểm
router.post('/points/add', async (req, res) => {
    try {
        const { userId, points } = req.body;
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const currentPoints = userDoc.data().points || 0;
        await userRef.update({ points: currentPoints + points });
        
        res.json({ success: true, newPoints: currentPoints + points });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Đổi điểm
router.post('/points/redeem', async (req, res) => {
    try {
        const { userId, points } = req.body;
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const currentPoints = userDoc.data().points || 0;
        if (currentPoints < points) {
            return res.status(400).json({ success: false, error: 'Not enough points' });
        }

        await userRef.update({ points: currentPoints - points });
        
        res.json({ success: true, newPoints: currentPoints - points });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tìm kiếm món ăn (từ menuItems và combos)
router.get('/menu/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ success: false, error: 'Search query required' });
        }
        
        const queryLower = query.toLowerCase();
        
        // Tìm kiếm trong menuItems
        const menuItems = await db.collection('menuItems').get();
        const menuItemsList = menuItems.docs
            .filter(doc => {
                const data = doc.data();
                return data.isActive !== false && 
                       data.name && 
                       data.name.toLowerCase().includes(queryLower);
            })
            .map(doc => ({
                id: doc.id,
                type: 'menu',
                ...doc.data()
            }));
        
        // Tìm kiếm trong combos
        const combos = await db.collection('combos').get();
        const combosList = combos.docs
            .filter(doc => {
                const data = doc.data();
                return data.isActive !== false && 
                       data.name && 
                       data.name.toLowerCase().includes(queryLower);
            })
            .map(doc => ({
                id: doc.id,
                type: 'combo',
                ...doc.data()
            }));
        
        // Kết hợp kết quả
        const allResults = [...menuItemsList, ...combosList];
        
        res.json({ success: true, menu: allResults });
    } catch (error) {
        console.error('Error searching menu:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Kiểm tra voucher
router.get('/vouchers/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const voucher = await db.collection('vouchers')
            .where('code', '==', code)
            .where('isActive', '==', true)
            .limit(1)
            .get();
        
        if (voucher.empty) {
            return res.status(404).json({ success: false, error: 'Voucher not found' });
        }
        
        const voucherData = voucher.docs[0].data();
        res.json({ success: true, voucher: { id: voucher.docs[0].id, ...voucherData } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thực đơn (menu items và combos từ Manager)
router.get('/menu', async (req, res) => {
    try {
        // Lấy menu items từ collection menuItems
        const menuItems = await db.collection('menuItems').get();
        const menuItemsList = menuItems.docs
            .filter(doc => doc.data().isActive !== false)
            .map(doc => ({
                id: doc.id,
                type: 'menu',
                ...doc.data()
            }));
        
        // Lấy combos từ collection combos
        const combos = await db.collection('combos').get();
        const combosList = combos.docs
            .filter(doc => doc.data().isActive !== false)
            .map(doc => ({
                id: doc.id,
                type: 'combo',
                ...doc.data()
            }));
        
        // Kết hợp cả menu items và combos
        const allItems = [...menuItemsList, ...combosList];
        
        res.json({ success: true, menu: allItems });
    } catch (error) {
        console.error('Error loading menu:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy danh mục món ăn
router.get('/menu/categories', async (req, res) => {
    try {
        const menu = await db.collection('menu')
            .where('isActive', '==', true)
            .get();
        
        const categories = [...new Set(menu.docs.map(doc => doc.data().category).filter(Boolean))];
        
        res.json({ success: true, categories });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy combo
router.get('/combos', async (req, res) => {
    try {
        const combos = await db.collection('combos')
            .where('isActive', '==', true)
            .get();
        
        const combosList = combos.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, combos: combosList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy voucher có thể sử dụng
router.get('/vouchers/available', async (req, res) => {
    try {
        const now = new Date();
        const vouchers = await db.collection('vouchers')
            .where('isActive', '==', true)
            .where('expiryDate', '>=', now)
            .get();
        
        const vouchersList = vouchers.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, vouchers: vouchersList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Thanh toán đơn hàng
router.post('/orders/:orderId/payment', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod, paymentInfo } = req.body; // paymentMethod: 'vnpay', 'momo', 'paypal', 'cash'
        
        await db.collection('orders').doc(orderId).update({
            paymentStatus: 'paid',
            paymentMethod,
            paymentInfo,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Ghi log thanh toán
        await db.collection('payment_logs').add({
            orderId,
            paymentMethod,
            paymentInfo,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy lịch sử tích điểm
router.get('/points/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await db.collection('points_history')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const historyList = history.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, history: historyList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;

