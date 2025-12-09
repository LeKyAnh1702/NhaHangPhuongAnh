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

// Load danh sách đơn hàng
async function loadOrders() {
    try {
        const response = await fetch('/api/manager/orders');
        const data = await response.json();
        
        if (data.success) {
            // Lọc các đơn hàng:
            // 1. Đã được xác nhận (status != 'pending')
            // 2. Chưa thanh toán hoặc chưa hoàn thành (paymentStatus != 'paid' hoặc status != 'completed')
            allOrders = (data.orders || []).filter(order => {
                // Chỉ hiển thị các đơn hàng đã được xác nhận (không phải pending)
                if (order.status === 'pending') {
                    return false;
                }
                // Lọc bỏ các đơn hàng đã thanh toán và hoàn thành
                return !(order.paymentStatus === 'paid' && order.status === 'completed');
            });
            displayOrders(allOrders);
        } else {
            console.error('Failed to load orders:', data.error);
            alert('Lỗi khi tải danh sách đơn hàng');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Lỗi khi tải danh sách đơn hàng');
    }
}

// Hiển thị danh sách đơn hàng
function displayOrders(orders) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody) return;
    
    ordersTableBody.innerHTML = '';
    
    if (orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Không có đơn hàng nào</td></tr>';
        return;
    }
    
    orders.forEach((order, index) => {
        const row = document.createElement('tr');
        
        // Xác định tên khách hàng
        let customerName = 'Khách lẻ';
        if (order.customer && order.customer.name) {
            customerName = order.customer.name;
        } else if (order.customerName) {
            customerName = order.customerName;
        }
        
        // Format ngày đặt
        let orderDate = 'N/A';
        if (order.createdAt) {
            let date;
            if (order.createdAt.toDate) {
                // Firestore Timestamp
                date = order.createdAt.toDate();
            } else if (order.createdAt instanceof Date) {
                // Already a Date object
                date = order.createdAt;
            } else if (order.createdAt.seconds) {
                // Firestore Timestamp object with seconds
                date = new Date(order.createdAt.seconds * 1000);
            } else {
                // Try to parse as string or number
                date = new Date(order.createdAt);
            }
            
            // Check if date is valid
            if (date && !isNaN(date.getTime())) {
                orderDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            }
        }
        
        // Format tổng tiền
        const totalAmount = order.finalTotal || order.total || 0;
        const totalFormatted = Math.round(totalAmount).toLocaleString('vi-VN') + ' VNĐ';
        
        // Xác định trạng thái (giống trạng thái bàn)
        let statusText = 'Trống';
        let statusClass = 'status-available';
        if (order.status === 'cancelled') {
            statusText = 'Đã hủy';
            statusClass = 'status-cancelled';
        } else if (order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready') {
            // Kiểm tra xem có bàn được gán không
            const hasTables = (order.tableNumbers && order.tableNumbers.length > 0) || order.tableNumber;
            if (hasTables) {
                statusText = 'Đã đặt trước';
                statusClass = 'status-reserved';
            } else {
                statusText = 'Đang sử dụng';
                statusClass = 'status-occupied';
            }
        } else if (order.status === 'served') {
            statusText = 'Đang sử dụng';
            statusClass = 'status-occupied';
        } else if (order.status === 'pending') {
            statusText = 'Trống';
            statusClass = 'status-available';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${order.orderNumber || 'N/A'}</td>
            <td>${customerName}</td>
            <td>${orderDate}</td>
            <td>${totalFormatted}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn-primary" onclick="openUpdateOrderModal('${order.id}')" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Cập nhật</button>
                <button class="btn-delete-item" onclick="cancelOrder('${order.id}')" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Hủy</button>
                <button class="btn-delete-item" onclick="deleteOrder('${order.id}')" style="padding: 5px 10px; font-size: 12px; background: #dc3545;">Xóa</button>
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
    
    // Lọc các đơn hàng đã được xác nhận và chưa thanh toán
    const unpaidOrders = allOrders.filter(order => {
        // Chỉ hiển thị các đơn hàng đã được xác nhận (không phải pending)
        if (order.status === 'pending') {
            return false;
        }
        // Lọc bỏ các đơn hàng đã thanh toán và hoàn thành
        return !(order.paymentStatus === 'paid' && order.status === 'completed');
    });
    
    const filtered = unpaidOrders.filter(order => {
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

// Mở modal cập nhật đơn hàng
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

// Điền dữ liệu vào modal
async function populateUpdateModal(order) {
    // Lưu order vào biến global
    currentEditingOrder = order;
    
    console.log('populateUpdateModal - Order data:', {
        id: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customer: order.customer
    });
    
    // Nếu order có customer object nhưng chưa có customerId, lấy từ customer object
    if (!order.customerId && order.customer && order.customer.id) {
        currentEditingOrder.customerId = order.customer.id;
        console.log('Set customerId from customer object:', currentEditingOrder.customerId);
    }
    
    // Nếu không có customerId nhưng có customerPhone, thử tìm customerId
    if (!currentEditingOrder.customerId && order.customerPhone) {
        try {
            console.log('Trying to find customerId by phone:', order.customerPhone);
            const checkResponse = await fetch(`/api/customer/check?phone=${encodeURIComponent(order.customerPhone)}`);
            const checkData = await checkResponse.json();
            if (checkData.success && checkData.customer) {
                // Cập nhật customerId vào order
                currentEditingOrder.customerId = checkData.customer.id;
                console.log('Found and updated customerId by phone:', currentEditingOrder.customerId);
            } else {
                console.log('Customer not found by phone');
            }
        } catch (error) {
            console.error('Error finding customer by phone:', error);
        }
    }
    
    // Nếu vẫn không có customerId nhưng có customerName, thử tìm theo tên
    if (!currentEditingOrder.customerId && order.customerName && order.customerName !== 'Khách lẻ') {
        try {
            console.log('Trying to find customerId by name:', order.customerName);
            const searchResponse = await fetch(`/api/manager/search?query=${encodeURIComponent(order.customerName)}&type=customer`);
            const searchData = await searchResponse.json();
            if (searchData.success && searchData.results && searchData.results.customers && searchData.results.customers.length > 0) {
                const foundCustomer = searchData.results.customers[0];
                currentEditingOrder.customerId = foundCustomer.id;
                console.log('Found and updated customerId by name:', currentEditingOrder.customerId);
            } else {
                console.log('Customer not found by name');
            }
        } catch (error) {
            console.error('Error finding customer by name:', error);
        }
    }
    
    console.log('Final currentEditingOrder.customerId:', currentEditingOrder.customerId);
    
    document.getElementById('updateOrderId').value = order.id;
    document.getElementById('updateOrderNumber').textContent = order.orderNumber || 'N/A';
    
    const customerName = order.customerName || (order.customer && order.customer.name) || 'Khách lẻ';
    const customerPhone = order.customerPhone || (order.customer && order.customer.phone) || 'N/A';
    
    document.getElementById('updateCustomerName').textContent = customerName;
    document.getElementById('updateCustomerPhone').textContent = customerPhone;
    
    // Format ngày đặt
    let orderDate = 'N/A';
    if (order.createdAt) {
        let date;
        if (order.createdAt.toDate) {
            // Firestore Timestamp
            date = order.createdAt.toDate();
        } else if (order.createdAt instanceof Date) {
            // Already a Date object
            date = order.createdAt;
        } else if (order.createdAt.seconds) {
            // Firestore Timestamp object with seconds
            date = new Date(order.createdAt.seconds * 1000);
        } else {
            // Try to parse as string or number
            date = new Date(order.createdAt);
        }
        
        // Check if date is valid
        if (date && !isNaN(date.getTime())) {
            orderDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
    }
    document.getElementById('updateOrderDate').textContent = orderDate;
    
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
    document.getElementById('discountPercent').value = discountPercent;
    
    // Load voucher nếu có customerId
    if (order.customerId) {
        loadCustomerVouchers(order.customerId);
    } else {
        document.getElementById('voucherSelectionSection').style.display = 'none';
    }
    
    displayInvoiceItems();
    calculateInvoiceTotal();
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
        // Không sử dụng voucher, giữ nguyên chiết khấu thủ công
        calculateInvoiceTotal();
        return;
    }
    
    // Lấy thông tin voucher từ server để biết giá trị
    try {
        const response = await fetch(`/api/manager/vouchers/customer/${currentEditingOrder.customerId}`);
        const data = await response.json();
        
        if (data.success && data.vouchers) {
            const selectedVoucher = data.vouchers.find(v => v.id === selectedVoucherId);
            if (selectedVoucher) {
                const voucherValue = selectedVoucher.value || 0;
                // Lưu voucher value vào một biến để dùng khi tính toán
                window.currentVoucherValue = voucherValue;
                
                // Tính lại tổng với voucher
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
    
    // Kiểm tra xem có sử dụng voucher không
    const voucherSelect = document.getElementById('selectedVoucher');
    const selectedVoucherId = voucherSelect ? voucherSelect.value : null;
    const voucherValue = window.currentVoucherValue || 0;
    
    // Tính discount: phần trăm thủ công + voucher (nếu có)
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const discountFromPercent = (subtotal * discountPercent) / 100;
    const discountFromVoucher = selectedVoucherId ? voucherValue : 0;
    const discountAmount = discountFromPercent + discountFromVoucher;
    
    // Tổng thanh toán = subtotal - discount (không được âm)
    const total = Math.max(0, subtotal - discountAmount);
    
    document.getElementById('invoiceSubtotal').textContent = Math.round(subtotal).toLocaleString('vi-VN') + ' VNĐ';
    
    // Hiển thị discount: nếu có voucher thì hiển thị cả 2 phần
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
            loadOrders(); // Reload danh sách
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
            // Tính toán tổng tiền
            const subtotal = invoiceItems.reduce((sum, item) => {
                return sum + ((item.quantity || 1) * (item.price || 0));
            }, 0);
            
            // Tính discount: phần trăm thủ công + voucher (nếu có)
            const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
            const discountFromPercent = (subtotal * discountPercent) / 100;
            const voucherSelect = document.getElementById('selectedVoucher');
            const selectedVoucherId = voucherSelect ? voucherSelect.value : null;
            const voucherValue = window.currentVoucherValue || 0;
            const discountFromVoucher = selectedVoucherId ? voucherValue : 0;
            const discount = discountFromPercent + discountFromVoucher;
            const finalTotal = Math.max(0, subtotal - discount);
            
            // Kiểm tra xem có sử dụng voucher không
            let usedVoucherId = null;
            
            if (selectedVoucherId) {
                // Đánh dấu voucher đã sử dụng
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
                    // Tiếp tục thanh toán dù có lỗi với voucher
                }
            }
            
            // Lưu tất cả thay đổi và đánh dấu đã thanh toán
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
                // Tích điểm cho khách hàng nếu có
                console.log('\n=== PROCESSING PAYMENT - POINTS ===');
                console.log('Payment successful, checking for customerId:', currentEditingOrder.customerId);
                console.log('customerPhone:', currentEditingOrder.customerPhone);
                console.log('customerName:', currentEditingOrder.customerName);
                console.log('finalTotal:', finalTotal);
                
                let actualCustomerId = currentEditingOrder.customerId;
                
                // Nếu không có customerId, thử tìm từ customerPhone
                if (!actualCustomerId && currentEditingOrder.customerPhone) {
                    try {
                        console.log('No customerId, trying to find by phone:', currentEditingOrder.customerPhone);
                        const checkResponse = await fetch(`/api/customer/check?phone=${encodeURIComponent(currentEditingOrder.customerPhone)}`);
                        const checkData = await checkResponse.json();
                        if (checkData.success && checkData.customer) {
                            actualCustomerId = checkData.customer.id;
                            console.log('✓ Found customerId by phone:', actualCustomerId);
                        } else {
                            console.log('✗ Customer not found by phone');
                        }
                    } catch (error) {
                        console.error('✗ Error finding customer by phone:', error);
                    }
                }
                
                // Nếu vẫn không có customerId, thử tìm theo tên
                if (!actualCustomerId && currentEditingOrder.customerName && currentEditingOrder.customerName !== 'Khách lẻ') {
                    try {
                        console.log('No customerId, trying to find by name:', currentEditingOrder.customerName);
                        // Thử tìm bằng API search trước
                        const searchResponse = await fetch(`/api/manager/search?query=${encodeURIComponent(currentEditingOrder.customerName)}&type=customer`);
                        const searchData = await searchResponse.json();
                        if (searchData.success && searchData.results && searchData.results.customers && searchData.results.customers.length > 0) {
                            actualCustomerId = searchData.results.customers[0].id;
                            console.log('✓ Found customerId by name (via search API):', actualCustomerId);
                        } else {
                            // Nếu không tìm thấy, thử tìm trực tiếp bằng customerName trong order
                            // (API sẽ tự động tìm customer khi load order)
                            console.log('✗ Customer not found by name via search API');
                        }
                    } catch (error) {
                        console.error('✗ Error finding customer by name:', error);
                    }
                }
                
                console.log('Final actualCustomerId for points:', actualCustomerId);
                
                if (actualCustomerId && finalTotal > 0) {
                    try {
                        console.log('Calling /api/manager/points/add with customerId:', actualCustomerId, 'amount:', finalTotal);
                        
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
                        
                        console.log('Points API response status:', pointsResponse.status);
                        
                        const pointsData = await pointsResponse.json();
                        console.log('Points API response data:', pointsData);
                        
                        if (pointsData.success) {
                            if (pointsData.pointsAdded > 0) {
                                alert(`Thanh toán thành công! Khách hàng nhận được ${pointsData.pointsAdded} điểm tích lũy. Hóa đơn đã được lưu vào Thống kê & Báo cáo.`);
                            } else {
                                alert('Thanh toán thành công! Hóa đơn đã được lưu vào Thống kê & Báo cáo.');
                            }
                        } else {
                            console.error('Points API error:', pointsData.error);
                            alert('Thanh toán thành công! Hóa đơn đã được lưu vào Thống kê & Báo cáo. (Lỗi khi tích điểm: ' + (pointsData.error || 'Unknown') + ')');
                        }
                    } catch (pointsError) {
                        console.error('Error adding points:', pointsError);
                        alert('Thanh toán thành công! Hóa đơn đã được lưu vào Thống kê & Báo cáo. (Lỗi khi tích điểm)');
                    }
                } else {
                    if (!actualCustomerId) {
                        console.log('No customerId found in order and could not find by phone');
                    }
                    if (finalTotal <= 0) {
                        console.log('FinalTotal is 0 or negative');
                    }
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
    
    // Tạo nội dung hóa đơn để in
    const subtotal = invoiceItems.reduce((sum, item) => {
        return sum + ((item.quantity || 1) * (item.price || 0));
    }, 0);
    
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const discount = (subtotal * discountPercent) / 100;
    const finalTotal = subtotal - discount;
    
    const customerName = document.getElementById('updateCustomerName').textContent;
    const customerPhone = document.getElementById('updateCustomerPhone').textContent;
    const orderNumber = document.getElementById('updateOrderNumber').textContent;
    const orderDate = document.getElementById('updateOrderDate').textContent;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Hóa Đơn - ${orderNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h2 { text-align: center; color: #8d5524; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                    th { background: #8d5524; color: white; }
                    .total-row { font-weight: bold; background: #f8f9fa; }
                    .text-right { text-align: right; }
                </style>
            </head>
            <body>
                <h2>PHIẾU BÁN HÀNG LẺ HÀNG HÓA, DỊCH VỤ</h2>
                <p><strong>Đơn vị phát hành:</strong> Hộ kinh doanh: Lê Kỳ Anh, địa chỉ tại Sơn Dương, T. Tuyên Quang.</p>
                <p><strong>Người mua:</strong> ${customerName}</p>
                <p><strong>SĐT:</strong> ${customerPhone}</p>
                <p><strong>Số Order:</strong> ${orderNumber}</p>
                <p><strong>Ngày lập:</strong> ${orderDate}</p>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Loại hàng</th>
                            <th>ĐVT</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
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
                            <td colspan="5" class="text-right">Tiền chiết khấu (${discountPercent}%):</td>
                            <td class="text-right">${Math.round(discount).toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="5" class="text-right">Tổng thanh toán:</td>
                            <td class="text-right">${Math.round(finalTotal).toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Hủy đơn hàng
async function cancelOrder(orderId) {
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'cancelled'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Hủy đơn hàng thành công!');
            loadOrders();
        } else {
            alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('Có lỗi xảy ra khi hủy đơn hàng');
    }
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
        
        // Đọc response body một lần duy nhất
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            // Nếu là JSON, parse JSON
            data = await response.json();
        } else {
            // Nếu không phải JSON, đọc text
            const text = await response.text();
            console.error('Error response (not JSON):', text);
            if (text.includes('<!DOCTYPE')) {
                throw new Error('Server trả về HTML thay vì JSON. Có thể route chưa được đăng ký đúng hoặc server chưa restart.');
            } else {
                throw new Error(`HTTP error! status: ${response.status}, response: ${text.substring(0, 100)}`);
            }
        }
        
        // Kiểm tra response status
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

// Export functions
window.loadOrders = loadOrders;
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
window.cancelOrder = cancelOrder;
window.deleteOrder = deleteOrder;
window.applyVoucher = applyVoucher;
window.loadCustomerVouchers = loadCustomerVouchers;

