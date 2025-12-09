// ========== QUẢN LÝ BÀN ĂN ==========

let allTables = [];
let currentEditingTableId = null;
let selectedTableIds = new Set();

// Load danh sách bàn
async function loadTables() {
    try {
        // Initialize tables if needed
        const initResponse = await fetch('/api/manager/tables/initialize', {
            method: 'POST'
        });
        const initData = await initResponse.json();
        if (initData.success && initData.message === '50 tables initialized successfully') {
            console.log('Tables initialized');
        }
        
        // Load tables
        const response = await fetch('/api/manager/tables');
        const data = await response.json();
        
        if (data.success) {
            allTables = data.tables;
            displayTables(data.tables);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải danh sách bàn'));
        }
    } catch (error) {
        console.error('Error loading tables:', error);
        alert('Có lỗi xảy ra khi tải danh sách bàn');
    }
}

// Hiển thị danh sách bàn
function displayTables(tables) {
    const grid = document.getElementById('tablesGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (tables.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">Không tìm thấy bàn nào</p>';
        return;
    }
    
    tables.forEach(table => {
        const tableCard = document.createElement('div');
        const isSelected = selectedTableIds.has(table.id);
        tableCard.className = `table-card ${table.status} ${isSelected ? 'selected' : ''}`;
        tableCard.setAttribute('data-table-id', table.id);
        
        // Status icon
        let statusIcon = '✗';
        let statusClass = 'available';
        if (table.status === 'occupied') {
            statusIcon = '✓';
            statusClass = 'occupied';
        } else if (table.status === 'reserved') {
            statusIcon = '✓';
            statusClass = 'reserved';
        }
        
        // Reserved time display
        let reservedTimeHtml = '';
        if (table.status === 'reserved' && table.reservedTime) {
            const reservedDate = table.reservedTime?.toDate ? 
                table.reservedTime.toDate() : 
                new Date(table.reservedTime);
            const timeStr = reservedDate.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            reservedTimeHtml = `<div class="table-reserved-time">Đặt: ${timeStr}</div>`;
        }
        
        tableCard.innerHTML = `
            <input type="checkbox" 
                   class="table-checkbox" 
                   data-table-id="${table.id}"
                   ${isSelected ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleTableSelection('${table.id}')">
            <div class="table-status-icon ${statusClass}">${statusIcon}</div>
            <div class="table-number">Bàn ${table.number}</div>
            ${reservedTimeHtml}
        `;
        
        // Click to open single table modal (if not clicking checkbox)
        tableCard.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox' && !e.target.closest('.table-checkbox')) {
                openTableStatusModal(table);
            }
        });
        
        grid.appendChild(tableCard);
    });
    
    updateBulkStatusButton();
}

// Lọc bàn
function filterTables() {
    const searchInput = document.getElementById('tableSearchInput');
    const statusFilter = document.getElementById('tableStatusFilter');
    
    const search = searchInput ? searchInput.value.trim() : '';
    const status = statusFilter ? statusFilter.value : 'all';
    
    let filtered = [...allTables];
    
    // Filter by search
    if (search) {
        const searchNum = parseInt(search);
        if (!isNaN(searchNum)) {
            filtered = filtered.filter(table => table.number === searchNum);
        } else {
            filtered = filtered.filter(table => 
                table.number.toString().includes(search)
            );
        }
    }
    
    // Filter by status
    if (status && status !== 'all') {
        filtered = filtered.filter(table => table.status === status);
    }
    
    displayTables(filtered);
}

// Mở modal thay đổi trạng thái
async function openTableStatusModal(table) {
    currentEditingTableId = table.id;
    document.getElementById('modalTableNumber').textContent = table.number;
    
    // Set current status
    const statusRadios = document.querySelectorAll('input[name="tableStatus"]');
    statusRadios.forEach(radio => {
        if (radio.value === table.status) {
            radio.checked = true;
        }
    });
    
    // Hiển thị thông tin khách hàng nếu bàn đã đặt trước hoặc đang sử dụng
    const customerInfoSection = document.getElementById('customerInfoSection');
    const customerInfoContent = document.getElementById('customerInfoContent');
    
    if (table.status === 'reserved' || table.status === 'occupied') {
        customerInfoSection.style.display = 'block';
        
        // Load thông tin khách hàng từ order nếu có
        if (table.orderId) {
            try {
                const orderResponse = await fetch(`/api/manager/orders/${table.orderId}`);
                const orderData = await orderResponse.json();
                
                if (orderData.success && orderData.order) {
                    const order = orderData.order;
                    let customerHtml = '';
                    
                    // Lấy thông tin khách hàng từ order
                    if (order.customer) {
                        const customer = order.customer;
                        customerHtml = `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                                <div>
                                    <strong>Mã số KH:</strong> ${customer.code || 'N/A'}<br>
                                    <strong>Họ tên:</strong> ${customer.name || 'N/A'}<br>
                                    <strong>Số điện thoại:</strong> ${customer.phone || 'N/A'}
                                </div>
                                <div>
                                    <strong>Địa chỉ:</strong> ${customer.address || 'N/A'}<br>
                                    <strong>Thời gian đặt:</strong> ${formatDateTime(order.createdAt)}<br>
                                    <strong>Mã đơn:</strong> ${order.orderNumber || order.id.substring(0, 8)}
                                </div>
                            </div>
                        `;
                    } else if (order.customerId) {
                        // Fallback: load customer separately
                        try {
                            const customerResponse = await fetch(`/api/manager/customers`);
                            const customerData = await customerResponse.json();
                            
                            if (customerData.success && customerData.customers) {
                                const customer = customerData.customers.find(c => c.id === order.customerId);
                                if (customer) {
                                    customerHtml = `
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                                            <div>
                                                <strong>Mã số KH:</strong> ${customer.code || 'N/A'}<br>
                                                <strong>Họ tên:</strong> ${customer.name || 'N/A'}<br>
                                                <strong>Số điện thoại:</strong> ${customer.phone || 'N/A'}
                                            </div>
                                            <div>
                                                <strong>Địa chỉ:</strong> ${customer.address || 'N/A'}<br>
                                                <strong>Thời gian đặt:</strong> ${formatDateTime(order.createdAt)}<br>
                                                <strong>Mã đơn:</strong> ${order.orderNumber || order.id.substring(0, 8)}
                                            </div>
                                        </div>
                                    `;
                                }
                            }
                        } catch (error) {
                            console.error('Error loading customer:', error);
                        }
                    }
                    
                    // Nếu không có thông tin khách hàng, hiển thị thông tin đơn hàng
                    if (!customerHtml) {
                        customerHtml = `
                            <div style="margin-top: 12px;">
                                <p><strong>Mã đơn:</strong> ${order.orderNumber || order.id.substring(0, 8)}</p>
                                <p><strong>Thời gian đặt:</strong> ${formatDateTime(order.createdAt)}</p>
                                <p><strong>Tổng tiền:</strong> ${(order.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</p>
                            </div>
                        `;
                    }
                    
                    customerInfoContent.innerHTML = customerHtml;
                } else {
                    customerInfoContent.innerHTML = '<p style="color: #666; font-style: italic;">Chưa có thông tin đơn hàng</p>';
                }
            } catch (error) {
                console.error('Error loading order:', error);
                customerInfoContent.innerHTML = '<p style="color: #666; font-style: italic;">Thông tin khách hàng sẽ được hiển thị khi có đơn hàng liên kết</p>';
            }
        } else {
            customerInfoContent.innerHTML = '<p style="color: #666; font-style: italic;">Thông tin khách hàng sẽ được hiển thị khi có đơn hàng liên kết</p>';
        }
    } else {
        customerInfoSection.style.display = 'none';
    }
    
    document.getElementById('tableStatusModal').style.display = 'block';
}

// Format date time
function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Đóng modal
function closeTableStatusModal() {
    document.getElementById('tableStatusModal').style.display = 'none';
    currentEditingTableId = null;
}

// Lưu trạng thái bàn
async function saveTableStatus() {
    if (!currentEditingTableId) return;
    
    const selectedStatus = document.querySelector('input[name="tableStatus"]:checked').value;
    
    try {
        const response = await fetch(`/api/manager/tables/${currentEditingTableId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: selectedStatus
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật trạng thái bàn thành công!');
            closeTableStatusModal();
            loadTables();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể cập nhật trạng thái'));
        }
    } catch (error) {
        console.error('Error updating table status:', error);
        alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
}

// Toggle selection của một bàn
function toggleTableSelection(tableId) {
    if (selectedTableIds.has(tableId)) {
        selectedTableIds.delete(tableId);
    } else {
        selectedTableIds.add(tableId);
    }
    
    // Update UI
    const tableCard = document.querySelector(`[data-table-id="${tableId}"]`);
    if (tableCard) {
        if (selectedTableIds.has(tableId)) {
            tableCard.classList.add('selected');
        } else {
            tableCard.classList.remove('selected');
        }
    }
    
    updateBulkStatusButton();
}

// Chọn tất cả bàn
function selectAllTables() {
    const visibleTables = document.querySelectorAll('.table-card[data-table-id]');
    visibleTables.forEach(card => {
        const tableId = card.getAttribute('data-table-id');
        selectedTableIds.add(tableId);
        card.classList.add('selected');
        const checkbox = card.querySelector('.table-checkbox');
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    updateBulkStatusButton();
}

// Bỏ chọn tất cả bàn
function deselectAllTables() {
    selectedTableIds.clear();
    const visibleTables = document.querySelectorAll('.table-card[data-table-id]');
    visibleTables.forEach(card => {
        card.classList.remove('selected');
        const checkbox = card.querySelector('.table-checkbox');
        if (checkbox) {
            checkbox.checked = false;
        }
    });
    updateBulkStatusButton();
}

// Cập nhật nút bulk status
function updateBulkStatusButton() {
    const bulkBtn = document.getElementById('bulkStatusBtn');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkBtn && selectedCount) {
        const count = selectedTableIds.size;
        selectedCount.textContent = count;
        
        if (count > 0) {
            bulkBtn.style.display = 'inline-block';
        } else {
            bulkBtn.style.display = 'none';
        }
    }
}

// Mở modal thay đổi trạng thái nhiều bàn
function openBulkStatusModal() {
    if (selectedTableIds.size === 0) {
        alert('Vui lòng chọn ít nhất một bàn');
        return;
    }
    
    const selectedNumbers = [];
    selectedTableIds.forEach(id => {
        const table = allTables.find(t => t.id === id);
        if (table) {
            selectedNumbers.push(table.number);
        }
    });
    
    selectedNumbers.sort((a, b) => a - b);
    
    document.getElementById('bulkModalTableCount').textContent = selectedTableIds.size;
    document.getElementById('bulkModalTableNumbers').textContent = selectedNumbers.join(', ');
    
    // Reset radio buttons
    const statusRadios = document.querySelectorAll('input[name="bulkTableStatus"]');
    if (statusRadios.length > 0) {
        statusRadios[0].checked = true;
    }
    
    document.getElementById('bulkTableStatusModal').style.display = 'block';
}

// Đóng modal bulk status
function closeBulkTableStatusModal() {
    document.getElementById('bulkTableStatusModal').style.display = 'none';
}

// Lưu trạng thái nhiều bàn
async function saveBulkTableStatus() {
    if (selectedTableIds.size === 0) return;
    
    const selectedStatus = document.querySelector('input[name="bulkTableStatus"]:checked').value;
    
    if (!confirm(`Bạn có chắc chắn muốn thay đổi trạng thái ${selectedTableIds.size} bàn thành "${getStatusName(selectedStatus)}"?`)) {
        return;
    }
    
    try {
        const tableIds = Array.from(selectedTableIds);
        let successCount = 0;
        let errorCount = 0;
        
        for (const tableId of tableIds) {
            try {
                const response = await fetch(`/api/manager/tables/${tableId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: selectedStatus
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error updating table ${tableId}:`, error);
                errorCount++;
            }
        }
        
        if (successCount > 0) {
            alert(`Đã cập nhật thành công ${successCount} bàn${errorCount > 0 ? `, ${errorCount} bàn lỗi` : ''}`);
            closeBulkTableStatusModal();
            selectedTableIds.clear();
            loadTables();
        } else {
            alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
        }
    } catch (error) {
        console.error('Error updating bulk table status:', error);
        alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
}

// Lấy tên trạng thái
function getStatusName(status) {
    const statusNames = {
        'available': 'Trống',
        'occupied': 'Đang sử dụng',
        'reserved': 'Đã đặt trước'
    };
    return statusNames[status] || status;
}

// Close modals when clicking outside
window.onclick = function(event) {
    const tableStatusModal = document.getElementById('tableStatusModal');
    const bulkTableStatusModal = document.getElementById('bulkTableStatusModal');
    
    if (event.target === tableStatusModal) {
        closeTableStatusModal();
    }
    if (event.target === bulkTableStatusModal) {
        closeBulkTableStatusModal();
    }
}

// Load tables on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTables();
});

