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

// Kiểm tra tồn kho trước khi xác nhận
router.post('/orders/:orderId/check-inventory', async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderDoc = await db.collection('orders').doc(orderId).get();
        
        if (!orderDoc.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const order = orderDoc.data();
        const insufficientItems = [];
        
        for (const item of order.items) {
            const menuItem = await db.collection('menu').doc(item.menuId).get();
            if (menuItem.exists) {
                const menuData = menuItem.data();
                if (menuData.ingredients) {
                    for (const ingredient of menuData.ingredients) {
                        const inventoryDoc = await db.collection('inventory').doc(ingredient.id).get();
                        if (inventoryDoc.exists) {
                            const currentStock = inventoryDoc.data().quantity;
                            const required = ingredient.amount * item.quantity;
                            if (currentStock < required) {
                                insufficientItems.push({
                                    ingredientId: ingredient.id,
                                    ingredientName: inventoryDoc.data().name,
                                    required,
                                    available: currentStock
                                });
                            }
                        }
                    }
                }
            }
        }
        
        res.json({ 
            success: true, 
            canConfirm: insufficientItems.length === 0,
            insufficientItems 
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy đơn hàng chờ xác nhận
router.get('/orders/pending', async (req, res) => {
    try {
        const orders = await db.collection('orders')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
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
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
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

// Cập nhật trạng thái đơn hàng
router.put('/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, note } = req.body; // status: 'preparing', 'serving', 'completed', 'cancelled'
        
        const updateData = {
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (note) updateData.note = note;
        if (status === 'completed') {
            updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        await db.collection('orders').doc(orderId).update(updateData);
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật trạng thái thanh toán
router.put('/orders/:orderId/payment', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentStatus, paymentMethod, note } = req.body;
        
        const updateData = {
            paymentStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (note) updateData.paymentNote = note;
        if (paymentStatus === 'paid') {
            updateData.paidAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        await db.collection('orders').doc(orderId).update(updateData);
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật đơn hàng
router.put('/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const updateData = {
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
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
        
        // Tìm theo tên khách hàng
        const ordersByName = await db.collection('orders')
            .where('customerName', '>=', query)
            .where('customerName', '<=', query + '\uf8ff')
            .get();
        
        // Tìm theo số điện thoại
        const ordersByPhone = await db.collection('orders')
            .where('customerPhone', '==', query)
            .get();
        
        // Kết hợp kết quả
        const allOrders = new Map();
        ordersByName.docs.forEach(doc => {
            allOrders.set(doc.id, { id: doc.id, ...doc.data() });
        });
        ordersByPhone.docs.forEach(doc => {
            allOrders.set(doc.id, { id: doc.id, ...doc.data() });
        });
        
        const ordersList = Array.from(allOrders.values());
        
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

// Điều chỉnh tồn kho (kiểm kê)
router.put('/inventory/:id/adjust', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, reason, note } = req.body;
        
        const inventoryDoc = await db.collection('inventory').doc(id).get();
        if (!inventoryDoc.exists) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }
        
        const oldQuantity = inventoryDoc.data().quantity;
        const difference = quantity - oldQuantity;
        
        await db.collection('inventory').doc(id).update({
            quantity,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Ghi log điều chỉnh
        await db.collection('inventory_logs').add({
            inventoryId: id,
            type: 'adjust',
            oldQuantity,
            newQuantity: quantity,
            difference,
            reason: reason || 'Kiểm kê',
            note,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true });
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

// Báo cáo món bán chạy
router.get('/reports/popular-items', async (req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;
        let ordersQuery = db.collection('orders').where('status', '==', 'completed');
        
        if (startDate && endDate) {
            ordersQuery = ordersQuery
                .where('createdAt', '>=', new Date(startDate))
                .where('createdAt', '<=', new Date(endDate));
        }
        
        const orders = await ordersQuery.get();
        
        const itemCount = {};
        orders.docs.forEach(doc => {
            const items = doc.data().items || [];
            items.forEach(item => {
                if (!itemCount[item.menuId]) {
                    itemCount[item.menuId] = {
                        menuId: item.menuId,
                        name: item.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                itemCount[item.menuId].quantity += item.quantity;
                itemCount[item.menuId].revenue += (item.price * item.quantity);
            });
        });
        
        const popularItems = Object.values(itemCount)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, parseInt(limit));
        
        res.json({ success: true, popularItems });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Báo cáo theo ca làm việc
router.get('/reports/shifts', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const orders = await db.collection('orders')
            .where('createdAt', '>=', startOfDay)
            .where('createdAt', '<=', endOfDay)
            .where('status', '==', 'completed')
            .get();
        
        const shifts = {
            morning: { orders: 0, revenue: 0 }, // 6h-12h
            afternoon: { orders: 0, revenue: 0 }, // 12h-18h
            evening: { orders: 0, revenue: 0 } // 18h-24h
        };
        
        orders.docs.forEach(doc => {
            const order = doc.data();
            const hour = order.createdAt?.toDate().getHours() || new Date().getHours();
            const revenue = order.finalTotal || order.total || 0;
            
            if (hour >= 6 && hour < 12) {
                shifts.morning.orders++;
                shifts.morning.revenue += revenue;
            } else if (hour >= 12 && hour < 18) {
                shifts.afternoon.orders++;
                shifts.afternoon.revenue += revenue;
            } else {
                shifts.evening.orders++;
                shifts.evening.revenue += revenue;
            }
        });
        
        res.json({ success: true, shifts, date: targetDate.toISOString().split('T')[0] });
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

