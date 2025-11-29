const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

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
        const { userId, customerName, customerPhone, items, total, voucherCode, tableId, deliveryType, deliveryAddress } = req.body;
        
        // Kiểm tra voucher nếu có
        let discount = 0;
        if (voucherCode) {
            const voucher = await db.collection('vouchers')
                .where('code', '==', voucherCode)
                .where('isActive', '==', true)
                .limit(1)
                .get();
            
            if (!voucher.empty) {
                const voucherData = voucher.docs[0].data();
                discount = voucherData.discount;
            }
        }

        const finalTotal = total - discount;
        
        // Tạo đơn hàng
        const orderRef = await db.collection('orders').add({
            userId: userId || null, // Customer không cần đăng nhập
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            items,
            total,
            discount,
            finalTotal,
            status: 'pending',
            voucherCode: voucherCode || null,
            tableId: tableId || null,
            deliveryType: deliveryType || 'at-table', // at-table, takeaway, delivery
            deliveryAddress: deliveryAddress || null,
            paymentStatus: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

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

// Tìm kiếm món ăn
router.get('/menu/search', async (req, res) => {
    try {
        const { query } = req.query;
        const menu = await db.collection('menu')
            .where('name', '>=', query)
            .where('name', '<=', query + '\uf8ff')
            .get();
        
        const menuList = menu.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, menu: menuList });
    } catch (error) {
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

// Lấy thực đơn
router.get('/menu', async (req, res) => {
    try {
        const { category } = req.query;
        let menuQuery = db.collection('menu').where('isActive', '==', true);
        
        if (category) {
            menuQuery = menuQuery.where('category', '==', category);
        }
        
        const menu = await menuQuery.get();
        
        const menuList = menu.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, menu: menuList });
    } catch (error) {
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

