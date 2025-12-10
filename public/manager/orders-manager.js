// Biến toàn cục
if (typeof currentSelectingOrderId === 'undefined') {
    var currentSelectingOrderId = null;
}
if (typeof selectedTableNumbers === 'undefined') {
    var selectedTableNumbers = []; // Mảng để lưu nhiều bàn đã chọn
}

// Load danh sách đơn hàng chờ xác nhận
async function loadPendingOrders() {
    try {
        const response = await fetch('/api/manager/orders/pending');
        const data = await response.json();
        
        if (data.success) {
            console.log('Loaded pending orders:', data.orders.length);
            // Log từng order để debug
            data.orders.forEach(order => {
                console.log(`Order ${order.id}: tableNumbers=${JSON.stringify(order.tableNumbers)}, tableNumber=${order.tableNumber}, hasTables=${(order.tableNumbers && order.tableNumbers.length > 0) || order.tableNumber}`);
            });
            displayPendingOrders(data.orders);
        } else {
            console.error('Failed to load pending orders:', data.error);
        }
    } catch (error) {
        console.error('Error loading pending orders:', error);
        alert('Lỗi khi tải danh sách đơn hàng');
    }
}

// Hiển thị danh sách đơn hàng chờ xác nhận
function displayPendingOrders(orders) {
    const pendingOrdersTableBody = document.getElementById('pendingOrdersTableBody');
    if (!pendingOrdersTableBody) {
        console.error('pendingOrdersTableBody not found');
        return;
    }
    
    console.log('displayPendingOrders called with', orders.length, 'orders');
    pendingOrdersTableBody.innerHTML = '';
    
    if (!orders || orders.length === 0) {
        pendingOrdersTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Không có đơn hàng chờ xác nhận</td></tr>';
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
        
        // Số lượng người
        const numberOfPeople = order.numberOfPeople || 1;
        
        // Thời gian ăn
        let eatingTimeStr = 'Chưa chọn';
        if (order.eatingTime) {
            const eatingTime = order.eatingTime instanceof Date ? order.eatingTime : new Date(order.eatingTime);
            if (!isNaN(eatingTime.getTime())) {
                eatingTimeStr = eatingTime.toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }
        
        // Loại đơn hàng
        const deliveryType = order.deliveryType || 'at-table';
        const isTakeawayOrDelivery = deliveryType === 'takeaway' || deliveryType === 'delivery';
        
        // Số bàn - hỗ trợ cả tableNumbers (mảng) và tableNumber (số đơn)
        // Debug: log dữ liệu gốc
        console.log(`Display Order ${order.id}: tableNumbers=${JSON.stringify(order.tableNumbers)}, tableNumber=${order.tableNumber}, type tableNumbers=${typeof order.tableNumbers}`);
        
        let tableNumbers = [];
        if (order.tableNumbers !== null && order.tableNumbers !== undefined) {
            if (Array.isArray(order.tableNumbers)) {
                tableNumbers = order.tableNumbers.map(t => parseInt(t)).filter(t => !isNaN(t) && t > 0).sort((a, b) => a - b);
            } else if (typeof order.tableNumbers === 'number') {
                tableNumbers = [order.tableNumbers];
            }
        }
        
        // Nếu tableNumbers vẫn rỗng, thử tableNumber
        if (tableNumbers.length === 0 && order.tableNumber !== null && order.tableNumber !== undefined) {
            const tableNum = parseInt(order.tableNumber);
            if (!isNaN(tableNum) && tableNum > 0) {
                tableNumbers = [tableNum];
            }
        }
        
        const hasTables = tableNumbers.length > 0;
        const tableDisplay = hasTables ? `Bàn ${tableNumbers.join(', ')}` : 'Chưa xếp';
        
        console.log(`Order ${order.id}: hasTables=${hasTables}, tableNumbers=${JSON.stringify(tableNumbers)}`);
        
        // Hiển thị loại đơn hàng
        let orderTypeLabel = '';
        if (deliveryType === 'takeaway') {
            orderTypeLabel = '<span style="color: #ff9800; font-weight: 500;">Mang về</span>';
        } else if (deliveryType === 'delivery') {
            orderTypeLabel = '<span style="color: #2196f3; font-weight: 500;">Giao hàng</span>';
        } else {
            orderTypeLabel = '<span style="color: #4caf50; font-weight: 500;">Tại bàn</span>';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${customerName}</td>
            <td>${order.customerPhone || 'N/A'}</td>
            <td>${numberOfPeople}</td>
            <td>${eatingTimeStr}</td>
            <td>
                <button class="btn-link-detail" onclick="viewOrderDetail('${order.id}')">Chi tiết</button>
            </td>
            <td>
                ${isTakeawayOrDelivery ? 
                    orderTypeLabel :
                    (hasTables ? 
                        `<span style="font-weight: 500;">${tableDisplay}</span>` :
                        `<button class="btn-primary" onclick="openSelectTableModal('${order.id}')" style="padding: 6px 12px; font-size: 13px;">Xếp bàn</button>`)
                }
            </td>
            <td>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    ${isTakeawayOrDelivery ? 
                        // Đơn mang về/ship: có thể xác nhận trực tiếp không cần bàn
                        `<button class="btn-primary" onclick="confirmOrder('${order.id}', null, '${deliveryType}')" style="padding: 6px 12px; font-size: 13px;">Xác nhận</button>` :
                        // Đơn tại bàn: cần xếp bàn trước
                        (hasTables ? 
                            `<button class="btn-primary" onclick="confirmOrder('${order.id}', '${tableNumbers.join(',')}', '${deliveryType}')" style="padding: 6px 12px; font-size: 13px;">Xác nhận</button>` :
                            `<span style="color: #999; font-size: 13px;">Chưa xếp bàn</span>`)
                    }
                    <button class="btn-delete" onclick="cancelOrder('${order.id}')" style="padding: 6px 12px; font-size: 13px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; transition: background 0.3s;">Hủy</button>
                </div>
            </td>
        `;
        pendingOrdersTableBody.appendChild(row);
    });
}

// Xem chi tiết order
async function viewOrderDetail(orderId) {
    try {
        const response = await fetch(`/api/manager/orders/${orderId}`);
        const data = await response.json();
        
        if (data.success && data.order) {
            displayOrderDetail(data.order);
            document.getElementById('orderDetailModal').style.display = 'flex';
        } else {
            alert('Không tìm thấy đơn hàng');
        }
    } catch (error) {
        console.error('Error loading order detail:', error);
        alert('Lỗi khi tải chi tiết đơn hàng');
    }
}

// Hiển thị chi tiết order trong modal
async function displayOrderDetail(order) {
    const orderDetailBody = document.getElementById('orderDetailBody');
    
    // Xác định tên khách hàng
    let customerName = 'Khách lẻ';
    if (order.customer && order.customer.name) {
        customerName = order.customer.name;
    } else if (order.customerName) {
        customerName = order.customerName;
    }
    
    // Ngày lập
    const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
    const dateStr = createdAt.toLocaleDateString('vi-VN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Số Order - lấy từ order.orderNumber hoặc tạo từ ID
    const orderNumber = order.orderNumber || String(Math.floor(10000 + Math.random() * 90000));
    
    // Thời gian ăn
    let eatingTimeStr = 'Chưa chọn';
    if (order.eatingTime) {
        const eatingTime = order.eatingTime.toDate ? order.eatingTime.toDate() : new Date(order.eatingTime);
        eatingTimeStr = eatingTime.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Tạo bảng mặt hàng
    let itemsTableHtml = '';
    let totalAmount = 0;
    
    if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
            const quantity = item.quantity || 1;
            const unitPrice = item.price || 0;
            const amount = quantity * unitPrice;
            totalAmount += amount;
            
            const unit = item.unit || 'Đĩa';
            const quantityFormatted = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
            
            itemsTableHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.name || 'N/A'}</td>
                    <td>${unit}</td>
                    <td>${quantityFormatted}</td>
                    <td>${unitPrice.toLocaleString('vi-VN')} VNĐ</td>
                    <td>${Math.round(amount).toLocaleString('vi-VN')} VNĐ</td>
                </tr>
            `;
        });
    }
    
    const discount = order.discount || 0;
    const finalTotal = (order.finalTotal || totalAmount) - discount;
    
    // Lũy kế còn nợ
    let debt = 0;
    if (order.customerId) {
        try {
            const debtResponse = await fetch(`/api/manager/customers/${order.customerId}/debt`);
            const debtData = await debtResponse.json();
            if (debtData.success) {
                debt = debtData.closingBalance || 0;
            }
        } catch (error) {
            console.error('Error loading debt:', error);
        }
    }
    
    orderDetailBody.innerHTML = `
        <div class="preview-business-info">
            <p><strong>Đơn vị phát hành:</strong> Hộ kinh doanh: Lê Kỳ Anh, địa chỉ tại Sơn Dương, T. Tuyên Quang.</p>
        </div>
        
        <div class="preview-transaction-info">
            <h3>Thông tin giao dịch:</h3>
            <p><strong>Người mua:</strong> ${customerName}</p>
            <p><strong>Ngày lập:</strong> Ngày ${dateStr}</p>
            <p><strong>Số Order:</strong> ${orderNumber}</p>
            <p><strong>Thời gian ăn:</strong> ${eatingTimeStr}</p>
        </div>
        
        <div class="preview-items-table">
            <h3>Mặt hàng và Giá trị:</h3>
            <table class="preview-table">
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
                    ${itemsTableHtml}
                </tbody>
            </table>
        </div>
        
        <div class="preview-summary">
            <p><strong>Tổng cộng thành tiền hàng hóa:</strong> <span>${Math.round(totalAmount).toLocaleString('vi-VN')}</span> VNĐ</p>
            <p><strong>Tiền chiết khấu:</strong> <span>${Math.round(discount).toLocaleString('vi-VN')}</span> VNĐ</p>
            <p><strong>Tổng thanh toán (Thực nhận):</strong> <span>${Math.round(finalTotal).toLocaleString('vi-VN')}</span> VNĐ</p>
            <p><strong>Lũy kế còn nợ:</strong> <span>${Math.round(debt).toLocaleString('vi-VN')}</span> VNĐ</p>
        </div>
    `;
}

// Đóng modal chi tiết order
function closeOrderDetailModal() {
    document.getElementById('orderDetailModal').style.display = 'none';
}

// Mở modal chọn bàn
async function openSelectTableModal(orderId) {
    currentSelectingOrderId = orderId;
    selectedTableNumbers = [];
    
    // Load thông tin order để hiển thị và lấy bàn đã xếp (nếu có)
    try {
        const response = await fetch(`/api/manager/orders/${orderId}`);
        const data = await response.json();
        
        if (data.success && data.order) {
            let customerName = 'Khách lẻ';
            if (data.order.customer && data.order.customer.name) {
                customerName = data.order.customer.name;
            } else if (data.order.customerName) {
                customerName = data.order.customerName;
            }
            document.getElementById('selectTableOrderInfo').textContent = `${customerName} - ${data.order.customerPhone || 'N/A'}`;
            
            // Nếu đã có bàn được xếp, load vào selectedTableNumbers
            if (data.order.tableNumbers && Array.isArray(data.order.tableNumbers)) {
                selectedTableNumbers = data.order.tableNumbers.map(t => parseInt(t));
            } else if (data.order.tableNumber) {
                selectedTableNumbers = [parseInt(data.order.tableNumber)];
            }
        }
    } catch (error) {
        console.error('Error loading order info:', error);
    }
    
    // Load danh sách bàn
    await loadTablesForSelection();
    
    document.getElementById('selectTableModal').style.display = 'flex';
}

// Load danh sách bàn để chọn
async function loadTablesForSelection() {
    try {
        const response = await fetch('/api/manager/tables');
        const data = await response.json();
        
        if (data.success && data.tables) {
            currentTablesForSelection = data.tables;
            displayTablesForSelection(data.tables);
        }
    } catch (error) {
        console.error('Error loading tables:', error);
        alert('Lỗi khi tải danh sách bàn');
    }
}

// Hiển thị danh sách bàn để chọn
function displayTablesForSelection(tables) {
    const tablesGridSelect = document.getElementById('tablesGridSelect');
    if (!tablesGridSelect) return;
    
    tablesGridSelect.innerHTML = '';
    
    // Sắp xếp bàn theo số
    const sortedTables = [...tables].sort((a, b) => {
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        return numA - numB;
    });
    
    sortedTables.forEach(table => {
        const tableCard = document.createElement('div');
        const tableNum = parseInt(table.number);
        const isSelected = selectedTableNumbers.includes(tableNum);
        
        tableCard.className = `table-card-select ${table.status} ${isSelected ? 'selected' : ''}`;
        
        // Chỉ cho phép chọn bàn trống hoặc bàn đã được chọn trước đó
        if (table.status === 'available' || isSelected) {
            tableCard.style.cursor = 'pointer';
        } else {
            tableCard.style.cursor = 'not-allowed';
        }
        
        let statusIcon = '✗';
        if (table.status === 'occupied') {
            statusIcon = '✓';
            tableCard.title = 'Bàn đang sử dụng';
        } else if (table.status === 'reserved') {
            statusIcon = '✓';
            tableCard.title = 'Bàn đã đặt trước';
        } else {
            tableCard.title = 'Bàn trống';
        }
        
        tableCard.innerHTML = `
            <input type="checkbox" 
                   class="table-checkbox-select" 
                   data-table-number="${tableNum}"
                   ${isSelected ? 'checked' : ''}
                   ${table.status === 'available' || isSelected ? '' : 'disabled'}
                   onclick="event.stopPropagation(); toggleTableSelection(${tableNum})"
                   style="margin-bottom: 8px; width: 18px; height: 18px; cursor: pointer;">
            <div style="font-size: 18px; margin-bottom: 5px;">${statusIcon}</div>
            <div style="font-weight: bold;">Bàn ${table.number}</div>
        `;
        
        // Click vào card để toggle (trừ khi click vào checkbox)
        if (table.status === 'available' || isSelected) {
            tableCard.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.closest('.table-checkbox-select')) {
                    toggleTableSelection(tableNum);
                }
            };
        }
        
        tablesGridSelect.appendChild(tableCard);
    });
    
    // Hiển thị số bàn đã chọn
    updateSelectedTablesCount();
}

// Toggle chọn/bỏ chọn bàn
function toggleTableSelection(tableNumber) {
    const index = selectedTableNumbers.indexOf(tableNumber);
    if (index > -1) {
        selectedTableNumbers.splice(index, 1);
    } else {
        selectedTableNumbers.push(tableNumber);
    }
    // Reload để highlight bàn đã chọn
    displayTablesForSelection(currentTablesForSelection || []);
}

// Cập nhật số bàn đã chọn
function updateSelectedTablesCount() {
    const count = selectedTableNumbers.length;
    const countElement = document.getElementById('selectedTablesCount');
    if (countElement) {
        countElement.textContent = count > 0 ? ` (Đã chọn: ${count} bàn)` : '';
    }
}

// Biến lưu danh sách bàn hiện tại để reload
if (typeof currentTablesForSelection === 'undefined') {
    var currentTablesForSelection = [];
}

// Xác nhận chọn bàn
async function confirmTableSelection() {
    if (!currentSelectingOrderId || selectedTableNumbers.length === 0) {
        alert('Vui lòng chọn ít nhất một bàn');
        return;
    }
    
    try {
        const tableNumbersToAssign = selectedTableNumbers.map(t => parseInt(t)).sort((a, b) => a - b);
        
        const response = await fetch(`/api/manager/orders/${currentSelectingOrderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tableNumbers: tableNumbersToAssign
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Đã xếp ${selectedTableNumbers.length} bàn thành công!`);
            closeSelectTableModal();
            
            // Reload ngay lập tức và reload lại sau 1 giây để đảm bảo dữ liệu đã được cập nhật
            loadPendingOrders();
            setTimeout(() => {
                loadPendingOrders();
            }, 1000);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xếp bàn'));
        }
    } catch (error) {
        console.error('Error assigning tables:', error);
        alert('Lỗi khi xếp bàn');
    }
}

// Đóng modal chọn bàn
function closeSelectTableModal() {
    document.getElementById('selectTableModal').style.display = 'none';
    currentSelectingOrderId = null;
    selectedTableNumbers = [];
    currentTablesForSelection = [];
}

// Xác nhận đơn hàng - Tối ưu: không cần gọi API lấy thông tin trước
async function confirmOrder(orderId, tableNumbersParam, deliveryTypeParam) {
    if (!confirm('Bạn có chắc chắn muốn xác nhận đơn hàng này?')) {
        return;
    }
    
    try {
        // Sử dụng thông tin đã có sẵn từ bảng, không cần gọi API lại
        const deliveryType = deliveryTypeParam || 'at-table';
        const isTakeawayOrDelivery = deliveryType === 'takeaway' || deliveryType === 'delivery';
        
        // Xử lý tableNumbers - có thể là string "1,2,3" hoặc mảng
        let finalTableNumbers = null;
        if (!isTakeawayOrDelivery && tableNumbersParam) {
            // Nếu là string, chuyển thành mảng
            if (typeof tableNumbersParam === 'string') {
                finalTableNumbers = tableNumbersParam.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t) && t > 0);
            } else if (Array.isArray(tableNumbersParam)) {
                finalTableNumbers = tableNumbersParam.map(t => parseInt(t)).filter(t => !isNaN(t) && t > 0);
            }
        }
        
        // Gọi API confirm trực tiếp, không cần gọi API GET trước
        const response = await fetch(`/api/manager/orders/${orderId}/confirm`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tableNumbers: finalTableNumbers && finalTableNumbers.length > 0 ? finalTableNumbers : null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xác nhận đơn hàng thành công!');
            // Reload danh sách ngay lập tức, không cần delay
            loadPendingOrders();
            
            // Cập nhật badge trên dashboard
            if (typeof checkPendingOrders === 'function') {
                checkPendingOrders();
            }
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xác nhận đơn hàng'));
        }
    } catch (error) {
        console.error('Error confirming order:', error);
        alert('Lỗi khi xác nhận đơn hàng');
    }
}

// Hủy đơn hàng
async function cancelOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
        return;
    }
    
    try {
        // Lấy thông tin đơn hàng trước khi hủy để kiểm tra bàn
        const orderResponse = await fetch(`/api/manager/orders/${orderId}`);
        const orderData = await orderResponse.json();
        
        if (!orderData.success || !orderData.order) {
            alert('Không tìm thấy đơn hàng');
            return;
        }
        
        const order = orderData.order;
        const tableNumber = order.tableNumber;
        
        // Cập nhật trạng thái đơn hàng
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
            // Nếu đơn hàng đã có bàn, giải phóng bàn
            if (tableNumber) {
                try {
                    const tableId = `table-${tableNumber}`;
                    await fetch(`/api/manager/tables/${tableId}/status`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: 'available',
                            orderId: null
                        })
                    });
                } catch (tableError) {
                    console.error('Error freeing table:', tableError);
                }
            }
            
            alert('Đã hủy đơn hàng thành công!');
            loadPendingOrders(); // Reload danh sách
            
            // Cập nhật badge trên dashboard
            if (typeof checkPendingOrders === 'function') {
                checkPendingOrders();
            }
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể hủy đơn hàng'));
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('Lỗi khi hủy đơn hàng');
    }
}

// Đóng modal khi click bên ngoài
document.addEventListener('click', function(event) {
    const orderDetailModal = document.getElementById('orderDetailModal');
    if (orderDetailModal && event.target === orderDetailModal) {
        closeOrderDetailModal();
    }
    
    const selectTableModal = document.getElementById('selectTableModal');
    if (selectTableModal && event.target === selectTableModal) {
        closeSelectTableModal();
    }
});

// Switch order tabs
function switchOrderTab(tabName) {
    // Ẩn tất cả tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hiển thị tab được chọn
    const selectedTab = document.getElementById(`tab-${tabName}`);
    const selectedBtn = Array.from(document.querySelectorAll('.tab')).find(btn => {
        const onclick = btn.getAttribute('onclick') || '';
        return onclick.includes(`switchOrderTab('${tabName}')`);
    });
    
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Load dữ liệu khi chuyển tab
    if (tabName === 'confirm') {
        const confirmTab = document.getElementById('tab-confirm');
        if (confirmTab && typeof loadPendingOrders === 'function') {
            loadPendingOrders();
            confirmTab.setAttribute('data-loaded', 'true');
        } else {
            console.error('Cannot load pending orders: tab or function not found');
        }
    } else if (tabName === 'update') {
        if (typeof loadOrders === 'function') {
            loadOrders();
        }
    } else if (tabName === 'create') {
        if (typeof loadDataForCreateOrder === 'function') {
            loadDataForCreateOrder();
        }
    } else if (tabName === 'payment') {
        if (typeof loadPaymentCustomers === 'function') {
            loadPaymentCustomers();
        }
    }
}

// Export functions để có thể gọi từ HTML
window.switchOrderTab = switchOrderTab;
window.loadPendingOrders = loadPendingOrders;
window.displayPendingOrders = displayPendingOrders;
window.viewOrderDetail = viewOrderDetail;
window.closeOrderDetailModal = closeOrderDetailModal;
window.openSelectTableModal = openSelectTableModal;
window.closeSelectTableModal = closeSelectTableModal;
window.confirmTableSelection = confirmTableSelection;
window.toggleTableSelection = toggleTableSelection;
window.confirmOrder = confirmOrder;
window.cancelOrder = cancelOrder;

// Load pending orders khi trang được tải
// Sử dụng window.onload để đảm bảo tất cả script đã load xong
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPendingOrders);
} else {
    // DOM đã sẵn sàng, gọi ngay
    initPendingOrders();
}

function initPendingOrders() {
    // Đợi một chút để đảm bảo tất cả script đã load xong
    setTimeout(() => {
        if (document.getElementById('pendingOrdersTableBody')) {
            if (typeof loadPendingOrders === 'function') {
                loadPendingOrders();
                // Refresh mỗi 30 giây
                setInterval(loadPendingOrders, 30000);
            } else {
                console.error('loadPendingOrders function not found');
            }
        }
    }, 100);
}

