const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

// Lấy danh sách kho
router.get('/inventory', async (req, res) => {
    try {
        const inventory = await db.collection('inventory').get();
        const inventoryList = inventory.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, inventory: inventoryList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Quản lý kho, NVL (nhập/xuất)
router.post('/inventory/import', async (req, res) => {
    try {
        const { items } = req.body; // [{ id, quantity, price, supplier }]
        
        for (const item of items) {
            const inventoryRef = db.collection('inventory').doc(item.id);
            const inventoryDoc = await inventoryRef.get();
            
            if (inventoryDoc.exists) {
                const currentQuantity = inventoryDoc.data().quantity || 0;
                await inventoryRef.update({
                    quantity: currentQuantity + item.quantity,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await inventoryRef.set({
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    minStock: item.minStock || 10,
                    price: item.price,
                    supplier: item.supplier,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Ghi log nhập kho
            await db.collection('inventory_logs').add({
                inventoryId: item.id,
                type: 'import',
                quantity: item.quantity,
                price: item.price,
                supplier: item.supplier,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/inventory/export', async (req, res) => {
    try {
        const { items } = req.body; // [{ id, quantity, reason }]
        
        for (const item of items) {
            const inventoryRef = db.collection('inventory').doc(item.id);
            const inventoryDoc = await inventoryRef.get();
            
            if (inventoryDoc.exists) {
                const currentQuantity = inventoryDoc.data().quantity || 0;
                if (currentQuantity < item.quantity) {
                    return res.status(400).json({ 
                        success: false, 
                        error: `Not enough stock for ${item.id}` 
                    });
                }
                
                await inventoryRef.update({
                    quantity: currentQuantity - item.quantity,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                // Ghi log xuất kho
                await db.collection('inventory_logs').add({
                    inventoryId: item.id,
                    type: 'export',
                    quantity: item.quantity,
                    reason: item.reason,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy danh sách thực đơn
router.get('/menu', async (req, res) => {
    try {
        const menu = await db.collection('menu').get();
        const menuList = menu.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, menu: menuList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Quản lý thực đơn, combo
router.post('/menu', async (req, res) => {
    try {
        const { name, description, price, category, ingredients, imageUrl, isCombo, comboItems } = req.body;
        
        const menuRef = await db.collection('menu').add({
            name,
            description,
            price,
            category,
            ingredients: ingredients || [],
            imageUrl,
            isCombo: isCombo || false,
            comboItems: comboItems || [],
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, menuId: menuRef.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/menu/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('menu').doc(id).update(updateData);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/menu/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('menu').doc(id).update({ isActive: false });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Quản lý bàn ăn
router.get('/tables', async (req, res) => {
    try {
        const tables = await db.collection('tables').get();
        const tablesList = tables.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, tables: tablesList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/tables', async (req, res) => {
    try {
        const { number, capacity, location, status } = req.body;
        
        const tableRef = await db.collection('tables').add({
            number,
            capacity,
            location,
            status: status || 'available',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, tableId: tableRef.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/tables/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('tables').doc(id).update(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Báo cáo doanh thu
router.get('/reports/revenue', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let ordersQuery = db.collection('orders').where('status', '==', 'completed');
        
        if (startDate && endDate) {
            ordersQuery = ordersQuery
                .where('createdAt', '>=', new Date(startDate))
                .where('createdAt', '<=', new Date(endDate));
        }
        
        const orders = await ordersQuery.get();
        
        let totalRevenue = 0;
        const dailyRevenue = {};
        
        orders.docs.forEach(doc => {
            const data = doc.data();
            const revenue = data.finalTotal || data.total || 0;
            totalRevenue += revenue;
            
            const date = data.createdAt?.toDate().toISOString().split('T')[0];
            if (date) {
                dailyRevenue[date] = (dailyRevenue[date] || 0) + revenue;
            }
        });
        
        res.json({
            success: true,
            report: {
                totalRevenue,
                dailyRevenue,
                totalOrders: orders.size
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Báo cáo tồn kho
router.get('/reports/inventory', async (req, res) => {
    try {
        const inventory = await db.collection('inventory').get();
        const inventoryList = inventory.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const lowStock = inventoryList.filter(item => item.quantity <= item.minStock);
        const outOfStock = inventoryList.filter(item => item.quantity === 0);
        
        const totalValue = inventoryList.reduce((sum, item) => {
            return sum + (item.quantity * (item.price || 0));
        }, 0);
        
        res.json({
            success: true,
            report: {
                totalItems: inventoryList.length,
                lowStock: lowStock.length,
                outOfStock: outOfStock.length,
                totalValue,
                items: inventoryList,
                warnings: [...lowStock, ...outOfStock]
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;

