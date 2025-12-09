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

// Quản lý tài khoản người dùng
// Lấy danh sách users
router.get('/users', async (req, res) => {
    try {
        // Lấy tất cả users và sort ở server-side để tránh lỗi index
        const users = await db.collection('users').get();
        const usersList = users.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(user => user.isActive !== false)
            .sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA; // desc
            });
        
        res.json({ success: true, users: usersList });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin một user
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userDoc = await db.collection('users').doc(id).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, user: { id: userDoc.id, ...userDoc.data() } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tạo user mới
router.post('/users', async (req, res) => {
    try {
        const { email, name, role, phone, password } = req.body;
        
        // Tạo user trong Firebase Auth nếu có password
        let authUserId = null;
        if (password) {
            try {
                const userRecord = await admin.auth().createUser({
                    email,
                    password,
                    displayName: name
                });
                authUserId = userRecord.uid;
            } catch (authError) {
                if (authError.code === 'auth/email-already-exists') {
                    return res.status(400).json({ success: false, error: 'Email đã tồn tại trong hệ thống' });
                }
                throw authError;
            }
        }
        
        // Lưu vào Firestore
        const userData = {
            email,
            name,
            role: role || 'customer',
            phone: phone || '',
            points: 0,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        let userRef;
        if (authUserId) {
            // Nếu đã tạo trong Auth, dùng cùng UID
            await db.collection('users').doc(authUserId).set(userData);
            userRef = { id: authUserId };
        } else {
            // Nếu không có password, chỉ tạo trong Firestore
            userRef = await db.collection('users').add(userData);
        }
        
        res.json({ success: true, userId: userRef.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật user
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, role, phone, password } = req.body;
        
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (email) updateData.email = email;
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (phone !== undefined) updateData.phone = phone;
        
        // Cập nhật Firestore
        await db.collection('users').doc(id).update(updateData);
        
        // Cập nhật password trong Auth nếu có
        if (password) {
            try {
                const userDoc = await db.collection('users').doc(id).get();
                if (userDoc.exists) {
                    const userEmail = userDoc.data().email;
                    // Tìm user trong Auth bằng email
                    const authUser = await admin.auth().getUserByEmail(userEmail);
                    if (authUser) {
                        await admin.auth().updateUser(authUser.uid, { password });
                    }
                }
            } catch (authError) {
                console.warn('Could not update password in Auth:', authError.message);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xóa/Vô hiệu hóa user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('users').doc(id).update({ 
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Quản lý nhà cung cấp
router.get('/suppliers', async (req, res) => {
    try {
        // Lấy tất cả suppliers và sort ở server-side để tránh lỗi index
        const suppliers = await db.collection('suppliers').get();
        const suppliersList = suppliers.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(supplier => supplier.isActive !== false)
            .sort((a, b) => (a.code || 0) - (b.code || 0));
        
        res.json({ success: true, suppliers: suppliersList });
    } catch (error) {
        console.error('Error loading suppliers:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ==================== QUẢN LÝ CÔNG NỢ NHÀ CUNG CẤP ====================
// Lấy danh sách công nợ tất cả nhà cung cấp (với filter) - PHẢI ĐẶT TRƯỚC route /suppliers/:id
router.get('/suppliers/debt-summary', async (req, res) => {
    console.log('[API] GET /api/admin/suppliers/debt-summary called');
    try {
        const { fromDate, toDate, supplierCode, supplierName } = req.query;
        
        // Lấy tất cả nhà cung cấp
        let suppliersQuery = db.collection('suppliers');
        const suppliersSnapshot = await suppliersQuery.get();
        
        const debtSummary = [];
        
        for (const supplierDoc of suppliersSnapshot.docs) {
            const supplier = { id: supplierDoc.id, ...supplierDoc.data() };
            
            // Filter theo mã số hoặc tên
            if (supplierCode) {
                const codeStr = String(supplier.code || '').toUpperCase();
                if (!codeStr.includes(supplierCode.toUpperCase())) {
                    continue;
                }
            }
            if (supplierName && !supplier.company?.toLowerCase().includes(supplierName.toLowerCase())) {
                continue;
            }
            
            // Chỉ lấy nhà cung cấp active
            if (supplier.isActive === false) {
                continue;
            }
            
            // Lấy phiếu nhập kho của nhà cung cấp
            let importReceiptsQuery = db.collection('importReceipts').where('supplierId', '==', supplier.id);
            const importReceiptsSnapshot = await importReceiptsQuery.get();
            
            // Tính toán công nợ
            const openingBalance = supplier.openingBalance || 0;
            let debtInPeriod = 0;
            let paidInPeriod = 0;
            let openingDebt = openingBalance; // Nợ đầu kỳ = số dư đầu kỳ
            
            // Tính nợ đầu kỳ (số còn nợ đến "từ ngày")
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                openingDebt = openingBalance;
                
                importReceiptsSnapshot.docs.forEach(doc => {
                    const receipt = doc.data();
                    const receiptDate = receipt.importDate?.toDate ? receipt.importDate.toDate() : new Date(receipt.importDate);
                    
                    if (receiptDate < fromDateObj) {
                        const paymentStatus = receipt.paymentStatus || 'unpaid';
                        if (paymentStatus !== 'paid') {
                            openingDebt += (receipt.totalAmount || 0);
                        } else {
                            openingDebt -= (receipt.totalAmount || 0);
                        }
                    }
                });
            }
            
            // Tính phát sinh nợ và đã trả trong kỳ
            importReceiptsSnapshot.docs.forEach(doc => {
                const receipt = doc.data();
                const receiptDate = receipt.importDate?.toDate ? receipt.importDate.toDate() : new Date(receipt.importDate);
                const amount = receipt.totalAmount || 0;
                
                // Kiểm tra ngày
                let includeReceipt = true;
                if (fromDate) {
                    const fromDateObj = new Date(fromDate);
                    if (receiptDate < fromDateObj) {
                        includeReceipt = false;
                    }
                }
                if (toDate) {
                    const toDateObj = new Date(toDate);
                    toDateObj.setHours(23, 59, 59, 999);
                    if (receiptDate > toDateObj) {
                        includeReceipt = false;
                    }
                }
                
                if (includeReceipt) {
                    const paymentStatus = receipt.paymentStatus || 'unpaid';
                    if (paymentStatus === 'paid') {
                        paidInPeriod += amount;
                    } else {
                        debtInPeriod += amount;
                    }
                }
            });
            
            const remainingDebt = openingDebt + debtInPeriod - paidInPeriod;
            
            debtSummary.push({
                supplierId: supplier.id,
                supplierCode: supplier.code,
                supplierName: supplier.company || supplier.name,
                openingDebt,
                debtInPeriod,
                paidInPeriod,
                remainingDebt
            });
        }
        
        res.json({ success: true, debtSummary });
    } catch (error) {
        console.error('Error loading supplier debt summary:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin công nợ chi tiết nhà cung cấp - PHẢI ĐẶT TRƯỚC route /suppliers/:id
router.get('/suppliers/:id/debt', async (req, res) => {
    console.log('[API] GET /api/admin/suppliers/:id/debt called with id:', req.params.id);
    try {
        const { id } = req.params;
        const { fromDate, toDate } = req.query;
        
        const supplierDoc = await db.collection('suppliers').doc(id).get();
        if (!supplierDoc.exists) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }
        
        const supplier = { id: supplierDoc.id, ...supplierDoc.data() };
        const openingBalance = supplier.openingBalance || 0;
        
        // Lấy phiếu nhập kho
        const importReceiptsQuery = db.collection('importReceipts').where('supplierId', '==', id);
        const importReceiptsSnapshot = await importReceiptsQuery.get();
        
        let openingDebt = openingBalance;
        const debtDetails = [];
        
        // Tính nợ đầu kỳ
        if (fromDate) {
            const fromDateObj = new Date(fromDate);
            importReceiptsSnapshot.docs.forEach(doc => {
                const receipt = doc.data();
                const receiptDate = receipt.importDate?.toDate ? receipt.importDate.toDate() : new Date(receipt.importDate);
                
                if (receiptDate < fromDateObj) {
                    const paymentStatus = receipt.paymentStatus || 'unpaid';
                    if (paymentStatus !== 'paid') {
                        openingDebt += (receipt.totalAmount || 0);
                    } else {
                        openingDebt -= (receipt.totalAmount || 0);
                    }
                }
            });
        }
        
        // Tính chi tiết trong kỳ
        importReceiptsSnapshot.docs.forEach((doc, index) => {
            const receipt = doc.data();
            const receiptDate = receipt.importDate?.toDate ? receipt.importDate.toDate() : new Date(receipt.importDate);
            
            // Kiểm tra ngày
            let includeReceipt = true;
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                if (receiptDate < fromDateObj) {
                    includeReceipt = false;
                }
            }
            if (toDate) {
                const toDateObj = new Date(toDate);
                toDateObj.setHours(23, 59, 59, 999);
                if (receiptDate > toDateObj) {
                    includeReceipt = false;
                }
            }
            
            if (includeReceipt) {
                const paymentStatus = receipt.paymentStatus || 'unpaid';
                debtDetails.push({
                    docNumber: receipt.docNumber || '',
                    date: receiptDate,
                    debtAmount: paymentStatus !== 'paid' ? (receipt.totalAmount || 0) : 0,
                    paidAmount: paymentStatus === 'paid' ? (receipt.totalAmount || 0) : 0
                });
            }
        });
        
        // Tính tổng
        const debtInPeriod = debtDetails.reduce((sum, d) => sum + d.debtAmount, 0);
        const paidInPeriod = debtDetails.reduce((sum, d) => sum + d.paidAmount, 0);
        const closingBalance = openingDebt + debtInPeriod - paidInPeriod;
        
        res.json({
            success: true,
            supplier: {
                id: supplier.id,
                code: supplier.code,
                name: supplier.company || supplier.name
            },
            openingBalance,
            openingDebt,
            debtDetails,
            debtInPeriod,
            paidInPeriod,
            closingBalance
        });
    } catch (error) {
        console.error('Error loading supplier debt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin một nhà cung cấp
router.get('/suppliers/:id', async (req, res) => {
    console.log('[API] GET /api/admin/suppliers/:id called with id:', req.params.id);
    try {
        const { id } = req.params;
        const supplierDoc = await db.collection('suppliers').doc(id).get();
        
        if (!supplierDoc.exists) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }
        
        res.json({ success: true, supplier: { id: supplierDoc.id, ...supplierDoc.data() } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});


router.post('/suppliers', async (req, res) => {
    try {
        const { name, company, address, taxCode, bankAccount, bankName, phone } = req.body;
        
        // Kiểm tra số lượng nhà cung cấp hiện tại
        const existingSuppliers = await db.collection('suppliers').get();
        
        if (existingSuppliers.size >= 1000) {
            return res.status(400).json({ 
                success: false, 
                error: 'Đã đạt giới hạn 1000 nhà cung cấp' 
            });
        }
        
        // Tìm mã số còn trống (1-1000)
        const usedCodes = existingSuppliers.docs
            .map(doc => doc.data().code)
            .filter(code => code !== undefined && code !== null)
            .map(Number)
            .sort((a, b) => a - b);
        
        let newCode = 1;
        for (let i = 0; i < usedCodes.length; i++) {
            if (usedCodes[i] !== i + 1) {
                newCode = i + 1;
                break;
            }
            newCode = i + 2;
        }
        
        if (newCode > 1000) {
            return res.status(400).json({ 
                success: false, 
                error: 'Đã đạt giới hạn 1000 nhà cung cấp' 
            });
        }
        
        // Chỉ thêm các field có giá trị, không thêm undefined
        const supplierData = {
            code: newCode,
            name,
            company,
            address,
            phone,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Chỉ thêm các field optional nếu có giá trị
        if (taxCode && taxCode.trim()) {
            supplierData.taxCode = taxCode.trim();
        }
        if (bankAccount && bankAccount.trim()) {
            supplierData.bankAccount = bankAccount.trim();
        }
        if (bankName && bankName.trim()) {
            supplierData.bankName = bankName.trim();
        }
        
        const supplierRef = await db.collection('suppliers').add(supplierData);
        
        res.json({ success: true, supplierId: supplierRef.id, code: newCode });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/suppliers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, company, address, taxCode, bankAccount, bankName, phone } = req.body;
        
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Chỉ cập nhật các field có giá trị
        if (name && name.trim()) updateData.name = name.trim();
        if (company && company.trim()) updateData.company = company.trim();
        if (address && address.trim()) updateData.address = address.trim();
        if (phone && phone.trim()) updateData.phone = phone.trim();
        
        // Các field optional - nếu có giá trị thì cập nhật, nếu rỗng thì xóa field
        if (taxCode !== undefined) {
            updateData.taxCode = taxCode && taxCode.trim() ? taxCode.trim() : admin.firestore.FieldValue.delete();
        }
        if (bankAccount !== undefined) {
            updateData.bankAccount = bankAccount && bankAccount.trim() ? bankAccount.trim() : admin.firestore.FieldValue.delete();
        }
        if (bankName !== undefined) {
            updateData.bankName = bankName && bankName.trim() ? bankName.trim() : admin.firestore.FieldValue.delete();
        }
        
        await db.collection('suppliers').doc(id).update(updateData);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/suppliers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('suppliers').doc(id).update({ 
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Quản lý nguyên vật liệu
router.get('/materials', async (req, res) => {
    try {
        // Lấy tất cả materials và filter ở server-side để tránh lỗi query
        const materials = await db.collection('materials').get();
        const materialsList = materials.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(material => material.isActive !== false);
        
        res.json({ success: true, materials: materialsList });
    } catch (error) {
        console.error('Error loading materials:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin một nguyên vật liệu
router.get('/materials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const materialDoc = await db.collection('materials').doc(id).get();
        
        if (!materialDoc.exists) {
            return res.status(404).json({ success: false, error: 'Material not found' });
        }
        
        res.json({ success: true, material: { id: materialDoc.id, ...materialDoc.data() } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/materials', async (req, res) => {
    try {
        const { name, unit, package: packageInfo } = req.body;
        
        // Validate dữ liệu đầu vào
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Tên nguyên vật liệu là bắt buộc' });
        }
        if (!unit) {
            return res.status(400).json({ success: false, error: 'Đơn vị tính là bắt buộc' });
        }
        if (!packageInfo || !packageInfo.trim()) {
            return res.status(400).json({ success: false, error: 'Quy cách đóng gói là bắt buộc' });
        }
        
        // Kiểm tra số lượng nguyên vật liệu hiện tại
        // Sử dụng query đơn giản hơn để tránh lỗi
        const existingMaterials = await db.collection('materials').get();
        
        // Tạo mã số tự động (format: NVL001, NVL002, ...)
        let newCode = '';
        const activeMaterials = existingMaterials.docs.filter(doc => {
            const data = doc.data();
            return data.isActive !== false;
        });
        
        if (activeMaterials.length === 0) {
            newCode = 'NVL001';
        } else {
            // Lấy mã số lớn nhất
            const codes = activeMaterials
                .map(doc => {
                    const code = doc.data().code;
                    if (code && code.startsWith('NVL')) {
                        const num = parseInt(code.substring(3));
                        return isNaN(num) ? 0 : num;
                    }
                    return 0;
                })
                .filter(num => num > 0);
            
            const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
            const nextNum = maxCode + 1;
            newCode = `NVL${String(nextNum).padStart(3, '0')}`;
        }
        
        // Chỉ thêm các field có giá trị, không thêm undefined
        const materialData = {
            code: newCode,
            name: name.trim(),
            unit: unit,
            package: packageInfo.trim(),
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const materialRef = await db.collection('materials').add(materialData);
        
        res.json({ success: true, materialId: materialRef.id, code: newCode });
    } catch (error) {
        console.error('Error creating material:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/materials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, unit, package: packageInfo } = req.body;
        
        // Validate dữ liệu đầu vào
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Tên nguyên vật liệu là bắt buộc' });
        }
        if (!unit) {
            return res.status(400).json({ success: false, error: 'Đơn vị tính là bắt buộc' });
        }
        if (!packageInfo || !packageInfo.trim()) {
            return res.status(400).json({ success: false, error: 'Quy cách đóng gói là bắt buộc' });
        }
        
        const updateData = {
            name: name.trim(),
            unit: unit,
            package: packageInfo.trim(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('materials').doc(id).update(updateData);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating material:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/materials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('materials').doc(id).update({ 
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
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
                supplierId: item.supplierId || null,
                createdBy: req.body.createdBy || 'admin',
                note: item.note || '',
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

// Lịch sử nhập xuất kho
router.get('/inventory/logs', async (req, res) => {
    try {
        const { startDate, endDate, type, inventoryId } = req.query;
        let logsQuery = db.collection('inventory_logs');
        
        if (inventoryId) {
            logsQuery = logsQuery.where('inventoryId', '==', inventoryId);
        }
        if (type) {
            logsQuery = logsQuery.where('type', '==', type);
        }
        if (startDate && endDate) {
            logsQuery = logsQuery
                .where('createdAt', '>=', new Date(startDate))
                .where('createdAt', '<=', new Date(endDate));
        }
        
        const logs = await logsQuery.orderBy('createdAt', 'desc').limit(100).get();
        
        const logsList = logs.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, logs: logsList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Quản lý voucher
router.get('/vouchers', async (req, res) => {
    try {
        const vouchers = await db.collection('vouchers').get();
        const vouchersList = vouchers.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, vouchers: vouchersList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/vouchers', async (req, res) => {
    try {
        const { code, discount, discountType, minOrder, maxDiscount, expiryDate, usageLimit, description } = req.body;
        // discountType: 'percent' or 'fixed'
        
        const voucherRef = await db.collection('vouchers').add({
            code,
            discount,
            discountType: discountType || 'percent',
            minOrder: minOrder || 0,
            maxDiscount: maxDiscount || null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            usageLimit: usageLimit || null,
            usedCount: 0,
            description,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, voucherId: voucherRef.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/vouchers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('vouchers').doc(id).update({
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Quản lý combo
router.get('/combos', async (req, res) => {
    try {
        const combos = await db.collection('combos').get();
        const combosList = combos.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, combos: combosList });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/combos', async (req, res) => {
    try {
        const { name, description, price, items, imageUrl } = req.body;
        // items: [{ menuId, quantity }]
        
        const comboRef = await db.collection('combos').add({
            name,
            description,
            price,
            items,
            imageUrl,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, comboId: comboRef.id });
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

// Quản lý phiếu nhập kho
// Lấy danh sách phiếu nhập kho (có thể filter theo ngày và số chứng từ)
router.get('/import-receipts', async (req, res) => {
    try {
        const { fromDate, toDate, docNumber } = req.query;
        
        let query = db.collection('importReceipts');
        
        // Chỉ filter theo số chứng từ nếu có (equality query không cần index)
        if (docNumber) {
            query = query.where('docNumber', '==', docNumber);
        }
        
        // Để tránh lỗi composite index, ta sẽ KHÔNG dùng where clause với importDate
        // Thay vào đó, lấy tất cả rồi filter và sort ở server-side
        // Chỉ filter theo docNumber nếu có (equality query không cần index)
        
        // Lấy tất cả documents (không dùng orderBy để tránh lỗi index)
        const receipts = await query.get();
        
        const receiptsList = receipts.docs.map(doc => {
            const data = doc.data();
            const importDate = data.importDate?.toDate ? data.importDate.toDate() : data.importDate;
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt;
            
            return {
                id: doc.id,
                ...data,
                importDate,
                createdAt
            };
        });
        
        // Filter theo ngày ở server-side (nếu có) và chỉ lấy các phiếu còn active
        let filteredList = receiptsList.filter(receipt => receipt.isActive !== false);
        if (fromDate || toDate) {
            filteredList = filteredList.filter(receipt => {
                if (!receipt.importDate) return false;
                const receiptDate = new Date(receipt.importDate);
                receiptDate.setHours(0, 0, 0, 0);
                
                if (fromDate) {
                    const from = new Date(fromDate);
                    from.setHours(0, 0, 0, 0);
                    if (receiptDate < from) return false;
                }
                
                if (toDate) {
                    const to = new Date(toDate);
                    to.setHours(23, 59, 59, 999);
                    if (receiptDate > to) return false;
                }
                
                return true;
            });
        }
        
        // Sort ở server-side: theo ngày nhập kho (descending), sau đó theo số chứng từ (descending)
        filteredList.sort((a, b) => {
            // Sort theo ngày nhập kho trước (descending)
            const dateA = a.importDate ? new Date(a.importDate).getTime() : 0;
            const dateB = b.importDate ? new Date(b.importDate).getTime() : 0;
            if (dateB !== dateA) {
                return dateB - dateA; // Descending
            }
            // Nếu cùng ngày, sort theo số chứng từ (descending)
            const docA = a.docNumber || '';
            const docB = b.docNumber || '';
            return docB.localeCompare(docA); // Descending
        });
        
        res.json({ success: true, receipts: filteredList });
    } catch (error) {
        console.error('Error loading import receipts:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin một phiếu nhập kho
router.get('/import-receipts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const receiptDoc = await db.collection('importReceipts').doc(id).get();
        
        if (!receiptDoc.exists) {
            return res.status(404).json({ success: false, error: 'Import receipt not found' });
        }
        
        const data = receiptDoc.data();
        res.json({
            success: true,
            receipt: {
                id: receiptDoc.id,
                ...data,
                importDate: data.importDate?.toDate ? data.importDate.toDate() : data.importDate,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tạo phiếu nhập kho mới
router.post('/import-receipts', async (req, res) => {
    try {
        const { importDate, supplierId, items } = req.body;
        
        // Validate
        if (!importDate) {
            return res.status(400).json({ success: false, error: 'Ngày nhập kho là bắt buộc' });
        }
        if (!supplierId) {
            return res.status(400).json({ success: false, error: 'Nhà cung cấp là bắt buộc' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Phải có ít nhất một nguyên vật liệu' });
        }
        
        // Validate items
        for (const item of items) {
            if (!item.materialId || !item.quantity || !item.unitPrice) {
                return res.status(400).json({ success: false, error: 'Thông tin nguyên vật liệu không đầy đủ' });
            }
        }
        
        // Tạo số chứng từ tự động (format: NK + YYYYMM + số thứ tự 3 chữ số)
        const date = new Date(importDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `NK${year}${month}`;
        
        // Tìm số chứng từ lớn nhất trong tháng
        const existingReceipts = await db.collection('importReceipts')
            .where('docNumber', '>=', monthPrefix)
            .where('docNumber', '<', monthPrefix + '999')
            .get();
        
        let maxNumber = 0;
        existingReceipts.docs.forEach(doc => {
            const docNum = doc.data().docNumber;
            if (docNum && docNum.startsWith(monthPrefix)) {
                const num = parseInt(docNum.substring(monthPrefix.length));
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        
        const nextNumber = maxNumber + 1;
        const docNumber = `${monthPrefix}${String(nextNumber).padStart(3, '0')}`;
        
        // Tính tổng tiền
        let totalAmount = 0;
        items.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const amount = Math.round(quantity * unitPrice);
            totalAmount += amount;
        });
        
        // Lưu phiếu nhập kho
        const receiptData = {
            docNumber,
            importDate: admin.firestore.Timestamp.fromDate(new Date(importDate)),
            supplierId,
            items: items.map(item => ({
                materialId: item.materialId,
                materialCode: item.materialCode,
                materialName: item.materialName,
                unit: item.unit,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                amount: Math.round(parseFloat(item.quantity) * parseFloat(item.unitPrice))
            })),
            totalAmount,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const receiptRef = await db.collection('importReceipts').add(receiptData);
        
        res.json({ success: true, receiptId: receiptRef.id, docNumber, totalAmount });
    } catch (error) {
        console.error('Error creating import receipt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật phiếu nhập kho
router.put('/import-receipts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { importDate, supplierId, items } = req.body;
        
        // Kiểm tra phiếu có tồn tại không
        const receiptDoc = await db.collection('importReceipts').doc(id).get();
        if (!receiptDoc.exists) {
            return res.status(404).json({ success: false, error: 'Import receipt not found' });
        }
        
        // Validate
        if (!importDate) {
            return res.status(400).json({ success: false, error: 'Ngày nhập kho là bắt buộc' });
        }
        if (!supplierId) {
            return res.status(400).json({ success: false, error: 'Nhà cung cấp là bắt buộc' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Phải có ít nhất một nguyên vật liệu' });
        }
        
        // Validate items
        for (const item of items) {
            if (!item.materialId || !item.quantity || !item.unitPrice) {
                return res.status(400).json({ success: false, error: 'Thông tin nguyên vật liệu không đầy đủ' });
            }
        }
        
        // Tính tổng tiền
        let totalAmount = 0;
        items.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const amount = Math.round(quantity * unitPrice);
            totalAmount += amount;
        });
        
        // Cập nhật phiếu nhập kho (giữ nguyên số chứng từ)
        const updateData = {
            importDate: admin.firestore.Timestamp.fromDate(new Date(importDate)),
            supplierId,
            items: items.map(item => ({
                materialId: item.materialId,
                materialCode: item.materialCode,
                materialName: item.materialName,
                unit: item.unit,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                amount: Math.round(parseFloat(item.quantity) * parseFloat(item.unitPrice))
            })),
            totalAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('importReceipts').doc(id).update(updateData);
        
        res.json({ success: true, totalAmount });
    } catch (error) {
        console.error('Error updating import receipt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xóa phiếu nhập kho (soft delete)
router.delete('/import-receipts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra phiếu có tồn tại không
        const receiptDoc = await db.collection('importReceipts').doc(id).get();
        if (!receiptDoc.exists) {
            return res.status(404).json({ success: false, error: 'Import receipt not found' });
        }
        
        // Soft delete: set isActive = false
        await db.collection('importReceipts').doc(id).update({
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting import receipt:', error);
        const errorMessage = error.message || 'Không thể xóa phiếu nhập kho';
        res.status(400).json({ success: false, error: errorMessage });
    }
});

// ==================== QUẢN LÝ XUẤT KHO ====================
// Lấy danh sách phiếu xuất kho (có thể filter theo ngày và số chứng từ)
router.get('/export-receipts', async (req, res) => {
    try {
        const { fromDate, toDate, docNumber } = req.query;
        
        let query = db.collection('exportReceipts');
        
        // Chỉ filter theo số chứng từ nếu có (equality query không cần index)
        if (docNumber) {
            query = query.where('docNumber', '==', docNumber);
        }
        
        // Để tránh lỗi composite index, ta sẽ KHÔNG dùng where clause với exportDate
        // Thay vào đó, lấy tất cả rồi filter và sort ở server-side
        
        // Lấy tất cả documents (không dùng orderBy để tránh lỗi index)
        const receipts = await query.get();
        
        const receiptsList = receipts.docs.map(doc => {
            const data = doc.data();
            const exportDate = data.exportDate?.toDate ? data.exportDate.toDate() : data.exportDate;
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt;
            
            return {
                id: doc.id,
                ...data,
                exportDate,
                createdAt
            };
        });
        
        // Filter theo ngày ở server-side (nếu có) và chỉ lấy các phiếu còn active
        let filteredList = receiptsList.filter(receipt => receipt.isActive !== false);
        if (fromDate || toDate) {
            filteredList = filteredList.filter(receipt => {
                if (!receipt.exportDate) return false;
                const receiptDate = new Date(receipt.exportDate);
                receiptDate.setHours(0, 0, 0, 0);
                
                if (fromDate) {
                    const from = new Date(fromDate);
                    from.setHours(0, 0, 0, 0);
                    if (receiptDate < from) return false;
                }
                
                if (toDate) {
                    const to = new Date(toDate);
                    to.setHours(23, 59, 59, 999);
                    if (receiptDate > to) return false;
                }
                
                return true;
            });
        }
        
        // Sort ở server-side: theo ngày xuất kho (descending), sau đó theo số chứng từ (descending)
        filteredList.sort((a, b) => {
            const dateA = a.exportDate ? new Date(a.exportDate).getTime() : 0;
            const dateB = b.exportDate ? new Date(b.exportDate).getTime() : 0;
            if (dateB !== dateA) {
                return dateB - dateA; // Descending
            }
            const docA = a.docNumber || '';
            const docB = b.docNumber || '';
            return docB.localeCompare(docA); // Descending
        });
        
        res.json({ success: true, receipts: filteredList });
    } catch (error) {
        console.error('Error loading export receipts:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy đơn giá nhập kho cho một nguyên vật liệu
router.get('/materials/:id/import-price', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Lấy tất cả phiếu nhập kho có chứa material này
        const imports = await db.collection('importReceipts').where('isActive', '!=', false).get();
        
        let totalQuantity = 0;
        let totalAmount = 0;
        let latestPrice = 0;
        let latestDate = null;
        
        imports.docs.forEach(doc => {
            const receipt = doc.data();
            if (receipt.items && Array.isArray(receipt.items)) {
                receipt.items.forEach(item => {
                    const materialId = item.materialId || item.material?.id;
                    if (materialId === id) {
                        const quantity = parseFloat(item.quantity) || 0;
                        const unitPrice = parseFloat(item.unitPrice) || 0;
                        totalQuantity += quantity;
                        totalAmount += (quantity * unitPrice);
                        
                        // Lấy giá mới nhất
                        const receiptDate = receipt.importDate?.toDate ? receipt.importDate.toDate() : receipt.importDate;
                        if (!latestDate || (receiptDate && receiptDate > latestDate)) {
                            latestDate = receiptDate;
                            latestPrice = unitPrice;
                        }
                    }
                });
            }
        });
        
        // Trả về giá trung bình hoặc giá mới nhất (ưu tiên giá mới nhất)
        const averagePrice = totalQuantity > 0 ? Math.round(totalAmount / totalQuantity) : 0;
        
        res.json({ 
            success: true, 
            averagePrice,
            latestPrice: latestPrice || averagePrice,
            totalQuantity 
        });
    } catch (error) {
        console.error('Error getting import price:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin một phiếu xuất kho
router.get('/export-receipts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const receiptDoc = await db.collection('exportReceipts').doc(id).get();
        
        if (!receiptDoc.exists) {
            return res.status(404).json({ success: false, error: 'Export receipt not found' });
        }
        
        const data = receiptDoc.data();
        res.json({
            success: true,
            receipt: {
                id: receiptDoc.id,
                ...data,
                exportDate: data.exportDate?.toDate ? data.exportDate.toDate() : data.exportDate,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tạo phiếu xuất kho mới
router.post('/export-receipts', async (req, res) => {
    try {
        const { exportDate, items } = req.body;
        
        // Validate
        if (!exportDate) {
            return res.status(400).json({ success: false, error: 'Ngày xuất kho là bắt buộc' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Phải có ít nhất một nguyên vật liệu' });
        }
        
        // Tính tồn kho hiện tại và kiểm tra số lượng
        const imports = await db.collection('importReceipts').where('isActive', '!=', false).get();
        const exports = await db.collection('exportReceipts').where('isActive', '!=', false).get();
        
        const materialStock = {};
        
        // Tính tồn kho từ import
        imports.docs.forEach(doc => {
            const receipt = doc.data();
            if (receipt.items && Array.isArray(receipt.items)) {
                receipt.items.forEach(item => {
                    const materialId = item.materialId || item.material?.id;
                    if (materialId) {
                        if (!materialStock[materialId]) {
                            materialStock[materialId] = 0;
                        }
                        materialStock[materialId] += item.quantity || 0;
                    }
                });
            }
        });
        
        // Trừ đi export
        exports.docs.forEach(doc => {
            const receipt = doc.data();
            if (receipt.items && Array.isArray(receipt.items)) {
                receipt.items.forEach(item => {
                    const materialId = item.materialId || item.material?.id;
                    if (materialId && materialStock[materialId]) {
                        materialStock[materialId] -= item.quantity || 0;
                    }
                });
            }
        });
        
        // Validate items và kiểm tra tồn kho
        for (const item of items) {
            if (!item.materialId || !item.quantity) {
                return res.status(400).json({ success: false, error: 'Thông tin nguyên vật liệu không đầy đủ' });
            }
            
            const currentStock = materialStock[item.materialId] || 0;
            const exportQuantity = parseFloat(item.quantity) || 0;
            
            if (exportQuantity > currentStock) {
                const material = await db.collection('materials').doc(item.materialId).get();
                const materialName = material.exists ? material.data().name : item.materialName || 'Unknown';
                return res.status(400).json({ 
                    success: false, 
                    error: `Số lượng không đủ. ${materialName} chỉ còn ${currentStock.toFixed(1)} ${item.unit || ''}` 
                });
            }
        }
        
        // Tạo số chứng từ tự động (format: XK + YYYYMM + số thứ tự 3 chữ số)
        const date = new Date(exportDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `XK${year}${month}`;
        
        // Tìm số chứng từ lớn nhất trong tháng
        // Lấy tất cả rồi filter ở server-side để tránh lỗi composite index
        const allReceipts = await db.collection('exportReceipts').get();
        
        let maxNumber = 0;
        allReceipts.docs.forEach(doc => {
            const docNum = doc.data().docNumber;
            if (docNum && docNum.startsWith(monthPrefix)) {
                const num = parseInt(docNum.substring(monthPrefix.length));
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        
        const nextNumber = maxNumber + 1;
        const docNumber = `${monthPrefix}${String(nextNumber).padStart(3, '0')}`;
        
        // Tính tổng tiền
        let totalAmount = 0;
        items.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const amount = Math.round(quantity * unitPrice);
            totalAmount += amount;
        });
        
        // Lưu phiếu xuất kho
        const receiptData = {
            docNumber,
            exportDate: admin.firestore.Timestamp.fromDate(new Date(exportDate)),
            items: items.map(item => ({
                materialId: item.materialId,
                materialCode: item.materialCode,
                materialName: item.materialName,
                unit: item.unit,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                amount: Math.round(parseFloat(item.quantity) * parseFloat(item.unitPrice))
            })),
            totalAmount,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const receiptRef = await db.collection('exportReceipts').add(receiptData);
        
        res.json({ success: true, receiptId: receiptRef.id, docNumber, totalAmount });
    } catch (error) {
        console.error('Error creating export receipt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật phiếu xuất kho
router.put('/export-receipts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { exportDate, items } = req.body;
        
        // Kiểm tra phiếu có tồn tại không
        const receiptDoc = await db.collection('exportReceipts').doc(id).get();
        if (!receiptDoc.exists) {
            return res.status(404).json({ success: false, error: 'Export receipt not found' });
        }
        
        // Validate
        if (!exportDate) {
            return res.status(400).json({ success: false, error: 'Ngày xuất kho là bắt buộc' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Phải có ít nhất một nguyên vật liệu' });
        }
        
        // Tính tồn kho hiện tại (trừ đi phiếu đang sửa)
        const imports = await db.collection('importReceipts').where('isActive', '!=', false).get();
        const exports = await db.collection('exportReceipts').where('isActive', '!=', false).get();
        
        const materialStock = {};
        
        // Tính tồn kho từ import
        imports.docs.forEach(doc => {
            const receipt = doc.data();
            if (receipt.items && Array.isArray(receipt.items)) {
                receipt.items.forEach(item => {
                    const materialId = item.materialId || item.material?.id;
                    if (materialId) {
                        if (!materialStock[materialId]) {
                            materialStock[materialId] = 0;
                        }
                        materialStock[materialId] += item.quantity || 0;
                    }
                });
            }
        });
        
        // Trừ đi export (trừ phiếu đang sửa)
        exports.docs.forEach(doc => {
            if (doc.id !== id) {
                const receipt = doc.data();
                if (receipt.items && Array.isArray(receipt.items)) {
                    receipt.items.forEach(item => {
                        const materialId = item.materialId || item.material?.id;
                        if (materialId && materialStock[materialId]) {
                            materialStock[materialId] -= item.quantity || 0;
                        }
                    });
                }
            }
        });
        
        // Validate items và kiểm tra tồn kho
        for (const item of items) {
            if (!item.materialId || !item.quantity) {
                return res.status(400).json({ success: false, error: 'Thông tin nguyên vật liệu không đầy đủ' });
            }
            
            const currentStock = materialStock[item.materialId] || 0;
            const exportQuantity = parseFloat(item.quantity) || 0;
            
            if (exportQuantity > currentStock) {
                const material = await db.collection('materials').doc(item.materialId).get();
                const materialName = material.exists ? material.data().name : item.materialName || 'Unknown';
                return res.status(400).json({ 
                    success: false, 
                    error: `Số lượng không đủ. ${materialName} chỉ còn ${currentStock.toFixed(1)} ${item.unit || ''}` 
                });
            }
        }
        
        // Tính tổng tiền
        let totalAmount = 0;
        items.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const amount = Math.round(quantity * unitPrice);
            totalAmount += amount;
        });
        
        // Cập nhật phiếu xuất kho (giữ nguyên số chứng từ)
        const updateData = {
            exportDate: admin.firestore.Timestamp.fromDate(new Date(exportDate)),
            items: items.map(item => ({
                materialId: item.materialId,
                materialCode: item.materialCode,
                materialName: item.materialName,
                unit: item.unit,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                amount: Math.round(parseFloat(item.quantity) * parseFloat(item.unitPrice))
            })),
            totalAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('exportReceipts').doc(id).update(updateData);
        
        res.json({ success: true, totalAmount });
    } catch (error) {
        console.error('Error updating export receipt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xóa phiếu xuất kho (soft delete)
router.delete('/export-receipts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra phiếu có tồn tại không
        const receiptDoc = await db.collection('exportReceipts').doc(id).get();
        if (!receiptDoc.exists) {
            return res.status(404).json({ success: false, error: 'Export receipt not found' });
        }
        
        // Soft delete: set isActive = false
        await db.collection('exportReceipts').doc(id).update({
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting export receipt:', error);
        const errorMessage = error.message || 'Không thể xóa phiếu xuất kho';
        res.status(400).json({ success: false, error: errorMessage });
    }
});

// ==================== QUẢN LÝ TỒN KHO ====================
// Lấy bảng kê cân đối nguyên vật liệu tồn kho
router.get('/inventory-balance', async (req, res) => {
    try {
        const { fromDate, toDate, materialName, materialCode } = req.query;
        
        // Lấy tất cả nguyên vật liệu
        const materials = await db.collection('materials').get();
        const materialsList = materials.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(m => m.isActive !== false);
        
        // Lấy tất cả phiếu nhập kho
        const importReceipts = await db.collection('importReceipts').get();
        const importList = importReceipts.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    importDate: data.importDate?.toDate ? data.importDate.toDate() : data.importDate
                };
            })
            .filter(r => r.isActive !== false);
        
        // Lấy tất cả phiếu xuất kho
        const exportReceipts = await db.collection('exportReceipts').get();
        const exportList = exportReceipts.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    exportDate: data.exportDate?.toDate ? data.exportDate.toDate() : data.exportDate
                };
            })
            .filter(r => r.isActive !== false);
        
        // Parse dates nếu có
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        if (to) to.setHours(23, 59, 59, 999);
        
        // Lấy tất cả số dư đầu kỳ
        const openingBalancesSnapshot = await db.collection('opening_balance').get();
        const openingBalancesMap = {};
        openingBalancesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            openingBalancesMap[data.materialId] = data;
        });
        
        // Tính tồn kho cho từng nguyên vật liệu
        const balanceData = materialsList.map(material => {
            // Filter import receipts theo thời gian và material
            const materialImports = importList.filter(receipt => {
                if (receipt.items) {
                    const hasMaterial = receipt.items.some(item => item.materialId === material.id);
                    if (!hasMaterial) return false;
                } else {
                    return false;
                }
                
                if (from && receipt.importDate) {
                    const receiptDate = new Date(receipt.importDate);
                    if (receiptDate < from) return false;
                }
                if (to && receipt.importDate) {
                    const receiptDate = new Date(receipt.importDate);
                    if (receiptDate > to) return false;
                }
                return true;
            });
            
            // Filter export receipts theo thời gian và material
            const materialExports = exportList.filter(receipt => {
                if (receipt.items) {
                    const hasMaterial = receipt.items.some(item => item.materialId === material.id);
                    if (!hasMaterial) return false;
                } else {
                    return false;
                }
                
                if (from && receipt.exportDate) {
                    const receiptDate = new Date(receipt.exportDate);
                    if (receiptDate < from) return false;
                }
                if (to && receipt.exportDate) {
                    const receiptDate = new Date(receipt.exportDate);
                    if (receiptDate > to) return false;
                }
                return true;
            });
            
            // Tính tổng nhập trong kỳ
            let importQuantity = 0;
            let importTotalAmount = 0;
            materialImports.forEach(receipt => {
                receipt.items.forEach(item => {
                    if (item.materialId === material.id) {
                        importQuantity += item.quantity || 0;
                        importTotalAmount += item.amount || 0;
                    }
                });
            });
            const importUnitPrice = importQuantity > 0 ? Math.round(importTotalAmount / importQuantity) : 0;
            
            // Tính tổng xuất trong kỳ
            let exportQuantity = 0;
            let exportTotalAmount = 0;
            materialExports.forEach(receipt => {
                receipt.items.forEach(item => {
                    if (item.materialId === material.id) {
                        exportQuantity += item.quantity || 0;
                        exportTotalAmount += item.amount || 0;
                    }
                });
            });
            const exportUnitPrice = exportQuantity > 0 ? Math.round(exportTotalAmount / exportQuantity) : 0;
            
            // Lấy số dư đầu kỳ từ map
            let openingQuantity = 0;
            let openingUnitPrice = 0;
            let openingAmount = 0;
            
            if (openingBalancesMap[material.id]) {
                const openingBalance = openingBalancesMap[material.id];
                openingQuantity = openingBalance.quantity || 0;
                openingUnitPrice = openingBalance.unitPrice || 0;
                openingAmount = openingBalance.amount || 0;
            }
            
            // Tồn cuối kỳ = (Dư đầu kỳ + Nhập) - Xuất (không được âm, tối thiểu = 0)
            const closingQuantity = Math.max(0, Math.round((openingQuantity + importQuantity) - exportQuantity));
            const closingAmount = Math.max(0, Math.round((openingAmount + importTotalAmount) - exportTotalAmount));
            const closingUnitPrice = closingQuantity > 0 ? Math.round(closingAmount / closingQuantity) : 0;
            
            return {
                materialId: material.id,
                materialCode: material.code || '',
                materialName: material.name || '',
                unit: material.unit || '',
                opening: {
                    quantity: openingQuantity,
                    unitPrice: openingUnitPrice,
                    amount: openingAmount
                },
                import: {
                    quantity: Math.round(importQuantity),
                    unitPrice: importUnitPrice,
                    amount: Math.round(importTotalAmount)
                },
                export: {
                    quantity: Math.round(exportQuantity),
                    unitPrice: exportUnitPrice,
                    amount: Math.round(exportTotalAmount)
                },
                closing: {
                    quantity: closingQuantity,
                    unitPrice: closingUnitPrice,
                    amount: closingAmount
                }
            };
        });
        
        // Filter theo tên và mã số nếu có
        let filteredData = balanceData;
        if (materialName) {
            const searchName = materialName.toLowerCase().trim();
            filteredData = filteredData.filter(item => 
                item.materialName.toLowerCase().includes(searchName)
            );
        }
        if (materialCode) {
            const searchCode = materialCode.toLowerCase().trim();
            filteredData = filteredData.filter(item => 
                item.materialCode.toLowerCase().includes(searchCode)
            );
        }
        
        res.json({ success: true, balance: filteredData });
    } catch (error) {
        console.error('Error loading inventory balance:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ==================== QUẢN LÝ SỐ DƯ ĐẦU KỲ ====================
// Lấy số dư đầu kỳ
router.get('/opening-balance', async (req, res) => {
    try {
        const { materialCode, materialName } = req.query;
        
        // Lấy tất cả số dư đầu kỳ
        const balancesSnapshot = await db.collection('opening_balance').get();
        const balancesList = [];
        
        for (const doc of balancesSnapshot.docs) {
            const balanceData = doc.data();
            const materialId = balanceData.materialId;
            
            // Lấy thông tin nguyên vật liệu
            const materialDoc = await db.collection('materials').doc(materialId).get();
            if (!materialDoc.exists) continue;
            
            const material = materialDoc.data();
            if (material.isActive === false) continue;
            
            // Filter theo mã số và tên nếu có
            if (materialCode) {
                const searchCode = materialCode.toLowerCase().trim();
                if (!material.code || !material.code.toLowerCase().includes(searchCode)) {
                    continue;
                }
            }
            if (materialName) {
                const searchName = materialName.toLowerCase().trim();
                if (!material.name || !material.name.toLowerCase().includes(searchName)) {
                    continue;
                }
            }
            
            balancesList.push({
                id: doc.id,
                materialId: materialId,
                materialCode: material.code || '',
                materialName: material.name || '',
                unit: material.unit || '',
                quantity: balanceData.quantity || 0,
                unitPrice: balanceData.unitPrice || 0,
                amount: balanceData.amount || 0
            });
        }
        
        res.json({ success: true, balances: balancesList });
    } catch (error) {
        console.error('Error loading opening balance:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lưu số dư đầu kỳ
router.post('/opening-balance', async (req, res) => {
    try {
        const { balances } = req.body;
        
        if (!balances || !Array.isArray(balances)) {
            return res.status(400).json({ success: false, error: 'Invalid balances data' });
        }
        
        // Xóa tất cả số dư đầu kỳ cũ
        const oldBalancesSnapshot = await db.collection('opening_balance').get();
        const deletePromises = oldBalancesSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        
        // Lưu số dư đầu kỳ mới
        const savePromises = balances.map(balance => {
            return db.collection('opening_balance').add({
                materialId: balance.materialId,
                quantity: parseFloat(balance.quantity) || 0,
                unitPrice: parseFloat(balance.unitPrice) || 0,
                amount: parseFloat(balance.amount) || 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await Promise.all(savePromises);
        
        res.json({ success: true, message: 'Opening balance saved successfully' });
    } catch (error) {
        console.error('Error saving opening balance:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật số dư đầu kỳ nhà cung cấp
router.put('/suppliers/:id/opening-balance', async (req, res) => {
    try {
        const { id } = req.params;
        const { openingBalance, note } = req.body;
        
        const supplierDoc = await db.collection('suppliers').doc(id).get();
        if (!supplierDoc.exists) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }
        
        await db.collection('suppliers').doc(id).update({
            openingBalance: parseFloat(openingBalance) || 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating supplier opening balance:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ==================== QUẢN LÝ THANH TOÁN NHÀ CUNG CẤP ====================
// Phát sinh nợ cho nhà cung cấp
router.post('/suppliers/debt/add', async (req, res) => {
    try {
        const { supplierId, amount, note } = req.body;
        
        if (!supplierId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Supplier ID and amount are required' });
        }
        
        const supplierDoc = await db.collection('suppliers').doc(supplierId).get();
        if (!supplierDoc.exists) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }
        
        // Tạo một import receipt giả để lưu phát sinh nợ
        const debtReceiptData = {
            supplierId,
            supplierName: supplierDoc.data().name || '',
            supplierPhone: supplierDoc.data().phone || '',
            totalAmount: amount,
            finalTotal: amount,
            status: 'completed',
            paymentStatus: 'unpaid', // Chưa thanh toán = phát sinh nợ
            items: [],
            note: note || 'Phát sinh nợ',
            isDebtTransaction: true, // Đánh dấu đây là giao dịch phát sinh nợ
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const debtReceiptRef = await db.collection('import_receipts').add(debtReceiptData);
        
        res.json({
            success: true,
            message: 'Phát sinh nợ thành công',
            receiptId: debtReceiptRef.id
        });
    } catch (error) {
        console.error('Error adding supplier debt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Thanh toán dư nợ cho nhà cung cấp
router.post('/suppliers/debt/pay', async (req, res) => {
    try {
        const { supplierId, amount, note } = req.body;
        
        if (!supplierId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Supplier ID and amount are required' });
        }
        
        const supplierDoc = await db.collection('suppliers').doc(supplierId).get();
        if (!supplierDoc.exists) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }
        
        const supplier = supplierDoc.data();
        
        // Tính công nợ hiện tại theo cùng logic như trong Quản lý Nhà Cung Cấp
        const importReceiptsSnapshot = await db.collection('import_receipts')
            .where('supplierId', '==', supplierId)
            .get();
        
        const openingBalance = supplier.openingBalance || 0;
        let totalDebt = 0;
        let totalPaid = 0;
        
        importReceiptsSnapshot.docs.forEach(doc => {
            const receipt = doc.data();
            // Tính công nợ theo cùng logic
            if (receipt.paymentStatus !== 'paid') {
                totalDebt += Math.abs(receipt.totalAmount || 0);
            } else {
                totalPaid += Math.abs(receipt.totalAmount || 0);
            }
        });
        
        const currentDebt = openingBalance + totalDebt - totalPaid;
        
        if (amount > currentDebt) {
            return res.status(400).json({ 
                success: false, 
                error: `Số tiền thanh toán (${amount.toLocaleString('vi-VN')} VNĐ) vượt quá dư nợ hiện tại (${currentDebt.toLocaleString('vi-VN')} VNĐ)` 
            });
        }
        
        // Tìm các import receipt chưa thanh toán và thanh toán từng phần
        let remainingAmount = amount;
        const receiptsToPay = [];
        
        // Sắp xếp các receipt chưa thanh toán theo ngày tạo (cũ nhất trước)
        const unpaidReceipts = importReceiptsSnapshot.docs
            .filter(doc => {
                const receipt = doc.data();
                return receipt.paymentStatus !== 'paid';
            })
            .map(doc => {
                const receiptData = doc.data();
                let createdAtDate;
                if (receiptData.createdAt?.toDate) {
                    createdAtDate = receiptData.createdAt.toDate();
                } else if (receiptData.createdAt) {
                    createdAtDate = new Date(receiptData.createdAt);
                } else {
                    createdAtDate = new Date();
                }
                return {
                    id: doc.id,
                    ...receiptData,
                    createdAt: createdAtDate
                };
            })
            .sort((a, b) => a.createdAt - b.createdAt);
        
        for (const receipt of unpaidReceipts) {
            if (remainingAmount <= 0) break;
            
            const receiptAmount = Math.abs(receipt.totalAmount || 0);
            const payAmount = Math.min(remainingAmount, receiptAmount);
            
            // Cập nhật receipt: nếu thanh toán đủ thì đánh dấu paid
            if (payAmount >= receiptAmount) {
                await db.collection('import_receipts').doc(receipt.id).update({
                    paymentStatus: 'paid',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                receiptsToPay.push({ receiptId: receipt.id, amount: receiptAmount });
                remainingAmount -= receiptAmount;
            } else {
                // Nếu thanh toán một phần, tạo receipt mới với số tiền đã thanh toán
                // và cập nhật receipt cũ với số tiền còn lại
                const remainingReceiptAmount = receiptAmount - payAmount;
                await db.collection('import_receipts').doc(receipt.id).update({
                    totalAmount: remainingReceiptAmount,
                    finalTotal: remainingReceiptAmount,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                // Tạo receipt mới với phần đã thanh toán
                await db.collection('import_receipts').add({
                    supplierId,
                    supplierName: receipt.supplierName || supplier.name || '',
                    supplierPhone: receipt.supplierPhone || supplier.phone || '',
                    totalAmount: payAmount,
                    finalTotal: payAmount,
                    status: 'completed',
                    paymentStatus: 'paid',
                    items: receipt.items || [],
                    note: `Thanh toán một phần cho receipt ${receipt.id}`,
                    originalReceiptId: receipt.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                receiptsToPay.push({ receiptId: receipt.id, amount: payAmount });
                remainingAmount -= payAmount;
            }
        }
        
        // Nếu còn tiền thừa (thanh toán nhiều hơn tổng các receipt chưa thanh toán)
        // thì tạo một receipt thanh toán với số tiền thừa
        if (remainingAmount > 0) {
            await db.collection('import_receipts').add({
                supplierId,
                supplierName: supplier.name || '',
                supplierPhone: supplier.phone || '',
                totalAmount: remainingAmount,
                finalTotal: remainingAmount,
                status: 'completed',
                paymentStatus: 'paid',
                items: [],
                note: note || 'Thanh toán dư nợ (số tiền thừa)',
                isPaymentTransaction: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Tạo phiếu thu
        const receipt = {
            id: `RECEIPT-${Date.now()}`,
            supplierId,
            supplierCode: supplier.code || '',
            supplierName: supplier.name || '',
            amount,
            note: note || 'Thanh toán dư nợ',
            date: new Date(),
            receiptsPaid: receiptsToPay
        };
        
        res.json({
            success: true,
            message: 'Thanh toán thành công',
            receipt
        });
    } catch (error) {
        console.error('Error paying supplier debt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;

