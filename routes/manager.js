const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

// ========== QUẢN LÝ KHÁCH HÀNG ==========
// Lấy danh sách khách hàng
router.get('/customers', async (req, res) => {
    try {
        const customers = await db.collection('customers').get();
        
        const customersList = await Promise.all(customers.docs
            .filter(doc => {
                const data = doc.data();
                // Chỉ lấy khách hàng đang hoạt động (isActive !== false hoặc không có field isActive)
                // Nếu không có field isActive, mặc định là true (đang hoạt động)
                if (data.isActive === undefined) return true;
                return data.isActive !== false;
            })
            .map(async (doc) => {
            const customerData = { id: doc.id, ...doc.data() };
            
            // Tính tổng đơn hàng và tổng tiền
            const orders = await db.collection('orders')
                .where('customerId', '==', doc.id)
                .get();
            
            customerData.totalOrders = orders.size;
            customerData.totalAmount = orders.docs.reduce((sum, orderDoc) => {
                const order = orderDoc.data();
                return sum + (order.totalAmount || 0);
            }, 0);
            
            // Tính công nợ
            const openingBalance = customerData.openingBalance || 0;
            const totalDebt = orders.docs.reduce((sum, orderDoc) => {
                const order = orderDoc.data();
                if (order.paymentStatus !== 'paid') {
                    return sum + (order.totalAmount || 0);
                }
                return sum;
            }, 0);
            const totalPaid = orders.docs.reduce((sum, orderDoc) => {
                const order = orderDoc.data();
                if (order.paymentStatus === 'paid') {
                    return sum + (order.totalAmount || 0);
                }
                return sum;
            }, 0);
            
            customerData.debt = openingBalance + totalDebt - totalPaid;
            
            // Tính lại điểm tích lũy từ tổng hóa đơn đã thanh toán
            // Tìm tất cả hóa đơn đã thanh toán (theo customerId, phone, hoặc name)
            const allPaidOrdersSnapshot = await db.collection('orders')
                .where('status', '==', 'completed')
                .where('paymentStatus', '==', 'paid')
                .get();
            
            // Chuẩn hóa số điện thoại để so sánh (loại bỏ khoảng trắng, dấu +, dấu -)
            const normalizePhone = (phone) => {
                if (!phone) return '';
                return phone.toString().replace(/[\s\+\-\(\)]/g, '').trim();
            };
            
            const customerPhoneNormalized = normalizePhone(customerData.phone);
            
            // Lọc hóa đơn của khách hàng này
            const paidOrders = allPaidOrdersSnapshot.docs.filter(orderDoc => {
                const order = orderDoc.data();
                // Kiểm tra theo customerId
                if (order.customerId === doc.id) return true;
                // Kiểm tra theo phone (so sánh đã chuẩn hóa)
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
                // Kiểm tra theo name (so sánh không phân biệt hoa thường)
                if (customerData.name) {
                    const customerNameLower = customerData.name.toLowerCase().trim();
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
            
            console.log(`[GET /api/manager/customers] Customer ${doc.id} (${customerData.name || 'N/A'}):`);
            console.log(`  - Phone: ${customerData.phone || 'N/A'} (normalized: ${customerPhoneNormalized})`);
            console.log(`  - Total paid orders in system: ${allPaidOrdersSnapshot.size}`);
            console.log(`  - Found ${paidOrders.length} paid orders for this customer`);
            
            // Cập nhật customerId cho các hóa đơn chưa có
            for (const orderDoc of paidOrders) {
                const order = orderDoc.data();
                if (order.customerId !== doc.id) {
                    await orderDoc.ref.update({
                        customerId: doc.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            // Tính tổng tiền từ các hóa đơn đã thanh toán (giống logic trong reports/invoices)
            let totalRevenue = 0;
            paidOrders.forEach(orderDoc => {
                const order = orderDoc.data();
                // Sử dụng finalTotal hoặc total, giống như trong reports/invoices
                const amount = order.finalTotal || order.total || 0;
                totalRevenue += amount;
            });
            
            const totalPoints = Math.floor(totalRevenue / 200000);
            
            // Đếm số voucher đã đổi
            const vouchersSnapshot = await db.collection('vouchers')
                .where('customerId', '==', doc.id)
                .get();
            
            const vouchersCount = vouchersSnapshot.size;
            const pointsUsedForVouchers = vouchersCount * 50;
            let remainingPoints = totalPoints - pointsUsedForVouchers;
            
            // Tự động đổi voucher nếu đạt điều kiện: 10 hóa đơn, 5 triệu VNĐ và 50 điểm
            let vouchersCreated = 0;
            const ordersCount = paidOrders.length;
            console.log(`[GET /customers] Customer ${doc.id}: ordersCount=${ordersCount}, totalRevenue=${totalRevenue}, remainingPoints=${remainingPoints}`);
            if (remainingPoints >= 50 && ordersCount >= 10 && totalRevenue >= 5000000) {
                console.log(`[GET /customers] Customer ${doc.id} đủ điều kiện để tự động quy đổi voucher`);
            } else {
                console.log(`[GET /customers] Customer ${doc.id} chưa đủ điều kiện: ordersCount=${ordersCount} (cần >=10), totalRevenue=${totalRevenue} (cần >=5000000), remainingPoints=${remainingPoints} (cần >=50)`);
            }
            while (remainingPoints >= 50 && ordersCount >= 10 && totalRevenue >= 5000000) {
                // Tạo voucher trị giá 500k
                const voucherData = {
                    customerId: doc.id,
                    value: 500000,
                    pointsUsed: 50,
                    status: 'active',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: null
                };
                
                await db.collection('vouchers').add(voucherData);
                vouchersCreated++;
                remainingPoints -= 50;
            }
            
            // Cập nhật điểm còn lại vào customer
            if (vouchersCreated > 0 || customerData.points !== remainingPoints) {
                await db.collection('customers').doc(doc.id).update({
                    points: remainingPoints,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            customerData.points = remainingPoints;
            customerData.totalPoints = totalPoints;
            customerData.totalRevenue = totalRevenue;
            
            // Thêm tổng số hóa đơn đã thanh toán và tổng tiền thanh toán
            customerData.totalPaidOrders = paidOrders.length;
            customerData.totalPaidAmount = totalRevenue;
            
            console.log(`  - Total revenue: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
            console.log(`  - totalPaidOrders: ${customerData.totalPaidOrders}`);
            console.log(`  - totalPaidAmount: ${customerData.totalPaidAmount.toLocaleString('vi-VN')} VNĐ`);
            console.log(`---`);
            
            return customerData;
        }));
        
        res.json({ success: true, customers: customersList });
    } catch (error) {
        console.error('Error loading customers:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy danh sách công nợ tất cả khách hàng (với filter) - PHẢI ĐẶT TRƯỚC route /customers/:id
router.get('/customers/debt-summary', async (req, res) => {
    try {
        const { fromDate, toDate, customerCode, customerName } = req.query;
        
        // Lấy tất cả khách hàng
        let customersQuery = db.collection('customers');
        const customersSnapshot = await customersQuery.get();
        
        const debtSummary = [];
        
        for (const customerDoc of customersSnapshot.docs) {
            const customer = { id: customerDoc.id, ...customerDoc.data() };
            
            // Filter theo mã số hoặc tên
            if (customerCode && !customer.code?.toUpperCase().includes(customerCode.toUpperCase())) {
                continue;
            }
            if (customerName && !customer.name?.toLowerCase().includes(customerName.toLowerCase())) {
                continue;
            }
            
            // Chỉ lấy khách hàng active
            if (customer.isActive === false) {
                continue;
            }
            
            // Lấy đơn hàng của khách hàng
            let ordersQuery = db.collection('orders').where('customerId', '==', customer.id);
            const ordersSnapshot = await ordersQuery.get();
            
            // Tính toán công nợ
            const openingBalance = customer.openingBalance || 0;
            let debtInPeriod = 0;
            let paidInPeriod = 0;
            let openingDebt = openingBalance; // Nợ đầu kỳ = số dư đầu kỳ
            
            // Tính nợ đầu kỳ (số còn nợ đến "từ ngày")
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                openingDebt = openingBalance;
                
                ordersSnapshot.docs.forEach(doc => {
                    const order = doc.data();
                    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                    
                    if (orderDate < fromDateObj) {
                        if (order.paymentStatus !== 'paid') {
                            openingDebt += (order.totalAmount || 0);
                        } else {
                            openingDebt -= (order.totalAmount || 0);
                        }
                    }
                });
            }
            
            // Tính phát sinh nợ và đã trả trong kỳ
            ordersSnapshot.docs.forEach(doc => {
                const order = doc.data();
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                const amount = order.totalAmount || 0;
                
                // Kiểm tra ngày
                let includeOrder = true;
                if (fromDate) {
                    const fromDateObj = new Date(fromDate);
                    if (orderDate < fromDateObj) {
                        includeOrder = false;
                    }
                }
                if (toDate) {
                    const toDateObj = new Date(toDate);
                    toDateObj.setHours(23, 59, 59, 999);
                    if (orderDate > toDateObj) {
                        includeOrder = false;
                    }
                }
                
                if (includeOrder) {
                    if (order.paymentStatus === 'paid') {
                        paidInPeriod += amount;
                    } else {
                        debtInPeriod += amount;
                    }
                }
            });
            
            const remainingDebt = openingDebt + debtInPeriod - paidInPeriod;
            
            debtSummary.push({
                customerId: customer.id,
                customerCode: customer.code,
                customerName: customer.name,
                openingDebt,
                debtInPeriod,
                paidInPeriod,
                remainingDebt
            });
        }
        
        res.json({ success: true, debtSummary });
    } catch (error) {
        console.error('Error loading debt summary:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin công nợ của khách hàng theo ID
router.get('/customers/:id/debt', async (req, res) => {
    try {
        const { id } = req.params;
        const customerDoc = await db.collection('customers').doc(id).get();
        
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const customer = customerDoc.data();
        
        // Tính công nợ theo cùng logic như trong GET /customers
        const orders = await db.collection('orders')
            .where('customerId', '==', id)
            .get();
        
        const openingBalance = customer.openingBalance || 0;
        const totalDebt = orders.docs.reduce((sum, orderDoc) => {
            const order = orderDoc.data();
            if (order.paymentStatus !== 'paid') {
                return sum + (order.totalAmount || 0);
            }
            return sum;
        }, 0);
        const totalPaid = orders.docs.reduce((sum, orderDoc) => {
            const order = orderDoc.data();
            if (order.paymentStatus === 'paid') {
                return sum + (order.totalAmount || 0);
            }
            return sum;
        }, 0);
        
        const closingBalance = openingBalance + totalDebt - totalPaid;
        
        res.json({
            success: true,
            openingBalance,
            totalDebt,
            totalPaid,
            closingBalance
        });
    } catch (error) {
        console.error('Error loading customer debt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin khách hàng theo ID
router.get('/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const customerDoc = await db.collection('customers').doc(id).get();
        
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const customerData = { id: customerDoc.id, ...customerDoc.data() };
        
        // Đảm bảo points được trả về (mặc định là 0 nếu không có)
        if (customerData.points === undefined) {
            customerData.points = 0;
        }
        
        res.json({ success: true, customer: customerData });
    } catch (error) {
        console.error('Error loading customer:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Đăng ký thành viên online (không yêu cầu idCard)
router.post('/customers/register', async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({ success: false, error: 'Họ tên và số điện thoại là bắt buộc' });
        }
        
        // Kiểm tra số lượng khách hàng (< 10000)
        const existingCustomers = await db.collection('customers').get();
        
        if (existingCustomers.size >= 10000) {
            return res.status(400).json({ 
                success: false, 
                error: 'Đã đạt giới hạn 10000 khách hàng' 
            });
        }
        
        // Kiểm tra số điện thoại đã tồn tại chưa
        const checkPhone = await db.collection('customers')
            .where('phone', '==', phone)
            .get();
        
        if (!checkPhone.empty) {
            const existingCustomer = checkPhone.docs[0];
            const customerData = existingCustomer.data();
            if (customerData.isActive !== false) {
                return res.json({ 
                    success: true, 
                    customerId: existingCustomer.id, 
                    code: customerData.code,
                    message: 'Số điện thoại đã được đăng ký'
                });
            }
        }
        
        // Tạo mã số khách hàng: NMU + số thứ tự (4 chữ số)
        let customerNumber = existingCustomers.size + 1;
        let customerCode = `NMU${String(customerNumber).padStart(4, '0')}`;
        
        // Kiểm tra mã số đã tồn tại chưa
        const checkCode = await db.collection('customers')
            .where('code', '==', customerCode)
            .get();
        
        if (!checkCode.empty) {
            // Nếu đã tồn tại, tìm mã số tiếp theo
            while (customerNumber <= 9999) {
                customerNumber++;
                customerCode = `NMU${String(customerNumber).padStart(4, '0')}`;
                const check = await db.collection('customers')
                    .where('code', '==', customerCode)
                    .get();
                if (check.empty) {
                    break;
                }
            }
        }
        
        const customerData = {
            code: customerCode,
            name,
            idCard: '', // Không bắt buộc cho đăng ký online
            address: address || '',
            phone,
            company: email || '', // Lưu email vào company field
            openingBalance: 0,
            points: 0, // Điểm tích lũy ban đầu
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const customerRef = await db.collection('customers').add(customerData);
        
        res.json({ success: true, customerId: customerRef.id, code: customerCode });
    } catch (error) {
        console.error('Error registering customer:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Thêm khách hàng mới
router.post('/customers', async (req, res) => {
    try {
        const { name, idCard, address, phone, company } = req.body;
        
        if (!name || !idCard || !address || !phone) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        // Kiểm tra số lượng khách hàng (< 10000)
        const existingCustomers = await db.collection('customers').get();
        
        if (existingCustomers.size >= 10000) {
            return res.status(400).json({ 
                success: false, 
                error: 'Đã đạt giới hạn 10000 khách hàng' 
            });
        }
        
        // Tạo mã số khách hàng: NMU + số thứ tự (4 chữ số)
        let customerNumber = existingCustomers.size + 1;
        let customerCode = `NMU${String(customerNumber).padStart(4, '0')}`;
        
        // Kiểm tra mã số đã tồn tại chưa
        const checkCode = await db.collection('customers')
            .where('code', '==', customerCode)
            .get();
        
        if (!checkCode.empty) {
            // Nếu đã tồn tại, tìm mã số tiếp theo
            while (customerNumber <= 9999) {
                customerNumber++;
                customerCode = `NMU${String(customerNumber).padStart(4, '0')}`;
                const check = await db.collection('customers')
                    .where('code', '==', customerCode)
                    .get();
                if (check.empty) {
                    break;
                }
            }
        }
        
        const customerData = {
            code: customerCode,
            name,
            idCard,
            address,
            phone,
            company: company || '',
            openingBalance: 0,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const customerRef = await db.collection('customers').add(customerData);
        
        res.json({ success: true, customerId: customerRef.id, code: customerCode });
    } catch (error) {
        console.error('Error adding customer:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin công nợ chi tiết khách hàng (phải đặt SAU route /customers/debt-summary)
router.get('/customers/:id/debt', async (req, res) => {
    try {
        const { id } = req.params;
        const { fromDate, toDate } = req.query;
        
        const customerDoc = await db.collection('customers').doc(id).get();
        
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const customer = { id: customerDoc.id, ...customerDoc.data() };
        const openingBalance = customer.openingBalance || 0;
        
        // Lấy tất cả đơn hàng của khách hàng
        const orders = await db.collection('orders')
            .where('customerId', '==', id)
            .get();
        
        // Tính nợ đầu kỳ (số còn nợ đến "từ ngày")
        let openingDebt = openingBalance;
        if (fromDate) {
            const fromDateObj = new Date(fromDate);
            orders.docs.forEach(doc => {
                const order = doc.data();
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                
                if (orderDate < fromDateObj) {
                    if (order.paymentStatus !== 'paid') {
                        openingDebt += (order.totalAmount || 0);
                    } else {
                        openingDebt -= (order.totalAmount || 0);
                    }
                }
            });
        }
        
        const debtDetails = [];
        let currentBalance = openingDebt;
        let totalDebtInPeriod = 0;
        let totalPaidInPeriod = 0;
        
        // Sắp xếp đơn hàng theo ngày
        const sortedOrders = orders.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateA - dateB;
        });
        
        sortedOrders.forEach(order => {
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            const amount = order.totalAmount || 0;
            
            // Kiểm tra filter ngày
            let includeOrder = true;
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                if (orderDate < fromDateObj) {
                    includeOrder = false;
                }
            }
            if (toDate) {
                const toDateObj = new Date(toDate);
                toDateObj.setHours(23, 59, 59, 999);
                if (orderDate > toDateObj) {
                    includeOrder = false;
                }
            }
            
            if (includeOrder) {
                let debt = 0;
                let paid = 0;
                
                if (order.paymentStatus === 'paid') {
                    paid = amount;
                    currentBalance -= amount;
                    totalPaidInPeriod += amount;
                } else {
                    debt = amount;
                    currentBalance += amount;
                    totalDebtInPeriod += amount;
                }
                
                debtDetails.push({
                    documentNumber: order.orderNumber || order.id.substring(0, 8),
                    date: order.createdAt,
                    debt,
                    paid,
                    balance: currentBalance
                });
            }
        });
        
        res.json({
            success: true,
            customer: {
                id: customer.id,
                code: customer.code,
                name: customer.name
            },
            openingDebt,
            totalDebtInPeriod,
            totalPaidInPeriod,
            closingDebt: openingDebt + totalDebtInPeriod - totalPaidInPeriod,
            debtDetails
        });
    } catch (error) {
        console.error('Error loading customer debt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});


// Cập nhật số dư đầu kỳ
router.put('/customers/:id/opening-balance', async (req, res) => {
    try {
        const { id } = req.params;
        const { openingBalance, note } = req.body;
        
        if (openingBalance === undefined || openingBalance === null) {
            return res.status(400).json({ success: false, error: 'Opening balance is required' });
        }
        
        const customerRef = db.collection('customers').doc(id);
        const customerDoc = await customerRef.get();
        
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const oldBalance = customerDoc.data().openingBalance || 0;
        
        await customerRef.update({
            openingBalance: parseFloat(openingBalance),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Ghi log thay đổi số dư đầu kỳ
        await db.collection('customerBalanceLogs').add({
            customerId: id,
            oldBalance,
            newBalance: parseFloat(openingBalance),
            note: note || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'manager' // Có thể lấy từ session sau
        });
        
        res.json({ success: true, message: 'Opening balance updated successfully' });
    } catch (error) {
        console.error('Error updating opening balance:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin khách hàng theo ID
router.get('/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const customerRef = db.collection('customers').doc(id);
        const customerDoc = await customerRef.get();
        
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const customerData = { id: customerDoc.id, ...customerDoc.data() };
        
        // Tính lại điểm tích lũy từ tổng hóa đơn đã thanh toán (giống logic trong GET /customers)
        const allPaidOrdersSnapshot = await db.collection('orders')
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'paid')
            .get();
        
        // Chuẩn hóa số điện thoại để so sánh
        const normalizePhone = (phone) => {
            if (!phone) return '';
            return phone.toString().replace(/[\s\+\-\(\)]/g, '').trim();
        };
        
        const customerPhoneNormalized = normalizePhone(customerData.phone);
        
        // Lọc hóa đơn của khách hàng này
        const paidOrders = allPaidOrdersSnapshot.docs.filter(orderDoc => {
            const order = orderDoc.data();
            if (order.customerId === id) return true;
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
            if (customerData.name) {
                const customerNameLower = customerData.name.toLowerCase().trim();
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
            .where('customerId', '==', id)
            .get();
        
        const vouchersCount = vouchersSnapshot.size;
        const pointsUsedForVouchers = vouchersCount * 50;
        let remainingPoints = totalPoints - pointsUsedForVouchers;
        
        // Tự động đổi voucher nếu đạt điều kiện: 10 hóa đơn, 5 triệu VNĐ và 50 điểm
        let vouchersCreated = 0;
        const ordersCount = paidOrders.length;
        while (remainingPoints >= 50 && ordersCount >= 10 && totalRevenue >= 5000000) {
            const voucherData = {
                customerId: id,
                value: 500000,
                pointsUsed: 50,
                status: 'active',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: null
            };
            
            await db.collection('vouchers').add(voucherData);
            vouchersCreated++;
            remainingPoints -= 50;
        }
        
        // Cập nhật điểm còn lại vào customer
        if (vouchersCreated > 0 || customerData.points !== remainingPoints) {
            await db.collection('customers').doc(id).update({
                points: remainingPoints,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        customerData.points = remainingPoints;
        customerData.totalPoints = totalPoints;
        customerData.totalRevenue = totalRevenue;
        customerData.totalPaidOrders = paidOrders.length;
        customerData.totalPaidAmount = totalRevenue;
        
        res.json({ success: true, customer: customerData });
    } catch (error) {
        console.error('Error getting customer:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật thông tin khách hàng
router.put('/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, idCard, address, phone, company } = req.body;
        
        const customerRef = db.collection('customers').doc(id);
        const customerDoc = await customerRef.get();
        
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (name) updateData.name = name;
        if (idCard) updateData.idCard = idCard;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;
        if (company !== undefined) updateData.company = company;
        
        await customerRef.update(updateData);
        
        res.json({ success: true, message: 'Customer updated successfully' });
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xóa khách hàng (soft delete)
router.delete('/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const customerRef = db.collection('customers').doc(id);
        const customerDoc = await customerRef.get();
        
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        await customerRef.update({
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ========== QUẢN LÝ ĐƠN HÀNG ==========
// Lấy danh sách đơn hàng chờ xác nhận
router.get('/orders/pending', async (req, res) => {
    try {
        const orders = await db.collection('orders')
            .where('status', '==', 'pending')
            .get();
        
        const ordersList = await Promise.all(orders.docs.map(async (doc) => {
            const orderData = { id: doc.id, ...doc.data() };
            
            // Lấy thông tin khách hàng từ collection customers
            if (orderData.customerId) {
                const customerDoc = await db.collection('customers').doc(orderData.customerId).get();
                if (customerDoc.exists) {
                    orderData.customer = { id: customerDoc.id, ...customerDoc.data() };
                }
            }
            
            // Convert Timestamp to Date nếu có
            if (orderData.eatingTime && orderData.eatingTime.toDate) {
                orderData.eatingTime = orderData.eatingTime.toDate();
            }
            if (orderData.createdAt && orderData.createdAt.toDate) {
                orderData.createdAt = orderData.createdAt.toDate();
            }
            
            // Đảm bảo tableNumbers và tableNumber được trả về (có thể là null hoặc undefined)
            if (!orderData.hasOwnProperty('tableNumbers')) {
                orderData.tableNumbers = orderData.tableNumbers || null;
            }
            if (!orderData.hasOwnProperty('tableNumber')) {
                orderData.tableNumber = orderData.tableNumber || null;
            }
            
            // Debug log
            console.log(`API Order ${orderData.id}: tableNumbers=${JSON.stringify(orderData.tableNumbers)}, tableNumber=${orderData.tableNumber}, eatingTime=${orderData.eatingTime}`);
            
            return orderData;
        }));
        
        res.json({ success: true, orders: ordersList });
    } catch (error) {
        console.error('Error loading pending orders:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Đếm số đơn hàng chờ xác nhận
router.get('/orders/pending/count', async (req, res) => {
    try {
        const orders = await db.collection('orders')
            .where('status', '==', 'pending')
            .get();
        
        res.json({ success: true, count: orders.size });
    } catch (error) {
        console.error('Error counting pending orders:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy tất cả đơn hàng
router.get('/orders', async (req, res) => {
    try {
        const orders = await db.collection('orders').get();
        
        const ordersList = await Promise.all(orders.docs.map(async (doc) => {
            const orderData = { id: doc.id, ...doc.data() };
            
            // Lấy thông tin khách hàng từ collection customers
            if (orderData.customerId) {
                const customerDoc = await db.collection('customers').doc(orderData.customerId).get();
                if (customerDoc.exists) {
                    orderData.customer = { id: customerDoc.id, ...customerDoc.data() };
                }
            }
            
            return orderData;
        }));
        
        res.json({ success: true, orders: ordersList });
    } catch (error) {
        console.error('Error loading orders:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xóa đơn hàng (đặt trước GET để tránh conflict)
router.delete('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('DELETE /api/manager/orders/:id called with id:', id);
        
        const orderRef = db.collection('orders').doc(id);
        const orderDoc = await orderRef.get();
        
        if (!orderDoc.exists) {
            console.log('Order not found:', id);
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const orderData = orderDoc.data();
        
        // Giải phóng bàn nếu có
        if (orderData.tableNumbers && Array.isArray(orderData.tableNumbers)) {
            for (const tableNum of orderData.tableNumbers) {
                try {
                    // Tìm bàn theo số bàn
                    const tablesSnapshot = await db.collection('tables')
                        .where('number', '==', parseInt(tableNum))
                        .get();
                    
                    if (!tablesSnapshot.empty) {
                        const tableDoc = tablesSnapshot.docs[0];
                        await tableDoc.ref.update({
                            status: 'available',
                            orderId: null,
                            reservedAt: null,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } catch (tableError) {
                    console.error(`Error freeing table ${tableNum}:`, tableError);
                    // Tiếp tục xóa đơn hàng dù có lỗi với bàn
                }
            }
        } else if (orderData.tableNumber) {
            try {
                // Tương thích với code cũ (chỉ 1 bàn)
                const tablesSnapshot = await db.collection('tables')
                    .where('number', '==', parseInt(orderData.tableNumber))
                    .get();
                
                if (!tablesSnapshot.empty) {
                    const tableDoc = tablesSnapshot.docs[0];
                    await tableDoc.ref.update({
                        status: 'available',
                        orderId: null,
                        reservedAt: null,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (tableError) {
                console.error(`Error freeing table ${orderData.tableNumber}:`, tableError);
                // Tiếp tục xóa đơn hàng dù có lỗi với bàn
            }
        }
        
        // Xóa đơn hàng
        await orderRef.delete();
        
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy thông tin một đơn hàng
router.get('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const orderDoc = await db.collection('orders').doc(id).get();
        
        if (!orderDoc.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const order = { id: orderDoc.id, ...orderDoc.data() };
        
        // Lấy thông tin khách hàng nếu có
        if (order.customerId) {
            try {
                const customerDoc = await db.collection('customers').doc(order.customerId).get();
                if (customerDoc.exists) {
                    order.customer = { id: customerDoc.id, ...customerDoc.data() };
                    console.log(`API GET /orders/:id - Loaded customer for order ${order.id}: ${order.customer.name}, phone: ${order.customer.phone}`);
                } else {
                    console.log(`API GET /orders/:id - Customer not found for order ${order.id}, customerId: ${order.customerId}`);
                }
            } catch (error) {
                console.error(`API GET /orders/:id - Error loading customer for order ${order.id}:`, error);
            }
        } else {
            console.log(`API GET /orders/:id - Order ${order.id} has no customerId`);
            
            // Nếu không có customerId nhưng có customerName, thử tìm customer
            if (order.customerName && order.customerName !== 'Khách lẻ') {
                try {
                    const customersByName = await db.collection('customers')
                        .where('name', '==', order.customerName)
                        .where('isActive', '!=', false)
                        .limit(1)
                        .get();
                    
                    if (!customersByName.empty) {
                        const customerDoc = customersByName.docs[0];
                        order.customer = { id: customerDoc.id, ...customerDoc.data() };
                        order.customerId = customerDoc.id; // Cập nhật customerId vào order
                        console.log(`API GET /orders/:id - Found customer by name for order ${order.id}: ${order.customer.name}, phone: ${order.customer.phone}`);
                    }
                } catch (error) {
                    console.error(`API GET /orders/:id - Error searching customer by name for order ${order.id}:`, error);
                }
            }
        }
        
        // Convert Timestamp to Date nếu có
        if (order.createdAt) {
            if (order.createdAt.toDate) {
                order.createdAt = order.createdAt.toDate();
            } else if (order.createdAt.seconds) {
                order.createdAt = new Date(order.createdAt.seconds * 1000);
            }
        }
        
        res.json({ success: true, order });
    } catch (error) {
        console.error('Error loading order:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xác nhận đơn hàng
router.put('/orders/:id/confirm', async (req, res) => {
    try {
        const { id } = req.params;
        const { tableNumbers, tableNumber } = req.body;
        
        const orderRef = db.collection('orders').doc(id);
        const orderDoc = await orderRef.get();
        
        if (!orderDoc.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const orderData = orderDoc.data();
        const deliveryType = orderData.deliveryType || 'at-table';
        const isTakeawayOrDelivery = deliveryType === 'takeaway' || deliveryType === 'delivery';
        
        const updateData = {
            status: 'confirmed',
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Chỉ cập nhật bàn nếu là đơn tại bàn và có tableNumbers
        if (!isTakeawayOrDelivery) {
            let finalTableNumbers = null;
            
            if (tableNumbers && Array.isArray(tableNumbers) && tableNumbers.length > 0) {
                finalTableNumbers = tableNumbers.map(t => parseInt(t)).filter(t => !isNaN(t)).sort((a, b) => a - b);
            } else if (tableNumber) {
                // Tương thích với code cũ
                finalTableNumbers = [parseInt(tableNumber)];
            }
            
            if (finalTableNumbers && finalTableNumbers.length > 0) {
                updateData.tableNumbers = finalTableNumbers;
                updateData.tableNumber = finalTableNumbers[0]; // Giữ tableNumber để tương thích
                
                // Cập nhật trạng thái các bàn thành 'reserved'
                for (const tableNum of finalTableNumbers) {
                    const tableId = `table-${tableNum}`;
                    const tableRef = db.collection('tables').doc(tableId);
                    const tableDoc = await tableRef.get();
                    
                    if (tableDoc.exists) {
                        await tableRef.update({
                            status: 'reserved',
                            orderId: id,
                            reservedAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            }
        }
        
        await orderRef.update(updateData);
        
        res.json({ success: true, message: 'Order confirmed successfully' });
    } catch (error) {
        console.error('Error confirming order:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tạo đơn hàng mới (từ manager)
router.post('/orders/create', async (req, res) => {
    try {
        const { customerId, customerName, customerPhone, items, total, discount, finalTotal, numberOfPeople, eatingTime, tableNumbers, notes, deliveryType } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Vui lòng thêm ít nhất một món vào đơn hàng' });
        }
        
        if (!customerName || !customerPhone) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập thông tin khách hàng' });
        }
        
        if (!numberOfPeople || numberOfPeople < 1) {
            return res.status(400).json({ success: false, error: 'Số lượng người phải lớn hơn 0' });
        }
        
        if (!eatingTime) {
            return res.status(400).json({ success: false, error: 'Vui lòng chọn thời gian ăn' });
        }
        
        // Tạo số order ngẫu nhiên 5 chữ số
        const orderNumber = String(Math.floor(10000 + Math.random() * 90000));
        
        // Tạo đơn hàng
        const orderData = {
            userId: null, // Manager tạo đơn không cần userId
            customerId: customerId || null,
            customerName: customerName,
            customerPhone: customerPhone,
            items: items,
            total: total || 0,
            discount: discount || 0,
            finalTotal: finalTotal || total || 0,
            status: 'confirmed', // Manager tạo đơn tự động xác nhận
            numberOfPeople: numberOfPeople,
            eatingTime: eatingTime ? admin.firestore.Timestamp.fromDate(new Date(eatingTime)) : null,
            tableNumbers: tableNumbers && tableNumbers.length > 0 ? tableNumbers : null,
            tableNumber: tableNumbers && tableNumbers.length > 0 ? tableNumbers[0] : null, // Lấy bàn đầu tiên để tương thích
            deliveryType: deliveryType || 'at-table',
            deliveryAddress: null,
            notes: notes || '',
            orderNumber: orderNumber,
            paymentStatus: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            confirmedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const orderRef = await db.collection('orders').add(orderData);
        
        // Cập nhật trạng thái bàn nếu có
        if (tableNumbers && tableNumbers.length > 0) {
            for (const tableNumber of tableNumbers) {
                // Tìm bàn theo số bàn
                const tablesSnapshot = await db.collection('tables')
                    .where('number', '==', tableNumber)
                    .get();
                
                if (!tablesSnapshot.empty) {
                    const tableDoc = tablesSnapshot.docs[0];
                    await tableDoc.ref.update({
                        status: 'reserved',
                        orderId: orderRef.id,
                        reservedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
        
        res.json({ success: true, orderId: orderRef.id, orderNumber: orderNumber });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tạo đơn hàng mới (giữ lại endpoint cũ để tương thích)
router.post('/orders', async (req, res) => {
    try {
        const { customerId, tableNumber, items, notes, totalAmount } = req.body;
        
        if (!customerId || !items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        // Tạo mã đơn hàng tự động
        const orderCount = await db.collection('orders').get();
        const orderNumber = `DH${String(orderCount.size + 1).padStart(6, '0')}`;
        
        const orderData = {
            orderNumber,
            customerId,
            tableNumber: tableNumber || null,
            items,
            notes: notes || '',
            totalAmount: totalAmount || 0,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const orderRef = await db.collection('orders').add(orderData);
        
        res.json({ success: true, orderId: orderRef.id, orderNumber });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xác nhận đơn hàng
router.put('/orders/:id/confirm', async (req, res) => {
    try {
        const { id } = req.params;
        const { tableNumber } = req.body;
        
        const orderRef = db.collection('orders').doc(id);
        const orderDoc = await orderRef.get();
        
        if (!orderDoc.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const orderData = orderDoc.data();
        
        // Cập nhật order
        await orderRef.update({
            status: 'confirmed',
            tableNumber: tableNumber || null,
            tableId: tableNumber ? `table-${tableNumber}` : null,
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Cập nhật trạng thái bàn nếu có
        if (tableNumber) {
            const tableId = `table-${tableNumber}`;
            const tableRef = db.collection('tables').doc(tableId);
            const tableDoc = await tableRef.get();
            
            if (tableDoc.exists) {
                await tableRef.update({
                    status: 'reserved',
                    orderId: id,
                    reservedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        res.json({ success: true, message: 'Order confirmed successfully' });
    } catch (error) {
        console.error('Error confirming order:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật đơn hàng
router.put('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, items, total, discount, finalTotal, tableNumbers, tableNumber, paymentStatus } = req.body;
        
        const orderRef = db.collection('orders').doc(id);
        const orderDoc = await orderRef.get();
        
        if (!orderDoc.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (items) updateData.items = items;
        if (total !== undefined) updateData.total = total;
        if (discount !== undefined) updateData.discount = discount;
        if (finalTotal !== undefined) updateData.finalTotal = finalTotal;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        
        // Xử lý tableNumbers (mảng) hoặc tableNumber (số đơn - để tương thích)
        if (tableNumbers && Array.isArray(tableNumbers) && tableNumbers.length > 0) {
            const validTableNumbers = tableNumbers.map(t => parseInt(t)).filter(t => !isNaN(t) && t > 0).sort((a, b) => a - b);
            if (validTableNumbers.length > 0) {
                updateData.tableNumbers = validTableNumbers;
                // Giữ tableNumber để tương thích (lấy bàn đầu tiên)
                updateData.tableNumber = validTableNumbers[0];
                
                // Cập nhật trạng thái các bàn thành 'reserved'
                for (const tableNum of validTableNumbers) {
                    const tableId = `table-${tableNum}`;
                    const tableRef = db.collection('tables').doc(tableId);
                    const tableDoc = await tableRef.get();
                    
                    if (tableDoc.exists) {
                        await tableRef.update({
                            status: 'reserved',
                            orderId: id,
                            reservedAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                console.log(`Updated order ${id} with tableNumbers:`, validTableNumbers);
            }
        } else if (tableNumber) {
            // Tương thích với code cũ (chỉ 1 bàn)
            const tableNum = parseInt(tableNumber);
            if (!isNaN(tableNum) && tableNum > 0) {
                updateData.tableNumber = tableNum;
                updateData.tableNumbers = [tableNum];
                
                // Cập nhật trạng thái bàn
                const tableId = `table-${tableNum}`;
                const tableRef = db.collection('tables').doc(tableId);
                const tableDoc = await tableRef.get();
                
                if (tableDoc.exists) {
                    await tableRef.update({
                        status: 'reserved',
                        orderId: id,
                        reservedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                console.log(`Updated order ${id} with tableNumber:`, tableNum);
            }
        }
        
        await orderRef.update(updateData);
        
        res.json({ success: true, message: 'Order updated successfully' });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ========== QUẢN LÝ THỰC ĐƠN ==========
// Lấy danh sách món lẻ
router.get('/menu-items', async (req, res) => {
    try {
        const menuItems = await db.collection('menuItems').get();
        
        const itemsList = menuItems.docs
            .filter(doc => doc.data().isActive !== false)
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        
        res.json({ success: true, items: itemsList });
    } catch (error) {
        console.error('Error loading menu items:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tạo món lẻ mới
router.post('/menu-items', async (req, res) => {
    try {
        const { name, unit, packaging, price } = req.body;
        
        if (!name || !unit || !packaging || price === undefined) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        // Auto-generate code
        const existingItems = await db.collection('menuItems').get();
        let itemNumber = existingItems.size + 1;
        let itemCode = `MON${String(itemNumber).padStart(4, '0')}`;
        
        // Check if code exists
        const checkCode = await db.collection('menuItems')
            .where('code', '==', itemCode)
            .get();
        
        if (!checkCode.empty) {
            while (itemNumber <= 9999) {
                itemNumber++;
                itemCode = `MON${String(itemNumber).padStart(4, '0')}`;
                const check = await db.collection('menuItems')
                    .where('code', '==', itemCode)
                    .get();
                if (check.empty) {
                    break;
                }
            }
        }
        
        const menuItemData = {
            code: itemCode,
            name,
            unit,
            packaging,
            price: parseFloat(price),
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const menuItemRef = await db.collection('menuItems').add(menuItemData);
        res.json({ success: true, menuItemId: menuItemRef.id, code: itemCode });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật món lẻ
router.put('/menu-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, unit, packaging, price } = req.body;
        
        if (!name || !unit || !packaging || price === undefined) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        await db.collection('menuItems').doc(id).update({
            name,
            unit,
            packaging,
            price: parseFloat(price),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, message: 'Menu item updated successfully' });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xóa món lẻ (soft delete)
router.delete('/menu-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.collection('menuItems').doc(id).update({
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy danh sách combo
router.get('/combos', async (req, res) => {
    try {
        const combos = await db.collection('combos').get();
        
        const combosList = combos.docs
            .filter(doc => doc.data().isActive !== false)
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        
        res.json({ success: true, combos: combosList });
    } catch (error) {
        console.error('Error loading combos:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tạo combo mới
router.post('/combos', async (req, res) => {
    try {
        const { name, items, price, method } = req.body;
        
        if (!name || !items || items.length === 0 || price === undefined) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        const comboData = {
            name,
            items: items, // Array of {menuItemId, menuItemName, quantity} or {name, quantity} for manual
            price: parseFloat(price),
            method: method || 'select', // 'select' or 'manual'
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const comboRef = await db.collection('combos').add(comboData);
        res.json({ success: true, comboId: comboRef.id });
    } catch (error) {
        console.error('Error adding combo:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật combo
router.put('/combos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, items, price } = req.body;
        
        if (!name || !items || items.length === 0 || price === undefined) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        await db.collection('combos').doc(id).update({
            name,
            items,
            price: parseFloat(price),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, message: 'Combo updated successfully' });
    } catch (error) {
        console.error('Error updating combo:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Xóa combo (soft delete)
router.delete('/combos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.collection('combos').doc(id).update({
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, message: 'Combo deleted successfully' });
    } catch (error) {
        console.error('Error deleting combo:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy danh sách món ăn và combo (for backward compatibility)
router.get('/menu', async (req, res) => {
    try {
        const menuItems = await db.collection('menuItems').get();
        const combos = await db.collection('combos').get();
        
        const menuList = menuItems.docs
            .filter(doc => doc.data().isActive !== false)
            .map(doc => ({
                id: doc.id,
                type: 'food',
                ...doc.data()
            }));
        
        const combosList = combos.docs
            .filter(doc => doc.data().isActive !== false)
            .map(doc => ({
                id: doc.id,
                type: 'combo',
                ...doc.data()
            }));
        
        res.json({ success: true, menu: [...menuList, ...combosList] });
    } catch (error) {
        console.error('Error loading menu:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ========== QUẢN LÝ BÀN ĂN ==========
// Khởi tạo 50 bàn ăn (nếu chưa có)
router.post('/tables/initialize', async (req, res) => {
    try {
        const existingTables = await db.collection('tables').get();
        
        if (existingTables.size > 0) {
            return res.json({ success: true, message: 'Tables already initialized', count: existingTables.size });
        }
        
        const batch = db.batch();
        for (let i = 1; i <= 50; i++) {
            const tableRef = db.collection('tables').doc();
            batch.set(tableRef, {
                number: i,
                status: 'available', // available, occupied, reserved
                capacity: 4, // Default capacity
                reservedTime: null, // For reserved tables
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        await batch.commit();
        res.json({ success: true, message: '50 tables initialized successfully' });
    } catch (error) {
        console.error('Error initializing tables:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy danh sách bàn ăn
router.get('/tables', async (req, res) => {
    try {
        const { search, status } = req.query;
        
        const tables = await db.collection('tables').get();
        
        let tablesList = tables.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                number: data.number,
                status: data.status || 'available',
                capacity: data.capacity || 4,
                reservedTime: data.reservedTime,
                orderId: data.orderId || null,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            };
        });
        
        // Sort by number
        tablesList.sort((a, b) => a.number - b.number);
        
        // Filter by search (number)
        if (search) {
            const searchNum = parseInt(search);
            if (!isNaN(searchNum)) {
                tablesList = tablesList.filter(table => table.number === searchNum);
            } else {
                tablesList = tablesList.filter(table => 
                    table.number.toString().includes(search)
                );
            }
        }
        
        // Filter by status
        if (status && status !== 'all') {
            tablesList = tablesList.filter(table => table.status === status);
        }
        
        // Get order info for reserved tables
        for (const table of tablesList) {
            if (table.status === 'reserved' && table.orderId) {
                try {
                    const orderDoc = await db.collection('orders').doc(table.orderId).get();
                    if (orderDoc.exists) {
                        const orderData = orderDoc.data();
                        table.reservedTime = orderData.createdAt || table.reservedTime;
                        table.customerName = orderData.customerName || 'Khách hàng';
                    }
                } catch (error) {
                    console.error(`Error loading order for table ${table.number}:`, error);
                }
            }
        }
        
        res.json({ success: true, tables: tablesList });
    } catch (error) {
        console.error('Error loading tables:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Cập nhật trạng thái bàn
router.put('/tables/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, orderId } = req.body;
        
        if (!status || !['available', 'occupied', 'reserved'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        
        const updateData = {
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (status === 'reserved' && orderId) {
            updateData.orderId = orderId;
            // Get order creation time
            const orderDoc = await db.collection('orders').doc(orderId).get();
            if (orderDoc.exists) {
                updateData.reservedTime = orderDoc.data().createdAt || admin.firestore.FieldValue.serverTimestamp();
            }
        } else if (status === 'available') {
            updateData.orderId = null;
            updateData.reservedTime = null;
        }
        
        await db.collection('tables').doc(id).update(updateData);
        
        res.json({ success: true, message: 'Table status updated successfully' });
    } catch (error) {
        console.error('Error updating table status:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ========== TÌM KIẾM ==========
router.get('/search', async (req, res) => {
    try {
        const { query, type } = req.query;
        
        if (!query) {
            return res.status(400).json({ success: false, error: 'Search query required' });
        }
        
        const results = {
            orders: [],
            customers: [],
            menu: []
        };
        
        // Tìm kiếm đơn hàng
        if (!type || type === 'orders') {
            const orders = await db.collection('orders').get();
            results.orders = orders.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(order => 
                    order.orderNumber?.toLowerCase().includes(query.toLowerCase()) ||
                    order.customerName?.toLowerCase().includes(query.toLowerCase())
                );
        }
        
        // Tìm kiếm khách hàng
        if (!type || type === 'customers') {
            const customers = await db.collection('customers').get();
            const queryLower = query.toLowerCase();
            
            results.customers = customers.docs
                .map(doc => {
                    const data = doc.data();
                    return { id: doc.id, ...data };
                })
                .filter(customer => {
                    // Bước 1: Kiểm tra isActive - chỉ lấy khách hàng đang hoạt động
                    // Nếu isActive === false thì loại bỏ ngay
                    if (customer.isActive === false) {
                        return false;
                    }
                    
                    // Bước 2: Tìm kiếm theo các trường (chỉ khi đã pass bước 1)
                    const matches = (
                        customer.code?.toLowerCase().includes(queryLower) ||
                        customer.name?.toLowerCase().includes(queryLower) ||
                        customer.idCard?.includes(query) ||
                        customer.phone?.includes(query) ||
                        customer.company?.toLowerCase().includes(queryLower)
                    );
                    
                    return matches;
                });
        }
        
        // Tìm kiếm món ăn
        if (!type || type === 'menu') {
            const menu = await db.collection('menu').get();
            const combos = await db.collection('combos').get();
            
            results.menu = [
                ...menu.docs.map(doc => ({ id: doc.id, type: 'food', ...doc.data() })),
                ...combos.docs.map(doc => ({ id: doc.id, type: 'combo', ...doc.data() }))
            ].filter(item =>
                item.name?.toLowerCase().includes(query.toLowerCase()) ||
                item.description?.toLowerCase().includes(query.toLowerCase())
            );
        }
        
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error searching:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ========== THỐNG KÊ & BÁO CÁO ==========
// Lấy danh sách hóa đơn đã thanh toán (phải đặt trước route /reports)
router.get('/reports/invoices', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Lấy tất cả đơn hàng đã thanh toán và hoàn thành
        let ordersQuery = db.collection('orders')
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'paid');
        
        const ordersSnapshot = await ordersQuery.get();
        let ordersList = [];
        
        for (const doc of ordersSnapshot.docs) {
            const orderData = { id: doc.id, ...doc.data() };
            
            // Debug: Log thông tin order ban đầu
            console.log(`\n=== Processing Order ${orderData.id} ===`);
            console.log(`Order customerId: ${orderData.customerId || 'null'}`);
            console.log(`Order customerPhone (from order): ${orderData.customerPhone || 'null/undefined'}`);
            console.log(`Order customerName: ${orderData.customerName || 'null'}`);
            
            // Luôn lấy thông tin khách hàng từ collection customers (Quản lý khách hàng)
            if (orderData.customerId) {
                try {
                    const customerDoc = await db.collection('customers').doc(orderData.customerId).get();
                    if (customerDoc.exists) {
                        const customerData = customerDoc.data();
                        orderData.customer = { id: customerDoc.id, ...customerData };
                        
                        console.log(`Found customer in customers collection: ${customerData.name || 'N/A'}`);
                        console.log(`Customer phone in collection: ${customerData.phone || 'null/undefined'}`);
                        
                        // Ưu tiên lấy customerPhone từ customers collection
                        if (customerData.phone && customerData.phone !== null && customerData.phone !== '') {
                            orderData.customerPhone = customerData.phone;
                            console.log(`✓ Set customerPhone from customers collection: ${orderData.customerPhone}`);
                        } else {
                            console.log(`✗ Customer không có phone number trong customers collection`);
                        }
                    } else {
                        console.log(`✗ Không tìm thấy customer với ID ${orderData.customerId} trong customers collection`);
                    }
                } catch (error) {
                    console.error(`✗ Error loading customer from customers collection:`, error);
                }
            } else {
                console.log(`✗ Order không có customerId`);
            }
            
            // Nếu không có customerId hoặc không tìm thấy phone, thử tìm customer theo tên
            if ((!orderData.customerPhone || orderData.customerPhone === null || orderData.customerPhone === '') && orderData.customerName && orderData.customerName !== 'Khách lẻ') {
                try {
                    console.log(`Trying to find customer by name: ${orderData.customerName}`);
                    const customersByName = await db.collection('customers')
                        .where('name', '==', orderData.customerName)
                        .where('isActive', '!=', false)
                        .limit(1)
                        .get();
                    
                    if (!customersByName.empty) {
                        const customerDoc = customersByName.docs[0];
                        const customerData = customerDoc.data();
                        orderData.customer = { id: customerDoc.id, ...customerData };
                        
                        if (customerData.phone && customerData.phone !== null && customerData.phone !== '') {
                            orderData.customerPhone = customerData.phone;
                            console.log(`✓ Order ${orderData.id}: Lấy customerPhone từ customers collection (by name): ${orderData.customerPhone}`);
                        } else {
                            console.log(`✗ Order ${orderData.id}: Customer tìm thấy theo tên nhưng không có phone`);
                        }
                    } else {
                        console.log(`✗ Order ${orderData.id}: Không tìm thấy customer với tên "${orderData.customerName}" trong customers collection`);
                    }
                } catch (error) {
                    console.error(`✗ Order ${orderData.id}: Error searching customer by name:`, error);
                }
            }
            
            // Fallback: Nếu vẫn không có, thử lấy từ order.customerPhone
            if (!orderData.customerPhone || orderData.customerPhone === null || orderData.customerPhone === '') {
                const originalOrderData = doc.data();
                if (originalOrderData.customerPhone && originalOrderData.customerPhone !== null && originalOrderData.customerPhone !== '') {
                    orderData.customerPhone = originalOrderData.customerPhone;
                    console.log(`✓ Order ${orderData.id}: Fallback - Lấy customerPhone từ order: ${orderData.customerPhone}`);
                } else {
                    console.log(`✗ Order ${orderData.id}: Không có customerPhone từ customers collection và order`);
                }
            }
            
            console.log(`Final customerPhone for order ${orderData.id}: ${orderData.customerPhone || 'N/A'}\n`);
            
            // Convert Timestamp to Date
            if (orderData.createdAt) {
                if (orderData.createdAt.toDate) {
                    orderData.createdAt = orderData.createdAt.toDate();
                } else if (orderData.createdAt.seconds) {
                    orderData.createdAt = new Date(orderData.createdAt.seconds * 1000);
                }
            }
            
            // Lọc theo ngày
            if (startDate || endDate) {
                const orderDate = orderData.createdAt;
                if (startDate && orderDate < new Date(startDate)) continue;
                if (endDate) {
                    const endDateObj = new Date(endDate);
                    endDateObj.setHours(23, 59, 59, 999);
                    if (orderDate > endDateObj) continue;
                }
            }
            
            ordersList.push(orderData);
        }
        
        // Sắp xếp theo ngày (mới nhất trước)
        ordersList.sort((a, b) => {
            const dateA = a.createdAt || new Date(0);
            const dateB = b.createdAt || new Date(0);
            return dateB - dateA;
        });
        
        // Format dữ liệu cho frontend
        const invoices = ordersList.map(order => {
            // Ưu tiên lấy customerPhone từ customers collection (đã được load ở trên)
            let customerPhone = null;
            
            // 1. Ưu tiên: Lấy từ customers collection (Quản lý khách hàng)
            if (order.customer && order.customer.phone) {
                customerPhone = order.customer.phone;
            }
            // 2. Fallback: Lấy từ order.customerPhone (nếu không có trong customers collection)
            else if (order.customerPhone && order.customerPhone !== null && order.customerPhone !== '') {
                customerPhone = order.customerPhone;
            }
            
            // Nếu vẫn không có, để 'N/A'
            if (!customerPhone || customerPhone === null || customerPhone === '') {
                customerPhone = 'N/A';
            }
            
            console.log(`Format invoice for order ${order.id}: customerPhone = ${customerPhone} (from ${order.customer && order.customer.phone ? 'customers collection' : 'order'})`);
            
            return {
                orderId: order.id,
                date: order.createdAt,
                orderNumber: order.orderNumber || 'N/A',
                customerName: order.customerName || (order.customer && order.customer.name) || 'Khách lẻ',
                customerPhone: customerPhone,
                customerId: order.customerId || (order.customer && order.customer.id) || null,
                amount: order.finalTotal || order.total || 0
            };
        });
        
        // Tính tổng hợp
        const summary = {
            totalInvoices: invoices.length,
            totalRevenue: invoices.reduce((sum, inv) => sum + inv.amount, 0)
        };
        
        res.json({ success: true, invoices, summary });
    } catch (error) {
        console.error('Error loading invoices:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Báo cáo doanh thu (cải thiện) - phải đặt trước route /reports
router.get('/reports/revenue', async (req, res) => {
    try {
        const { type, startDate, endDate, tableNumber, dishType } = req.query;
        
        // Lấy tất cả đơn hàng đã thanh toán
        let ordersQuery = db.collection('orders')
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'paid');
        
        const ordersSnapshot = await ordersQuery.get();
        let ordersList = [];
        
        for (const doc of ordersSnapshot.docs) {
            const orderData = { id: doc.id, ...doc.data() };
            
            // Convert Timestamp to Date
            if (orderData.createdAt) {
                if (orderData.createdAt.toDate) {
                    orderData.createdAt = orderData.createdAt.toDate();
                } else if (orderData.createdAt.seconds) {
                    orderData.createdAt = new Date(orderData.createdAt.seconds * 1000);
                }
            }
            
            // Lọc theo ngày
            if (startDate || endDate) {
                const orderDate = orderData.createdAt;
                if (startDate && orderDate < new Date(startDate)) continue;
                if (endDate) {
                    const endDateObj = new Date(endDate);
                    endDateObj.setHours(23, 59, 59, 999);
                    if (orderDate > endDateObj) continue;
                }
            }
            
            // Lọc theo bàn (nếu có)
            if (tableNumber) {
                const orderTables = orderData.tableNumbers || (orderData.tableNumber ? [orderData.tableNumber] : []);
                if (!orderTables.includes(parseInt(tableNumber))) continue;
            }
            
            ordersList.push(orderData);
        }
        
        let report = {};
        const revenue = ordersList.reduce((sum, order) => sum + (order.finalTotal || order.total || 0), 0);
        
        if (type === 'time') {
            // Báo cáo theo thời gian
            report = {
                totalOrders: ordersList.length,
                totalRevenue: revenue,
                byDate: {}
            };
            
            ordersList.forEach(order => {
                const date = order.createdAt ? order.createdAt.toISOString().split('T')[0] : 'Unknown';
                if (!report.byDate[date]) {
                    report.byDate[date] = { orders: 0, revenue: 0 };
                }
                report.byDate[date].orders++;
                report.byDate[date].revenue += (order.finalTotal || order.total || 0);
            });
        } else if (type === 'table') {
            // Báo cáo theo bàn
            report = {
                totalOrders: ordersList.length,
                totalRevenue: revenue,
                byTable: {}
            };
            
            ordersList.forEach(order => {
                let tableKey = 'Không có bàn';
                if (order.tableNumbers && Array.isArray(order.tableNumbers) && order.tableNumbers.length > 0) {
                    tableKey = order.tableNumbers.join(', ');
                } else if (order.tableNumber) {
                    tableKey = order.tableNumber.toString();
                }
                
                if (!report.byTable[tableKey]) {
                    report.byTable[tableKey] = { orders: 0, revenue: 0 };
                }
                report.byTable[tableKey].orders++;
                report.byTable[tableKey].revenue += (order.finalTotal || order.total || 0);
            });
        } else if (type === 'dish') {
            // Báo cáo theo món/combo
            report = {
                totalOrders: ordersList.length,
                totalRevenue: revenue,
                byDish: {}
            };
            
            ordersList.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        // Lọc theo loại (combo hoặc món ăn) nếu có
                        if (dishType && dishType !== 'all') {
                            if (dishType === 'combo' && item.type !== 'combo') return;
                            if (dishType === 'menu' && item.type === 'combo') return;
                        }
                        
                        const dishName = item.name || item.menuItemName || 'Unknown';
                        if (!report.byDish[dishName]) {
                            report.byDish[dishName] = { quantity: 0, revenue: 0 };
                        }
                        report.byDish[dishName].quantity += (item.quantity || 0);
                        report.byDish[dishName].revenue += (item.price || 0) * (item.quantity || 0);
                    });
                }
            });
        }
        
        res.json({ success: true, report });
    } catch (error) {
        console.error('Error generating revenue report:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Route tổng quát (phải đặt sau các route cụ thể)
router.get('/reports', async (req, res) => {
    try {
        const { type, startDate, endDate, tableId, dishId } = req.query;
        
        let orders = await db.collection('orders').get();
        let ordersList = orders.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Lọc theo ngày
        if (startDate || endDate) {
            ordersList = ordersList.filter(order => {
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(0);
                if (startDate && orderDate < new Date(startDate)) return false;
                if (endDate && orderDate > new Date(endDate)) return false;
                return true;
            });
        }
        
        // Lọc theo bàn
        if (tableId) {
            ordersList = ordersList.filter(order => order.tableNumber === tableId);
        }
        
        let report = {};
        
        if (type === 'time') {
            // Báo cáo theo thời gian
            report = {
                totalOrders: ordersList.length,
                totalRevenue: ordersList.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
                byDate: {}
            };
            
            ordersList.forEach(order => {
                const date = order.createdAt?.toDate ? order.createdAt.toDate().toISOString().split('T')[0] : 'Unknown';
                if (!report.byDate[date]) {
                    report.byDate[date] = { orders: 0, revenue: 0 };
                }
                report.byDate[date].orders++;
                report.byDate[date].revenue += order.totalAmount || 0;
            });
        } else if (type === 'table') {
            // Báo cáo theo bàn
            report = {
                totalOrders: ordersList.length,
                totalRevenue: ordersList.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
                byTable: {}
            };
            
            ordersList.forEach(order => {
                const table = order.tableNumber || 'Không có bàn';
                if (!report.byTable[table]) {
                    report.byTable[table] = { orders: 0, revenue: 0 };
                }
                report.byTable[table].orders++;
                report.byTable[table].revenue += order.totalAmount || 0;
            });
        } else if (type === 'dish') {
            // Báo cáo theo món
            report = {
                totalOrders: ordersList.length,
                totalRevenue: ordersList.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
                byDish: {}
            };
            
            ordersList.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const dishName = item.name || 'Unknown';
                        if (!report.byDish[dishName]) {
                            report.byDish[dishName] = { quantity: 0, revenue: 0 };
                        }
                        report.byDish[dishName].quantity += item.quantity || 0;
                        report.byDish[dishName].revenue += (item.price || 0) * (item.quantity || 0);
                    });
                }
            });
        }
        
        res.json({ success: true, report });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ========== CẢNH BÁO TỒN KHO ==========
router.get('/inventory-alerts', async (req, res) => {
    try {
        const alerts = [];
        
        // Lấy tất cả materials
        const materials = await db.collection('materials').get();
        const materialsMap = {};
        materials.docs.forEach(doc => {
            materialsMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        
        // Lấy import và export receipts để tính tồn kho (lấy tất cả, không filter isActive để tính chính xác)
        const imports = await db.collection('importReceipts').get();
        const exports = await db.collection('exportReceipts').get();
        
        const materialStock = {};
        
        // Tính tồn kho từ import (chỉ lấy receipts đang active)
        imports.docs.forEach(doc => {
            const receipt = doc.data();
            if (receipt.isActive !== false && receipt.items && Array.isArray(receipt.items)) {
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
        
        // Trừ đi export (chỉ lấy receipts đang active)
        exports.docs.forEach(doc => {
            const receipt = doc.data();
            if (receipt.isActive !== false && receipt.items && Array.isArray(receipt.items)) {
                receipt.items.forEach(item => {
                    const materialId = item.materialId || item.material?.id;
                    if (materialId) {
                        if (!materialStock[materialId]) {
                            materialStock[materialId] = 0;
                        }
                        materialStock[materialId] -= item.quantity || 0;
                    }
                });
            }
        });
        
        // Kiểm tra cảnh báo theo yêu cầu:
        // - Cảnh báo đỏ: số lượng = 0
        // - Cảnh báo vàng: số lượng từ 1-5 (chỉ cảnh báo trong khoảng này)
        // - Không cảnh báo khi số lượng > 5
        
        Object.keys(materialStock).forEach(materialId => {
            const quantity = parseFloat(materialStock[materialId]) || 0;
            const material = materialsMap[materialId];
            
            if (material && material.isActive !== false) {
                // Chỉ cảnh báo khi số lượng từ 0 đến 5
                if (quantity === 0) {
                    // Cảnh báo đỏ: Đã hết
                    alerts.push({
                        materialId,
                        materialName: material.name || 'Unknown',
                        materialCode: material.code || 'N/A',
                        unit: material.unit || '',
                        currentStock: quantity,
                        status: 'out',
                        statusText: 'Đã hết'
                    });
                } else if (quantity > 0 && quantity <= 5) {
                    // Cảnh báo vàng: Sắp hết (chỉ khi số lượng từ 1-5)
                    alerts.push({
                        materialId,
                        materialName: material.name || 'Unknown',
                        materialCode: material.code || 'N/A',
                        unit: material.unit || '',
                        currentStock: quantity,
                        status: 'low',
                        statusText: 'Sắp hết'
                    });
                }
                // Nếu quantity > 5, không thêm vào alerts (không cảnh báo)
            }
        });
        
        // Xử lý các materials chưa có trong materialStock (chưa có import/export)
        materials.docs.forEach(doc => {
            const material = doc.data();
            if (material.isActive !== false && !materialStock[doc.id]) {
                // Nếu chưa có import/export, coi như quantity = 0
                alerts.push({
                    materialId: doc.id,
                    materialName: material.name || 'Unknown',
                    materialCode: material.code || 'N/A',
                    unit: material.unit || '',
                    currentStock: 0,
                    status: 'out',
                    statusText: 'Đã hết'
                });
            }
        });
        
        res.json({ success: true, alerts });
    } catch (error) {
        console.error('Error loading inventory alerts:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ========== QUẢN LÝ VOUCHER VÀ TÍCH ĐIỂM ==========
// Đổi voucher (50 điểm → voucher 500k)
router.post('/vouchers/redeem', async (req, res) => {
    try {
        const { customerId } = req.body;
        
        if (!customerId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        const customerRef = db.collection('customers').doc(customerId);
        const customerDoc = await customerRef.get();
        
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const customerData = customerDoc.data();
        const currentPoints = customerData.points || 0;
        
        // Kiểm tra điều kiện: 50 điểm để đổi voucher 500k
        const requiredPoints = 50;
        if (currentPoints < requiredPoints) {
            return res.status(400).json({ success: false, error: `Không đủ điểm. Cần ${requiredPoints} điểm để đổi voucher.` });
        }
        
        // Kiểm tra điều kiện để có voucher: 10 hóa đơn và tổng doanh số 5 triệu
        const ordersSnapshot = await db.collection('orders')
            .where('customerId', '==', customerId)
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'paid')
            .get();
        
        const orders = ordersSnapshot.docs.map(doc => doc.data());
        const orderCount = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.finalTotal || order.total || 0), 0);
        
        if (orderCount < 10 || totalRevenue < 5000000) {
            const minOrders = 10;
            const minRevenue = 5000000;
            const formattedRevenue = minRevenue.toLocaleString('vi-VN');
            return res.status(400).json({ 
                success: false, 
                error: `Chua du dieu kien de doi voucher. Can it nhat ${minOrders} hoa don va tong doanh so ${formattedRevenue} VND.` 
            });
        }
        
        // Tạo voucher trị giá 500k
        const voucherData = {
            customerId: customerId,
            value: 500000, // Voucher trị giá 500k
            pointsUsed: requiredPoints,
            status: 'active', // active, used, expired
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: null // Có thể thêm thời hạn nếu cần
        };
        
        const voucherRef = await db.collection('vouchers').add(voucherData);
        
        // Tính lại điểm từ tổng hóa đơn và trừ điểm đã dùng để đổi voucher
        // totalRevenue đã được tính ở trên, không cần tính lại
        const totalPoints = Math.floor(totalRevenue / 200000);
        
        // Đếm số voucher đã có (bao gồm voucher vừa tạo)
        const allVouchersSnapshot = await db.collection('vouchers')
            .where('customerId', '==', customerId)
            .get();
        
        const vouchersCount = allVouchersSnapshot.size;
        const pointsUsedForVouchers = vouchersCount * 50;
        const remainingPoints = Math.max(0, totalPoints - pointsUsedForVouchers);
        
        // Cập nhật điểm còn lại
        await customerRef.update({
            points: remainingPoints,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ 
            success: true, 
            voucherId: voucherRef.id,
            points: remainingPoints,
            voucherValue: 500000,
            message: 'Đổi voucher thành công! Voucher trị giá 500.000 VNĐ.' 
        });
    } catch (error) {
        console.error('Error redeeming voucher:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy tất cả voucher (để đếm tổng số voucher đã đổi)
// PHẢI đặt trước route /vouchers/customer/:customerId để tránh conflict
router.get('/vouchers/all', async (req, res) => {
    try {
        const vouchersSnapshot = await db.collection('vouchers').get();
        
        const vouchers = vouchersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, vouchers });
    } catch (error) {
        console.error('Error loading all vouchers:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Lấy danh sách voucher của khách hàng
router.get('/vouchers/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const vouchersSnapshot = await db.collection('vouchers')
            .where('customerId', '==', customerId)
            .where('status', '==', 'active')
            .get();
        
        const vouchers = vouchersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, vouchers });
    } catch (error) {
        console.error('Error loading customer vouchers:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Sử dụng voucher
router.post('/vouchers/use', async (req, res) => {
    try {
        const { voucherId, orderId } = req.body;
        
        if (!voucherId || !orderId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        const voucherRef = db.collection('vouchers').doc(voucherId);
        const voucherDoc = await voucherRef.get();
        
        if (!voucherDoc.exists) {
            return res.status(404).json({ success: false, error: 'Voucher not found' });
        }
        
        const voucherData = voucherDoc.data();
        
        if (voucherData.status !== 'active') {
            return res.status(400).json({ success: false, error: 'Voucher is not active' });
        }
        
        // Đánh dấu voucher đã sử dụng
        await voucherRef.update({
            status: 'used',
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            orderId: orderId
        });
        
        res.json({ 
            success: true, 
            value: voucherData.value || 0, // Voucher trị giá 500k
            message: 'Voucher used successfully' 
        });
    } catch (error) {
        console.error('Error using voucher:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Kiểm tra điều kiện để có voucher (5 hóa đơn và 50 điểm)
router.get('/vouchers/check-eligibility/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        
        // Lấy tất cả đơn hàng đã thanh toán của khách hàng
        const ordersSnapshot = await db.collection('orders')
            .where('customerId', '==', customerId)
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'paid')
            .get();
        
        const orders = ordersSnapshot.docs.map(doc => doc.data());
        const orderCount = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.finalTotal || order.total || 0), 0);
        
        // Tính điểm tích lũy
        const totalPoints = Math.floor(totalRevenue / 200000);
        
        // Đếm số voucher đã đổi
        const vouchersSnapshot = await db.collection('vouchers')
            .where('customerId', '==', customerId)
            .get();
        
        const vouchersCount = vouchersSnapshot.size;
        const pointsUsedForVouchers = vouchersCount * 50;
        const remainingPoints = totalPoints - pointsUsedForVouchers;
        
        // Điều kiện: 10 hóa đơn, 5 triệu VNĐ và 50 điểm
        const isEligible = orderCount >= 10 && totalRevenue >= 5000000 && remainingPoints >= 50;
        
        res.json({
            success: true,
            eligible: isEligible,
            orderCount: orderCount,
            totalRevenue: totalRevenue,
            totalPoints: totalPoints,
            remainingPoints: remainingPoints,
            requiredOrders: 10,
            requiredRevenue: 5000000,
            requiredPoints: 50
        });
    } catch (error) {
        console.error('Error checking voucher eligibility:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Tích điểm khi thanh toán (sẽ được gọi từ processPayment)
// Tính lại điểm dựa trên TỔNG tất cả hóa đơn đã thanh toán / 200,000
router.post('/points/add', async (req, res) => {
    try {
        const { customerId, amount } = req.body;
        
        console.log('POST /api/manager/points/add called with customerId:', customerId, 'amount:', amount);
        
        if (!customerId) {
            console.log('Missing required field - customerId:', customerId);
            return res.status(400).json({ success: false, error: 'Missing required field: customerId' });
        }
        
        const customerRef = db.collection('customers').doc(customerId);
        const customerDoc = await customerRef.get();
        
        if (!customerDoc.exists) {
            console.log('Customer not found:', customerId);
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        // Lấy TẤT CẢ hóa đơn đã thanh toán của khách hàng
        const ordersSnapshot = await db.collection('orders')
            .where('customerId', '==', customerId)
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'paid')
            .get();
        
        // Tính tổng tất cả hóa đơn đã thanh toán
        let totalRevenue = 0;
        ordersSnapshot.docs.forEach(doc => {
            const orderData = doc.data();
            totalRevenue += (orderData.finalTotal || orderData.total || 0);
        });
        
        console.log('Total revenue from all paid orders:', totalRevenue);
        
        // Tính điểm tích lũy: Tổng tất cả hóa đơn / 200,000
        const totalPoints = Math.floor(totalRevenue / 200000);
        console.log('Total points calculated from total revenue:', totalPoints);
        
        // Đếm số voucher đã đổi (từ collection vouchers)
        const vouchersSnapshot = await db.collection('vouchers')
            .where('customerId', '==', customerId)
            .get();
        
        const vouchersCount = vouchersSnapshot.size;
        const pointsUsedForVouchers = vouchersCount * 50;
        
        // Điểm còn lại sau khi đã đổi voucher
        let remainingPoints = totalPoints - pointsUsedForVouchers;
        
        // Tự động đổi voucher nếu đạt điều kiện: 10 hóa đơn, 5 triệu VNĐ và 50 điểm
        let vouchersCreated = 0;
        const ordersCount = ordersSnapshot.size;
        while (remainingPoints >= 50 && ordersCount >= 10 && totalRevenue >= 5000000) {
            // Tạo voucher trị giá 500k
            const voucherData = {
                customerId: customerId,
                value: 500000,
                pointsUsed: 50,
                status: 'active',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: null
            };
            
            await db.collection('vouchers').add(voucherData);
            vouchersCreated++;
            remainingPoints -= 50;
            console.log(`Auto-created voucher ${vouchersCreated} for customer ${customerId}, remaining points: ${remainingPoints}`);
        }
        
        // Cập nhật điểm tích lũy = điểm còn lại sau khi đã đổi voucher
        await customerRef.update({
            points: remainingPoints,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Lưu lịch sử tích điểm (nếu có amount được truyền vào)
        if (amount) {
            const pointsFromThisOrder = Math.floor(amount / 200000);
            await db.collection('pointsHistory').add({
                customerId: customerId,
                points: pointsFromThisOrder,
                amount: amount,
                totalRevenue: totalRevenue,
                totalPoints: totalPoints,
                remainingPoints: remainingPoints,
                vouchersCreated: vouchersCreated,
                type: 'earned',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        console.log('Points updated successfully. Total points:', totalPoints, 'Remaining points:', remainingPoints, 'Vouchers created:', vouchersCreated);
        
        res.json({ 
            success: true, 
            points: remainingPoints,
            totalPoints: totalPoints,
            totalRevenue: totalRevenue,
            pointsAdded: amount ? Math.floor(amount / 200000) : 0,
            vouchersCreated: vouchersCreated,
            message: vouchersCreated > 0 ? `Đã tự động tạo ${vouchersCreated} voucher. Điểm còn lại: ${remainingPoints}` : 'Points updated successfully' 
        });
    } catch (error) {
        console.error('Error adding points:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ==================== QUẢN LÝ THANH TOÁN ====================
// Phát sinh nợ cho khách hàng
router.post('/customers/debt/add', async (req, res) => {
    try {
        const { customerId, amount, note } = req.body;
        
        if (!customerId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Customer ID and amount are required' });
        }
        
        const customerDoc = await db.collection('customers').doc(customerId).get();
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        // Tạo một order với paymentStatus = 'unpaid' để tính vào công nợ
        // Công nợ = openingBalance + tổng các order chưa thanh toán - tổng các order đã thanh toán
        const debtOrderData = {
            customerId,
            customerName: customerDoc.data().name || '',
            customerPhone: customerDoc.data().phone || '',
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
        
        const debtOrderRef = await db.collection('orders').add(debtOrderData);
        
        res.json({
            success: true,
            message: 'Phát sinh nợ thành công',
            orderId: debtOrderRef.id
        });
    } catch (error) {
        console.error('Error adding debt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Thanh toán dư nợ cho khách hàng
router.post('/customers/debt/pay', async (req, res) => {
    try {
        const { customerId, amount, note } = req.body;
        
        if (!customerId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Customer ID and amount are required' });
        }
        
        const customerDoc = await db.collection('customers').doc(customerId).get();
        if (!customerDoc.exists) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const customer = customerDoc.data();
        
        // Tính công nợ hiện tại theo cùng logic như trong Quản lý Khách hàng
        const ordersSnapshot = await db.collection('orders')
            .where('customerId', '==', customerId)
            .get();
        
        const openingBalance = customer.openingBalance || 0;
        let totalDebt = 0;
        let totalPaid = 0;
        
        ordersSnapshot.docs.forEach(doc => {
            const order = doc.data();
            // Tính công nợ theo cùng logic như trong Quản lý Khách hàng
            // Công nợ = openingBalance + tổng các order chưa thanh toán - tổng các order đã thanh toán
            if (order.paymentStatus !== 'paid') {
                totalDebt += Math.abs(order.totalAmount || 0);
            } else {
                totalPaid += Math.abs(order.totalAmount || 0);
            }
        });
        
        const currentDebt = openingBalance + totalDebt - totalPaid;
        
        if (amount > currentDebt) {
            return res.status(400).json({ 
                success: false, 
                error: `Số tiền thanh toán (${amount.toLocaleString('vi-VN')} VNĐ) vượt quá dư nợ hiện tại (${currentDebt.toLocaleString('vi-VN')} VNĐ)` 
            });
        }
        
        // Tìm các order chưa thanh toán và thanh toán từng phần
        // Ưu tiên thanh toán các order cũ nhất trước
        let remainingAmount = amount;
        const ordersToPay = [];
        
        // Sắp xếp các order chưa thanh toán theo ngày tạo (cũ nhất trước)
        const unpaidOrders = ordersSnapshot.docs
            .filter(doc => {
                const order = doc.data();
                return order.paymentStatus !== 'paid';
            })
            .map(doc => {
                const orderData = doc.data();
                let createdAtDate;
                if (orderData.createdAt?.toDate) {
                    createdAtDate = orderData.createdAt.toDate();
                } else if (orderData.createdAt) {
                    createdAtDate = new Date(orderData.createdAt);
                } else {
                    createdAtDate = new Date();
                }
                return {
                    id: doc.id,
                    ...orderData,
                    createdAt: createdAtDate
                };
            })
            .sort((a, b) => a.createdAt - b.createdAt);
        
        for (const order of unpaidOrders) {
            if (remainingAmount <= 0) break;
            
            const orderAmount = Math.abs(order.totalAmount || 0);
            const payAmount = Math.min(remainingAmount, orderAmount);
            
            // Cập nhật order: nếu thanh toán đủ thì đánh dấu paid, nếu chưa đủ thì giữ nguyên
            if (payAmount >= orderAmount) {
                await db.collection('orders').doc(order.id).update({
                    paymentStatus: 'paid',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                ordersToPay.push({ orderId: order.id, amount: orderAmount });
            } else {
                // Nếu thanh toán một phần, tạo order mới với số tiền đã thanh toán
                // và cập nhật order cũ với số tiền còn lại
                const remainingOrderAmount = orderAmount - payAmount;
                await db.collection('orders').doc(order.id).update({
                    totalAmount: remainingOrderAmount,
                    finalTotal: remainingOrderAmount,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                // Tạo order mới với phần đã thanh toán
                await db.collection('orders').add({
                    customerId,
                    customerName: order.customerName || customer.name || '',
                    customerPhone: order.customerPhone || customer.phone || '',
                    totalAmount: payAmount,
                    finalTotal: payAmount,
                    status: 'completed',
                    paymentStatus: 'paid',
                    items: order.items || [],
                    note: `Thanh toán một phần cho order ${order.id}`,
                    originalOrderId: order.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                ordersToPay.push({ orderId: order.id, amount: payAmount });
            }
            
            remainingAmount -= payAmount;
        }
        
        // Nếu còn tiền thừa (thanh toán nhiều hơn tổng các order chưa thanh toán)
        // thì tạo một order thanh toán với số tiền thừa
        if (remainingAmount > 0) {
            await db.collection('orders').add({
                customerId,
                customerName: customer.name || '',
                customerPhone: customer.phone || '',
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
            customerId,
            customerCode: customer.code || '',
            customerName: customer.name || '',
            amount,
            note: note || 'Thanh toán dư nợ',
            date: new Date(),
            ordersPaid: ordersToPay
        };
        
        res.json({
            success: true,
            message: 'Thanh toán thành công',
            receipt
        });
    } catch (error) {
        console.error('Error paying debt:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
