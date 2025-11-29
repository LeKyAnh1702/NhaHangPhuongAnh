const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

// Lấy tất cả đơn hàng
router.get('/orders', async (req, res) => {
    try {
        const orders = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(50)
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

// Xác nhận đơn đặt hàng
router.put('/orders/:orderId/confirm', async (req, res) => {
    try {
        const { orderId } = req.params;
        await db.collection('orders').doc(orderId).update({
            status: 'confirmed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tạo đơn hàng
router.post('/orders', async (req, res) => {
    try {
        const { items, total, tableId, customerName, customerPhone } = req.body;
        
        const orderRef = await db.collection('orders').add({
            items,
            total,
            tableId,
            customerName,
            customerPhone,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, orderId: orderRef.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật đơn hàng
router.put('/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, paymentStatus, paymentMethod } = req.body;
        
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (status) updateData.status = status;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        
        await db.collection('orders').doc(orderId).update(updateData);
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tìm kiếm đơn hàng
router.get('/orders/search', async (req, res) => {
    try {
        const { query } = req.query;
        const orders = await db.collection('orders')
            .where('customerName', '>=', query)
            .where('customerName', '<=', query + '\uf8ff')
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

// Quản lý kho thực phẩm
router.get('/inventory', async (req, res) => {
    try {
        const inventory = await db.collection('inventory').get();
        const inventoryList = inventory.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Kiểm tra cảnh báo tồn kho
        const warnings = inventoryList.filter(item => 
            item.quantity <= item.minStock
        );
        
        res.json({ success: true, inventory: inventoryList, warnings });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật tồn kho
router.put('/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        
        await db.collection('inventory').doc(id).update({
            quantity,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Thống kê, báo cáo bán hàng
router.get('/reports/sales', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let ordersQuery = db.collection('orders');
        
        if (startDate && endDate) {
            ordersQuery = ordersQuery
                .where('createdAt', '>=', new Date(startDate))
                .where('createdAt', '<=', new Date(endDate));
        }
        
        const orders = await ordersQuery.get();
        
        let totalRevenue = 0;
        let totalOrders = 0;
        const statusCount = {};
        
        orders.docs.forEach(doc => {
            const data = doc.data();
            totalRevenue += data.finalTotal || data.total || 0;
            totalOrders++;
            statusCount[data.status] = (statusCount[data.status] || 0) + 1;
        });
        
        res.json({
            success: true,
            report: {
                totalRevenue,
                totalOrders,
                statusCount,
                averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;

