// Biến toàn cục cho phần cập nhật đơn hàng
if (typeof allOrders === 'undefined') {
    var allOrders = [];
}
if (typeof currentEditingOrder === 'undefined') {
    var currentEditingOrder = null;
}
if (typeof invoiceItems === 'undefined') {
    var invoiceItems = [];
}

// Load danh sách đơn hàng đã xác nhận (chưa thanh toán)
async function loadOrders() {
    try {
        console.log('[update-orders.js] Loading orders...');
        const response = await fetch('/api/manager/orders');
        
        if (!response.ok) {
            console.error('[update-orders.js] HTTP error:', response.status, response.statusText);
            alert('Lỗi khi tải danh sách đơn hàng: HTTP ' + response.status);
            return;
        }
        
        const data = await response.json();
        console.log('[update-orders.js] Response:', data);
        
        if (data.success) {
            const totalOrders = (data.orders || []).length;
            console.log('[update-orders.js] Total orders received:', totalOrders);
            
            // Log một vài đơn hàng đầu tiên để debug
            if (totalOrders > 0) {
                console.log('[update-orders.js] First order sample:', {
                    id: data.orders[0].id,
                    status: data.orders[0].status,
                    paymentStatus: data.orders[0].paymentStatus,
                    orderNumber: data.orders[0].orderNumber,
                    customerName: data.orders[0].customerName
                });
            }
            
            // Lọc các đơn hàng:
            // 1. Đã được xác nhận (status != 'pending')
            // 2. Chưa thanh toán hoặc chưa hoàn thành (paymentStatus != 'paid' hoặc status != 'completed')
            allOrders = (data.orders || []).filter(order => {
                // Chỉ hiển thị các đơn hàng đã được xác nhận (không phải pending)
                if (order.status === 'pending') {
                    console.log('[update-orders.js] Filtered out pending order:', order.id);
                    return false;
                }
                // Lọc bỏ các đơn hàng đã thanh toán và hoàn thành
                const isPaidAndCompleted = order.paymentStatus === 'paid' && order.status === 'completed';
                if (isPaidAndCompleted) {
                    console.log('[update-orders.js] Filtered out paid and completed order:', order.id);
                    return false;
                }
                console.log('[update-orders.js] Order passed filter:', {
                    id: order.id,
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                    orderNumber: order.orderNumber
                });
                return true;
            });
            
            console.log('[update-orders.js] Filtered orders:', allOrders.length);
            console.log('[update-orders.js] All filtered orders:', allOrders);
            
            if (allOrders.length === 0 && totalOrders > 0) {
                console.warn('[update-orders.js] No orders passed filter! Sample of filtered orders:', 
                    data.orders.slice(0, 3).map(o => ({
                        id: o.id,
                        status: o.status,
                        paymentStatus: o.paymentStatus
                    }))
                );
            }
            
            displayOrders(allOrders);
        } else {
            console.error('[update-orders.js] Failed to load orders:', data.error);
            alert('Lỗi khi tải danh sách đơn hàng: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('[update-orders.js] Error loading orders:', error);
        console.error('[update-orders.js] Error stack:', error.stack);
        alert('Lỗi khi tải danh sách đơn hàng: ' + error.message);
    }
}

// Hiển thị danh sách đơn hàng (theo logic của displayPendingOrders)
function displayOrders(orders) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody) {
        console.error('[update-orders.js] ordersTableBody not found');
        return;
    }
    
    console.log('[update-orders.js] displayOrders called with', orders.length, 'orders');
    ordersTableBody.innerHTML = '';
    
    if (!orders || orders.length === 0) {
        console.log('[update-orders.js] No orders to display');
        ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Không có đơn hàng nào</td></tr>';
        return;
    }
    
    console.log('[update-orders.js] Displaying orders:', orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status,
        paymentStatus: o.paymentStatus
    })));
    
    orders.forEach((order, index) => {
        const row = document.createElement('tr');
        
        // Xác định tên khách hàng
        let customerName = 'Khách lẻ';
        if (order.customer && order.customer.name) {
            customerName = order.customer.name;
        } else if (order.customerName) {
            customerName = order.customerName;
        }
        
        // Xác định hình thức
        const deliveryType = order.deliveryType || 'at-table';
        let deliveryTypeDisplay = '';
        if (deliveryType === 'takeaway') {
            deliveryTypeDisplay = '<span style="color: #ff9800; font-weight: 500;">Mang về</span>';
        } else if (deliveryType === 'delivery') {
            deliveryTypeDisplay = '<span style="color: #2196f3; font-weight: 500;">Giao hàng</span>';
        } else {
            // Ăn tại quán - hiển thị số bàn
            let tableNumbers = [];
            if (order.tableNumbers !== null && order.tableNumbers !== undefined) {
                if (Array.isArray(order.tableNumbers)) {
                    tableNumbers = order.tableNumbers.map(t => parseInt(t)).filter(t => !isNaN(t) && t > 0).sort((a, b) => a - b);
                } else if (typeof order.tableNumbers === 'number') {
                    tableNumbers = [order.tableNumbers];
                }
            }
            if (tableNumbers.length === 0 && order.tableNumber !== null && order.tableNumber !== undefined) {
                const tableNum = parseInt(order.tableNumber);
                if (!isNaN(tableNum) && tableNum > 0) {
                    tableNumbers = [tableNum];
                }
            }
            if (tableNumbers.length > 0) {
                deliveryTypeDisplay = `<span style="color: #4caf50; font-weight: 500;">Bàn ${tableNumbers.join(', ')}</span>`;
            } else {
                deliveryTypeDisplay = '<span style="color: #4caf50; font-weight: 500;">Ăn tại quán</span>';
            }
        }
        
        // Xác định trạng thái - chỉ có 2 trạng thái: "Đã đặt" và "Đang sử dụng"
        let statusText = 'Đã đặt';
        let statusClass = 'status-reserved';
        const orderStatus = order.status || 'confirmed';
        
        // Nếu đơn hàng đã được xác nhận hoặc đang trong quá trình
        if (orderStatus === 'confirmed' || orderStatus === 'preparing' || orderStatus === 'ready' || orderStatus === 'served') {
            // Kiểm tra xem có bàn được gán không
            const hasTables = (order.tableNumbers && Array.isArray(order.tableNumbers) && order.tableNumbers.length > 0) || 
                             (order.tableNumber !== null && order.tableNumber !== undefined);
            
            // Nếu có bàn và đang ở trạng thái confirmed/preparing thì là "Đã đặt"
            if (hasTables && (orderStatus === 'confirmed' || orderStatus === 'preparing')) {
                statusText = 'Đã đặt';
                statusClass = 'status-reserved';
            } else {
                // Các trường hợp khác là "Đang sử dụng"
                statusText = 'Đang sử dụng';
                statusClass = 'status-occupied';
            }
        } else {
            // Mặc định là "Đã đặt" cho các trạng thái khác
            statusText = 'Đã đặt';
            statusClass = 'status-reserved';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${order.orderNumber || 'N/A'}</td>
            <td>${customerName}</td>
            <td>${deliveryTypeDisplay}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn-primary" onclick="openUpdateOrderModal('${order.id}')" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Cập nhật</button>
                <button class="btn-delete-item" onclick="deleteOrder('${order.id}')" style="padding: 5px 10px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Xóa</button>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
}

// Tìm kiếm đơn hàng
function searchOrders() {
    const searchInput = document.getElementById('searchOrderInput');
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        displayOrders(allOrders);
        return;
    }
    
    const filtered = allOrders.filter(order => {
        const orderNumber = (order.orderNumber || '').toLowerCase();
        const customerName = (order.customerName || (order.customer && order.customer.name) || '').toLowerCase();
        return orderNumber.includes(query) || customerName.includes(query);
    });
    
    displayOrders(filtered);
}

// Reset tìm kiếm
function resetOrderSearch() {
    document.getElementById('searchOrderInput').value = '';
    displayOrders(allOrders);
}

// Mở modal cập nhật đơn hàng (theo logic của viewOrderDetail)
async function openUpdateOrderModal(orderId) {
    try {
        const response = await fetch(`/api/manager/orders/${orderId}`);
        const data = await response.json();
        
        if (data.success && data.order) {
            currentEditingOrder = data.order;
            await populateUpdateModal(data.order);
            document.getElementById('updateOrderModal').style.display = 'flex';
        } else {
            alert('Không tìm thấy đơn hàng');
        }
    } catch (error) {
        console.error('Error loading order:', error);
        alert('Lỗi khi tải thông tin đơn hàng');
    }
}

// Điền dữ liệu vào modal (theo logic của displayOrderDetail)
async function populateUpdateModal(order) {
    currentEditingOrder = order;
    
    // Xác định tên khách hàng
    let customerName = 'Khách lẻ';
    if (order.customer && order.customer.name) {
        customerName = order.customer.name;
    } else if (order.customerName) {
        customerName = order.customerName;
    }
    
    const customerPhone = order.customerPhone || (order.customer && order.customer.phone) || 'N/A';
    
    // Ngày lập
    let orderDate = 'N/A';
    if (order.createdAt) {
        let date;
        if (order.createdAt.toDate) {
            date = order.createdAt.toDate();
        } else if (order.createdAt instanceof Date) {
            date = order.createdAt;
        } else if (order.createdAt.seconds) {
            date = new Date(order.createdAt.seconds * 1000);
        } else {
            date = new Date(order.createdAt);
        }
        
        if (date && !isNaN(date.getTime())) {
            orderDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        }
    }
    
    // Kiểm tra và set các element - thêm null check để tránh lỗi
    const updateOrderIdEl = document.getElementById('updateOrderId');
    if (updateOrderIdEl) {
        updateOrderIdEl.value = order.id;
    } else {
        console.error('[update-orders.js] updateOrderId element not found');
    }
    
    const updateOrderNumberEl = document.getElementById('updateOrderNumber');
    if (updateOrderNumberEl) {
        updateOrderNumberEl.textContent = order.orderNumber || 'N/A';
    } else {
        console.error('[update-orders.js] updateOrderNumber element not found');
    }
    
    const updateCustomerNameEl = document.getElementById('updateCustomerName');
    if (updateCustomerNameEl) {
        updateCustomerNameEl.textContent = customerName;
    } else {
        console.error('[update-orders.js] updateCustomerName element not found');
    }
    
    // updateCustomerPhone có thể không có trong HTML, bỏ qua nếu không tồn tại
    const updateCustomerPhoneEl = document.getElementById('updateCustomerPhone');
    if (updateCustomerPhoneEl) {
        updateCustomerPhoneEl.textContent = customerPhone;
    } else {
        console.warn('[update-orders.js] updateCustomerPhone element not found (optional)');
    }
    
    const updateOrderDateEl = document.getElementById('updateOrderDate');
    if (updateOrderDateEl) {
        updateOrderDateEl.textContent = orderDate;
    } else {
        console.error('[update-orders.js] updateOrderDate element not found');
    }
    
    // Load danh sách món ăn
    invoiceItems = (order.items || []).map(item => ({
        menuId: item.menuId,
        type: item.type || 'menu',
        name: item.name || 'N/A',
        unit: item.unit || 'Đĩa',
        quantity: item.quantity || 1,
        price: item.price || 0
    }));
    
    // Load chiết khấu
    const discountPercent = order.discount ? ((order.discount / (order.total || 1)) * 100).toFixed(2) : 0;
    const discountPercentEl = document.getElementById('discountPercent');
    if (discountPercentEl) {
        discountPercentEl.value = discountPercent;
    } else {
        console.error('[update-orders.js] discountPercent element not found');
    }
    
    // Load voucher nếu có customerId
    if (order.customerId) {
        loadCustomerVouchers(order.customerId);
    } else {
        const voucherSection = document.getElementById('voucherSelectionSection');
        if (voucherSection) {
            voucherSection.style.display = 'none';
        }
    }
    
    // Load công nợ của khách hàng
    loadCustomerDebt(order.customerId || null, customerPhone);
    
    displayInvoiceItems();
    calculateInvoiceTotal();
}

// Load công nợ của khách hàng
async function loadCustomerDebt(customerId, customerPhone) {
    const debtElement = document.getElementById('customerDebt');
    if (!debtElement) return;
    
    let debt = 0;
    
    if (customerId) {
        try {
            const response = await fetch(`/api/manager/customers/${customerId}/debt`);
            const data = await response.json();
            if (data.success) {
                debt = data.closingBalance || 0;
            }
        } catch (error) {
            console.error('Error loading customer debt:', error);
        }
    } else if (customerPhone) {
        try {
            const checkResponse = await fetch(`/api/customer/check?phone=${encodeURIComponent(customerPhone)}`);
            const checkData = await checkResponse.json();
            if (checkData.success && checkData.customer) {
                const debtResponse = await fetch(`/api/manager/customers/${checkData.customer.id}/debt`);
                const debtData = await debtResponse.json();
                if (debtData.success) {
                    debt = debtData.closingBalance || 0;
                }
            }
        } catch (error) {
            console.error('Error loading customer debt by phone:', error);
        }
    }
    
    debtElement.textContent = Math.round(debt).toLocaleString('vi-VN') + ' VNĐ';
    if (debt > 0) {
        debtElement.style.color = '#dc3545';
    } else {
        debtElement.style.color = '#28a745';
    }
}

// Load danh sách voucher của khách hàng
async function loadCustomerVouchers(customerId) {
    try {
        const response = await fetch(`/api/manager/vouchers/customer/${customerId}`);
        const data = await response.json();
        
        const voucherSelect = document.getElementById('selectedVoucher');
        const voucherSection = document.getElementById('voucherSelectionSection');
        
        if (data.success && data.vouchers && data.vouchers.length > 0) {
            voucherSection.style.display = 'block';
            voucherSelect.innerHTML = '<option value="">-- Không sử dụng voucher --</option>';
            
            data.vouchers.forEach(voucher => {
                const option = document.createElement('option');
                option.value = voucher.id;
                const voucherValue = voucher.value || 0;
                option.textContent = `Voucher trị giá ${voucherValue.toLocaleString('vi-VN')} VNĐ`;
                option.dataset.value = voucherValue;
                voucherSelect.appendChild(option);
            });
        } else {
            voucherSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading vouchers:', error);
        document.getElementById('voucherSelectionSection').style.display = 'none';
    }
}

// Áp dụng voucher
async function applyVoucher() {
    const voucherSelect = document.getElementById('selectedVoucher');
    const selectedVoucherId = voucherSelect.value;
    
    if (!selectedVoucherId) {
        calculateInvoiceTotal();
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/vouchers/customer/${currentEditingOrder.customerId}`);
        const data = await response.json();
        
        if (data.success && data.vouchers) {
            const selectedVoucher = data.vouchers.find(v => v.id === selectedVoucherId);
            if (selectedVoucher) {
                const voucherValue = selectedVoucher.value || 0;
                window.currentVoucherValue = voucherValue;
                calculateInvoiceTotal();
            } else {
                window.currentVoucherValue = 0;
                calculateInvoiceTotal();
            }
        } else {
            window.currentVoucherValue = 0;
            calculateInvoiceTotal();
        }
    } catch (error) {
        console.error('Error loading voucher:', error);
        calculateInvoiceTotal();
    }
}

// Hiển thị danh sách món trong hóa đơn
function displayInvoiceItems() {
    const tbody = document.getElementById('invoiceItemsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (invoiceItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Chưa có món nào</td></tr>';
        calculateInvoiceTotal();
        return;
    }
    
    invoiceItems.forEach((item, index) => {
        const row = document.createElement('tr');
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        const total = quantity * price;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" value="${item.name || ''}" onchange="updateInvoiceItem(${index}, 'name', this.value)" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>
            <td>${item.unit || 'Đĩa'}</td>
            <td><input type="number" value="${quantity}" min="0.1" step="0.1" onchange="updateInvoiceItem(${index}, 'quantity', parseFloat(this.value))" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>
            <td><input type="number" value="${price}" min="0" onchange="updateInvoiceItem(${index}, 'price', parseFloat(this.value))" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>
            <td>${Math.round(total).toLocaleString('vi-VN')} VNĐ</td>
            <td><button class="btn-delete-item" onclick="removeInvoiceItem(${index})">Xóa</button></td>
        `;
        tbody.appendChild(row);
    });
    
    calculateInvoiceTotal();
}

// Cập nhật item trong hóa đơn
function updateInvoiceItem(index, field, value) {
    if (index >= 0 && index < invoiceItems.length) {
        if (field === 'quantity') {
            if (value <= 0) {
                alert('Số lượng phải lớn hơn 0');
                displayInvoiceItems();
                return;
            }
            invoiceItems[index].quantity = value;
        } else if (field === 'price') {
            if (value < 0) {
                alert('Đơn giá không được âm');
                displayInvoiceItems();
                return;
            }
            invoiceItems[index].price = value;
        } else if (field === 'name') {
            invoiceItems[index].name = value;
        }
        displayInvoiceItems();
    }
}

// Xóa item khỏi hóa đơn
function removeInvoiceItem(index) {
    if (confirm('Bạn có chắc muốn xóa món này khỏi hóa đơn?')) {
        invoiceItems.splice(index, 1);
        displayInvoiceItems();
    }
}

// Thêm món vào hóa đơn
function addInvoiceItem() {
    invoiceItems.push({
        menuId: null,
        type: 'menu',
        name: '',
        unit: 'Đĩa',
        quantity: 1,
        price: 0
    });
    displayInvoiceItems();
}

// Tính tổng hóa đơn
function calculateInvoiceTotal() {
    const subtotal = invoiceItems.reduce((sum, item) => {
        return sum + ((item.quantity || 1) * (item.price || 0));
    }, 0);
    
    const voucherSelect = document.getElementById('selectedVoucher');
    const selectedVoucherId = voucherSelect ? voucherSelect.value : null;
    const voucherValue = window.currentVoucherValue || 0;
    
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const discountFromPercent = (subtotal * discountPercent) / 100;
    const discountFromVoucher = selectedVoucherId ? voucherValue : 0;
    const discountAmount = discountFromPercent + discountFromVoucher;
    
    const total = Math.max(0, subtotal - discountAmount);
    
    document.getElementById('invoiceSubtotal').textContent = Math.round(subtotal).toLocaleString('vi-VN') + ' VNĐ';
    
    const paymentAmountElement = document.getElementById('paymentAmount');
    if (paymentAmountElement) {
        paymentAmountElement.textContent = Math.round(subtotal).toLocaleString('vi-VN') + ' VNĐ';
    }
    
    if (selectedVoucherId && voucherValue > 0) {
        document.getElementById('discountAmount').innerHTML = 
            `${Math.round(discountFromPercent).toLocaleString('vi-VN')} VNĐ (chiết khấu) + ${Math.round(discountFromVoucher).toLocaleString('vi-VN')} VNĐ (voucher)`;
    } else {
        document.getElementById('discountAmount').textContent = Math.round(discountAmount).toLocaleString('vi-VN') + ' VNĐ';
    }
    
    document.getElementById('invoiceTotal').textContent = Math.round(total).toLocaleString('vi-VN') + ' VNĐ';
}

// Lưu cập nhật đơn hàng
async function saveOrderUpdate() {
    if (!currentEditingOrder) return;
    
    if (invoiceItems.length === 0) {
        alert('Vui lòng thêm ít nhất một món vào hóa đơn');
        return;
    }
    
    const subtotal = invoiceItems.reduce((sum, item) => {
        return sum + ((item.quantity || 1) * (item.price || 0));
    }, 0);
    
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const discount = (subtotal * discountPercent) / 100;
    const finalTotal = subtotal - discount;
    
    try {
        const response = await fetch(`/api/manager/orders/${currentEditingOrder.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: invoiceItems,
                total: subtotal,
                discount: discount,
                finalTotal: finalTotal
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật đơn hàng thành công!');
            closeUpdateOrderModal();
            loadOrders();
        } else {
            alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Có lỗi xảy ra khi cập nhật đơn hàng');
    }
}

// Thanh toán
async function processPayment() {
    if (!currentEditingOrder) return;
    
    if (invoiceItems.length === 0) {
        alert('Vui lòng thêm ít nhất một món vào hóa đơn');
        return;
    }
    
    if (confirm('Xác nhận thanh toán đơn hàng này?')) {
        try {
            const subtotal = invoiceItems.reduce((sum, item) => {
                return sum + ((item.quantity || 1) * (item.price || 0));
            }, 0);
            
            const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
            const discountFromPercent = (subtotal * discountPercent) / 100;
            const voucherSelect = document.getElementById('selectedVoucher');
            const selectedVoucherId = voucherSelect ? voucherSelect.value : null;
            const voucherValue = window.currentVoucherValue || 0;
            const discountFromVoucher = selectedVoucherId ? voucherValue : 0;
            const discount = discountFromPercent + discountFromVoucher;
            const finalTotal = Math.max(0, subtotal - discount);
            
            let usedVoucherId = null;
            
            if (selectedVoucherId) {
                try {
                    const voucherResponse = await fetch('/api/manager/vouchers/use', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            voucherId: selectedVoucherId,
                            orderId: currentEditingOrder.id
                        })
                    });
                    
                    const voucherData = await voucherResponse.json();
                    if (voucherData.success) {
                        usedVoucherId = selectedVoucherId;
                    }
                } catch (voucherError) {
                    console.error('Error using voucher:', voucherError);
                }
            }
            
            const response = await fetch(`/api/manager/orders/${currentEditingOrder.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: invoiceItems,
                    total: subtotal,
                    discount: discount,
                    finalTotal: finalTotal,
                    paymentStatus: 'paid',
                    status: 'completed',
                    voucherId: usedVoucherId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                let actualCustomerId = currentEditingOrder.customerId;
                
                if (!actualCustomerId && currentEditingOrder.customerPhone) {
                    try {
                        const checkResponse = await fetch(`/api/customer/check?phone=${encodeURIComponent(currentEditingOrder.customerPhone)}`);
                        const checkData = await checkResponse.json();
                        if (checkData.success && checkData.customer) {
                            actualCustomerId = checkData.customer.id;
                        }
                    } catch (error) {
                        console.error('Error finding customer by phone:', error);
                    }
                }
                
                if (actualCustomerId && finalTotal > 0) {
                    try {
                        const pointsResponse = await fetch('/api/manager/points/add', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                customerId: actualCustomerId,
                                amount: finalTotal
                            })
                        });
                        
                        const pointsData = await pointsResponse.json();
                        if (pointsData.success && pointsData.pointsAdded > 0) {
                            alert(`Thanh toán thành công! Khách hàng nhận được ${pointsData.pointsAdded} điểm tích lũy. Hóa đơn đã được lưu vào Thống kê & Báo cáo.`);
                        } else {
                            alert('Thanh toán thành công! Hóa đơn đã được lưu vào Thống kê & Báo cáo.');
                        }
                    } catch (pointsError) {
                        console.error('Error adding points:', pointsError);
                        alert('Thanh toán thành công! Hóa đơn đã được lưu vào Thống kê & Báo cáo.');
                    }
                } else {
                    alert('Thanh toán thành công! Hóa đơn đã được lưu vào Thống kê & Báo cáo.');
                }
                
                closeUpdateOrderModal();
                loadOrders();
            } else {
                alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Có lỗi xảy ra khi thanh toán');
        }
    }
}

// In hóa đơn
function printInvoice() {
    if (!currentEditingOrder) return;
    
    const subtotal = invoiceItems.reduce((sum, item) => {
        return sum + ((item.quantity || 1) * (item.price || 0));
    }, 0);
    
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const discountFromPercent = (subtotal * discountPercent) / 100;
    const voucherSelect = document.getElementById('selectedVoucher');
    const selectedVoucherId = voucherSelect ? voucherSelect.value : null;
    const voucherValue = window.currentVoucherValue || 0;
    const discountFromVoucher = selectedVoucherId ? voucherValue : 0;
    const discount = discountFromPercent + discountFromVoucher;
    const finalTotal = Math.max(0, subtotal - discount);
    
    // Lấy thông tin từ các element với null check
    const updateCustomerNameEl = document.getElementById('updateCustomerName');
    const updateCustomerPhoneEl = document.getElementById('updateCustomerPhone');
    const updateOrderNumberEl = document.getElementById('updateOrderNumber');
    const updateOrderDateEl = document.getElementById('updateOrderDate');
    const customerDebtEl = document.getElementById('customerDebt');
    
    const customerName = updateCustomerNameEl ? updateCustomerNameEl.textContent : (currentEditingOrder.customerName || 'Khách lẻ');
    const customerPhone = updateCustomerPhoneEl ? updateCustomerPhoneEl.textContent : (currentEditingOrder.customerPhone || 'N/A');
    const orderNumber = updateOrderNumberEl ? updateOrderNumberEl.textContent : (currentEditingOrder.orderNumber || 'N/A');
    const orderDate = updateOrderDateEl ? updateOrderDateEl.textContent : 'N/A';
    const customerDebt = customerDebtEl ? customerDebtEl.textContent : '0 VNĐ';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>HÓA ĐƠN DỊCH VỤ - ${orderNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
                    h2 { text-align: center; color: #8d5524; margin-bottom: 10px; font-size: 16px; }
                    .business-info, .transaction-info, .summary-info { margin-bottom: 10px; }
                    .business-info p, .transaction-info p, .summary-info p { margin: 2px 0; }
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
                    th { background: #8d5524; color: white; font-weight: bold; }
                    .total-row { font-weight: bold; background: #f8f9fa; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <h2 class="text-center">HÓA ĐƠN DỊCH VỤ</h2>
                <div class="business-info">
                    <p><strong>Đơn vị phát hành:</strong> Hộ kinh doanh: Lê Kỳ Anh</p>
                    <p><strong>Địa chỉ:</strong> Sơn Dương, T. Tuyên Quang.</p>
                </div>
                <div class="transaction-info">
                    <p><strong>Người mua:</strong> ${customerName}</p>
                    <p><strong>SĐT:</strong> ${customerPhone}</p>
                    <p><strong>Ngày lập:</strong> ${orderDate}</p>
                    <p><strong>Số Order:</strong> ${orderNumber}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Loại hàng</th>
                            <th>ĐVT</th>
                            <th>Số lượng</th>
                            <th class="text-right">Đơn giá</th>
                            <th class="text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoiceItems.map((item, index) => {
                            const quantity = item.quantity || 1;
                            const price = item.price || 0;
                            const amount = quantity * price;
                            const quantityFormatted = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.name || 'N/A'}</td>
                                    <td>${item.unit || 'Đĩa'}</td>
                                    <td>${quantityFormatted}</td>
                                    <td class="text-right">${Math.round(price).toLocaleString('vi-VN')} VNĐ</td>
                                    <td class="text-right">${Math.round(amount).toLocaleString('vi-VN')} VNĐ</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="5" class="text-right">Tổng cộng thành tiền hàng hóa:</td>
                            <td class="text-right">${Math.round(subtotal).toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td colspan="5" class="text-right">Tiền chiết khấu:</td>
                            <td class="text-right">${Math.round(discount).toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="5" class="text-right">Tổng thanh toán (Thực nhận):</td>
                            <td class="text-right">${Math.round(finalTotal).toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="5" class="text-right">Lũy kế còn nợ:</td>
                            <td class="text-right">${customerDebt}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Xóa đơn hàng
async function deleteOrder(orderId) {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng này? Hành động này không thể hoàn tác!')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/orders/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Error response (not JSON):', text);
            if (text.includes('<!DOCTYPE')) {
                throw new Error('Server trả về HTML thay vì JSON. Có thể route chưa được đăng ký đúng hoặc server chưa restart.');
            } else {
                throw new Error(`HTTP error! status: ${response.status}, response: ${text.substring(0, 100)}`);
            }
        }
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        if (data.success) {
            alert('Xóa đơn hàng thành công!');
            loadOrders();
        } else {
            alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Có lỗi xảy ra khi xóa đơn hàng: ' + error.message);
    }
}

// Đóng modal
function closeUpdateOrderModal() {
    document.getElementById('updateOrderModal').style.display = 'none';
    currentEditingOrder = null;
    invoiceItems = [];
}

// Export functions - Đảm bảo được gán vào window ngay lập tức
console.log('[update-orders.js] Exporting functions to window...');
window.loadOrders = loadOrders;
window.displayOrders = displayOrders;
window.searchOrders = searchOrders;
window.resetOrderSearch = resetOrderSearch;
window.openUpdateOrderModal = openUpdateOrderModal;
window.closeUpdateOrderModal = closeUpdateOrderModal;
window.addInvoiceItem = addInvoiceItem;
window.updateInvoiceItem = updateInvoiceItem;
window.removeInvoiceItem = removeInvoiceItem;
window.calculateInvoiceTotal = calculateInvoiceTotal;
window.saveOrderUpdate = saveOrderUpdate;
window.processPayment = processPayment;
window.printInvoice = printInvoice;
window.deleteOrder = deleteOrder;
window.applyVoucher = applyVoucher;
window.loadCustomerVouchers = loadCustomerVouchers;
window.loadCustomerDebt = loadCustomerDebt;

console.log('[update-orders.js] Functions exported. window.loadOrders type:', typeof window.loadOrders);
console.log('[update-orders.js] Functions exported. window.displayOrders type:', typeof window.displayOrders);

// Tự động load khi script được load nếu tab đang active
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            const updateTab = document.getElementById('tab-update');
            if (updateTab && updateTab.classList.contains('active')) {
                console.log('[update-orders.js] Tab update is active, auto-loading orders...');
                loadOrders();
            }
        }, 1000);
    });
} else {
    setTimeout(() => {
        const updateTab = document.getElementById('tab-update');
        if (updateTab && updateTab.classList.contains('active')) {
            console.log('[update-orders.js] Tab update is active (DOM already ready), auto-loading orders...');
            loadOrders();
        }
    }, 1000);
}
