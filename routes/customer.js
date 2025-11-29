const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// Đặt hàng online
router.post('/orders', async (req, res) => {
    try {
        const { userId, items, total, voucherCode, tableId } = req.body;
        
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
            userId,
            items,
            total,
            discount,
            finalTotal,
            status: 'pending',
            voucherCode: voucherCode || null,
            tableId: tableId || null,
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
        const menu = await db.collection('menu')
            .where('isActive', '==', true)
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

module.exports = router;

