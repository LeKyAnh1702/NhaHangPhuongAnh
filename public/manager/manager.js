// Load orders
async function loadOrders() {
    try {
        const response = await fetch('/api/manager/orders');
        const data = await response.json();
        
        if (data.success) {
            displayOrders(data.orders);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    const ordersTableBody = document.getElementById('ordersTableBody');
    
    // pendingOrdersTableBody được xử lý bởi orders-manager.js
    
    // Xử lý cho trang orders-update.html
    if (ordersTableBody) {
        ordersTableBody.innerHTML = '';
        
        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Không có đơn hàng</td></tr>';
            return;
        }
        
        orders.forEach((order, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${order.orderNumber || order.id.substring(0, 8)}</td>
                <td>${order.customer?.name || order.customerName || 'N/A'}</td>
                <td>${order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('vi-VN') : 'N/A'}</td>
                <td>${order.tableNumber || 'N/A'}</td>
                <td>${(order.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>
                    <button class="btn-primary" onclick="editOrder('${order.id}')">Cập Nhật</button>
                </td>
            `;
            ordersTableBody.appendChild(row);
        });
        return;
    }
    
    // Xử lý cho trang cũ (nếu có)
    if (ordersList) {
        ordersList.innerHTML = '';
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<p>Không có đơn hàng</p>';
            return;
        }
        
        orders.forEach(order => {
            const orderDiv = document.createElement('div');
            orderDiv.className = 'order-item';
            orderDiv.innerHTML = `
                <h3>Đơn hàng #${order.id.substring(0, 8)}</h3>
                <p>Khách hàng: ${order.customerName || order.userId}</p>
                <p>SĐT: ${order.customerPhone || 'N/A'}</p>
                <p>Bàn: ${order.tableId || 'N/A'}</p>
                <p>Trạng thái: <strong>${order.status}</strong></p>
                <p>Thanh toán: ${order.paymentStatus || 'Chưa thanh toán'}</p>
                <p>Tổng tiền: ${(order.finalTotal || order.total).toLocaleString()} VNĐ</p>
                <p>Ngày: ${new Date(order.createdAt?.toDate()).toLocaleString('vi-VN')}</p>
                <div class="order-actions">
                    ${order.status === 'pending' ? `<button class="btn-confirm" onclick="confirmOrder('${order.id}')">Xác nhận</button>` : ''}
                    <button class="btn-update" onclick="showUpdateOrderModal('${order.id}')">Cập nhật trạng thái</button>
                    <button class="btn-update" onclick="updatePaymentStatus('${order.id}')">Cập nhật thanh toán</button>
                </div>
            `;
            ordersList.appendChild(orderDiv);
        });
    }
}

async function confirmOrder(orderId) {
    // Kiểm tra tồn kho trước
    try {
        const checkResponse = await fetch(`/api/manager/orders/${orderId}/check-inventory`, {
            method: 'POST'
        });
        const checkData = await checkResponse.json();
        
        if (!checkData.success || !checkData.canConfirm) {
            if (checkData.insufficientItems && checkData.insufficientItems.length > 0) {
                const items = checkData.insufficientItems.map(i => `${i.ingredientName}: cần ${i.required}, có ${i.available}`).join('\n');
                alert(`Không đủ nguyên liệu:\n${items}`);
                return;
            }
        }
        
        const response = await fetch(`/api/manager/orders/${orderId}/confirm`, {
            method: 'PUT'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Xác nhận đơn hàng thành công!');
            loadOrders();
        }
    } catch (error) {
        console.error('Error confirming order:', error);
    }
}

async function loadPendingOrders() {
    try {
        const response = await fetch('/api/manager/orders/pending');
        const data = await response.json();
        
        if (data.success) {
            displayOrders(data.orders);
        }
    } catch (error) {
        console.error('Error loading pending orders:', error);
    }
}

function showUpdateOrderModal(orderId) {
    const status = prompt('Cập nhật trạng thái:\n1. preparing (Đang chuẩn bị)\n2. serving (Đang phục vụ)\n3. completed (Hoàn thành)\n4. cancelled (Hủy)\n\nNhập số (1-4):');
    const statusMap = { '1': 'preparing', '2': 'serving', '3': 'completed', '4': 'cancelled' };
    
    if (statusMap[status]) {
        updateOrderStatus(orderId, statusMap[status]);
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/manager/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            alert('Cập nhật trạng thái thành công!');
            loadOrders();
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

async function updatePaymentStatus(orderId) {
    const paymentStatus = prompt('Cập nhật thanh toán:\n1. paid (Đã thanh toán)\n2. pending (Chưa thanh toán)\n3. debt (Công nợ)\n\nNhập số (1-3):');
    const statusMap = { '1': 'paid', '2': 'pending', '3': 'debt' };
    
    if (statusMap[paymentStatus]) {
        try {
            const response = await fetch(`/api/manager/orders/${orderId}/payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentStatus: statusMap[paymentStatus] })
            });
            
            if (response.ok) {
                alert('Cập nhật thanh toán thành công!');
                loadOrders();
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
        }
    }
}

async function searchOrders() {
    const query = document.getElementById('searchOrderInput').value;
    
    try {
        const response = await fetch(`/api/manager/orders/search?query=${query}`);
        const data = await response.json();
        
        if (data.success) {
            displayOrders(data.orders);
        }
    } catch (error) {
        console.error('Error searching orders:', error);
    }
}

// Load inventory - sử dụng inventory-alerts API thay vì inventory
async function loadInventory() {
    try {
        // Sử dụng inventory-alerts API thay vì inventory
        const response = await fetch('/api/manager/inventory-alerts');
        const data = await response.json();
        
        if (data.success) {
            // Nếu có element inventoryList thì hiển thị
            if (document.getElementById('inventoryList')) {
                displayInventory(data.alerts || []);
            }
            if (document.getElementById('inventoryWarnings')) {
                displayWarnings(data.alerts || []);
            }
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function displayInventory(inventory) {
    const inventoryList = document.getElementById('inventoryList');
    if (!inventoryList) return;
    
    inventoryList.innerHTML = '';
    
    if (inventory.length === 0) {
        inventoryList.innerHTML = '<p>Không có dữ liệu tồn kho</p>';
        return;
    }
    
    inventory.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.innerHTML = `
            <div>
                <h3>${item.name}</h3>
                <p>Số lượng: ${item.quantity} ${item.unit || ''}</p>
                <p>Tồn kho tối thiểu: ${item.minStock || 0}</p>
            </div>
            <div>
                <input type="number" id="qty-${item.id}" value="${item.quantity}" style="width: 80px;">
                <button onclick="updateInventory('${item.id}')">Cập nhật</button>
            </div>
        `;
        inventoryList.appendChild(itemDiv);
    });
}

function displayWarnings(warnings) {
    const warningsDiv = document.getElementById('inventoryWarnings');
    if (!warningsDiv) return;
    
    warningsDiv.innerHTML = '';
    
    if (warnings && warnings.length > 0) {
        warningsDiv.innerHTML = '<h3>Cảnh báo tồn kho</h3>';
        warnings.forEach(item => {
            const warningDiv = document.createElement('div');
            warningDiv.className = `inventory-item ${item.quantity === 0 ? 'danger-item' : 'warning-item'}`;
            warningDiv.innerHTML = `
                <div>
                    <h3>${item.name}</h3>
                    <p>Số lượng: ${item.quantity} ${item.unit || ''}</p>
                    <p><strong>${item.quantity === 0 ? 'HẾT HÀNG!' : 'Sắp hết hàng!'}</strong></p>
                </div>
            `;
            warningsDiv.appendChild(warningDiv);
        });
    }
}

async function updateInventory(id) {
    const quantity = document.getElementById(`qty-${id}`).value;
    const reason = prompt('Lý do điều chỉnh (kiểm kê):');
    
    if (!reason) {
        alert('Vui lòng nhập lý do');
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/inventory/${id}/adjust`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                quantity: parseInt(quantity),
                reason: 'Kiểm kê',
                note: reason
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Điều chỉnh tồn kho thành công!');
            loadInventory();
        }
    } catch (error) {
        console.error('Error updating inventory:', error);
    }
}

async function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    try {
        const response = await fetch(`/api/manager/reports/sales?startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();
        
        if (data.success) {
            displayReport(data.report);
        }
    } catch (error) {
        console.error('Error generating report:', error);
    }
}

function displayReport(report) {
    const reportResults = document.getElementById('reportResults');
    reportResults.innerHTML = `
        <div class="report-results">
            <h3>Báo Cáo Bán Hàng</h3>
            <p>Tổng doanh thu: <strong>${report.totalRevenue.toLocaleString()} VNĐ</strong></p>
            <p>Tổng số đơn: <strong>${report.totalOrders}</strong></p>
            <p>Giá trị đơn trung bình: <strong>${report.averageOrderValue.toLocaleString()} VNĐ</strong></p>
            <h4>Trạng thái đơn hàng:</h4>
            <ul>
                ${Object.entries(report.statusCount).map(([status, count]) => 
                    `<li>${status}: ${count}</li>`
                ).join('')}
            </ul>
            <button onclick="loadPopularItems()">Xem món bán chạy</button>
            <button onclick="loadShiftReport()">Xem báo cáo theo ca</button>
        </div>
    `;
}

async function loadPopularItems() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    try {
        const response = await fetch(`/api/manager/reports/popular-items?startDate=${startDate}&endDate=${endDate}&limit=10`);
        const data = await response.json();
        
        if (data.success) {
            const reportResults = document.getElementById('reportResults');
            reportResults.innerHTML += `
                <div class="popular-items">
                    <h4>Top 10 món bán chạy:</h4>
                    <ol>
                        ${data.popularItems.map((item, index) => 
                            `<li>${item.name} - ${item.quantity} phần - ${item.revenue.toLocaleString()} VNĐ</li>`
                        ).join('')}
                    </ol>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading popular items:', error);
    }
}

async function loadShiftReport() {
    const date = document.getElementById('startDate').value || new Date().toISOString().split('T')[0];
    
    try {
        const response = await fetch(`/api/manager/reports/shifts?date=${date}`);
        const data = await response.json();
        
        if (data.success) {
            const reportResults = document.getElementById('reportResults');
            reportResults.innerHTML += `
                <div class="shift-report">
                    <h4>Báo cáo theo ca - ${data.date}:</h4>
                    <p><strong>Sáng (6h-12h):</strong> ${data.shifts.morning.orders} đơn - ${data.shifts.morning.revenue.toLocaleString()} VNĐ</p>
                    <p><strong>Chiều (12h-18h):</strong> ${data.shifts.afternoon.orders} đơn - ${data.shifts.afternoon.revenue.toLocaleString()} VNĐ</p>
                    <p><strong>Tối (18h-24h):</strong> ${data.shifts.evening.orders} đơn - ${data.shifts.evening.revenue.toLocaleString()} VNĐ</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading shift report:', error);
    }
}

// Initialize - chỉ load các phần có trên trang hiện tại
document.addEventListener('DOMContentLoaded', function() {
    // Chỉ load pending orders nếu có element tương ứng
    if (document.getElementById('pendingOrdersTableBody')) {
        loadPendingOrders();
    }
    
    // Chỉ load inventory nếu có element tương ứng
    if (document.getElementById('inventoryList')) {
        loadInventory();
    }
    
    // Chỉ load orders nếu có element tương ứng
    if (document.getElementById('ordersList')) {
        loadOrders();
    }
    
    // Chỉ load customers nếu có element tương ứng
    if (document.getElementById('customersTableBody')) {
        loadCustomers();
        loadCustomerSelects();
        loadCustomersForBalance();
    }
    
    // Setup customer form
    setupCustomerForm();
    
    // Setup edit customer form
    const editCustomerForm = document.getElementById('editCustomerForm');
    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateCustomer();
        });
    }
    
    // Đóng modal khi click bên ngoài
    const editCustomerModal = document.getElementById('editCustomerModal');
    if (editCustomerModal) {
        window.addEventListener('click', function(event) {
            if (event.target === editCustomerModal) {
                closeEditCustomerModal();
            }
        });
    }
    
    // Ẩn autocomplete khi click ra ngoài
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.customer-search-wrapper')) {
            document.querySelectorAll('.customer-autocomplete').forEach(autocomplete => {
                autocomplete.style.display = 'none';
            });
        }
    });
});

// ========== QUẢN LÝ KHÁCH HÀNG ==========

// Load danh sách khách hàng
async function loadCustomers() {
    try {
        const response = await fetch('/api/manager/customers');
        const data = await response.json();
        
        if (data.success) {
            displayCustomers(data.customers);
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function displayCustomers(customers) {
    const customersTableBody = document.getElementById('customersTableBody');
    if (!customersTableBody) return;
    
    customersTableBody.innerHTML = '';
    
    // Lọc lại để đảm bảo không có khách hàng đã xóa
    const activeCustomers = customers.filter(customer => {
        return customer.isActive !== false;
    });
    
    if (activeCustomers.length === 0) {
        customersTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">Không tìm thấy khách hàng nào</td></tr>';
        return;
    }
    
    activeCustomers.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${customer.code || 'N/A'}</strong></td>
            <td>${customer.name || 'N/A'}</td>
            <td>${customer.idCard || 'N/A'}</td>
            <td>${customer.address || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td>${customer.company || 'N/A'}</td>
            <td>${(customer.openingBalance || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td style="color: ${(customer.debt || 0) > 0 ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">
                ${(customer.debt || 0).toLocaleString('vi-VN')} VNĐ
            </td>
            <td>
                <button class="btn-edit" onclick="editCustomer('${customer.id}')">Sửa</button>
                <button class="btn-delete" onclick="deleteCustomer('${customer.id}')">Xóa</button>
            </td>
        `;
        customersTableBody.appendChild(row);
    });
}

// Mở modal sửa khách hàng
async function editCustomer(customerId) {
    try {
        // Lấy thông tin khách hàng
        const response = await fetch(`/api/manager/customers`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Lỗi khi tải thông tin khách hàng');
            return;
        }
        
        const customer = data.customers.find(c => c.id === customerId);
        
        if (!customer) {
            alert('Không tìm thấy khách hàng');
            return;
        }
        
        // Điền thông tin vào form
        document.getElementById('editCustomerId').value = customer.id;
        document.getElementById('editCustomerCode').value = customer.code || '';
        document.getElementById('editCustomerName').value = customer.name || '';
        document.getElementById('editCustomerIdCard').value = customer.idCard || '';
        document.getElementById('editCustomerAddress').value = customer.address || '';
        document.getElementById('editCustomerPhone').value = customer.phone || '';
        document.getElementById('editCustomerCompany').value = customer.company || '';
        
        // Hiển thị modal
        document.getElementById('editCustomerModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading customer:', error);
        alert('Lỗi khi tải thông tin khách hàng');
    }
}

// Đóng modal sửa khách hàng
function closeEditCustomerModal() {
    document.getElementById('editCustomerModal').style.display = 'none';
    document.getElementById('editCustomerForm').reset();
}

// Cập nhật thông tin khách hàng
async function updateCustomer() {
    const customerId = document.getElementById('editCustomerId').value;
    const name = document.getElementById('editCustomerName').value.trim();
    const idCard = document.getElementById('editCustomerIdCard').value.trim();
    const address = document.getElementById('editCustomerAddress').value.trim();
    const phone = document.getElementById('editCustomerPhone').value.trim();
    const company = document.getElementById('editCustomerCompany').value.trim();
    
    if (!name || !idCard || !address || !phone) {
        alert('Vui lòng điền đầy đủ các trường bắt buộc');
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                idCard,
                address,
                phone,
                company
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật thông tin khách hàng thành công!');
            closeEditCustomerModal();
            loadCustomers(); // Reload danh sách
        } else {
            alert('Lỗi: ' + (data.error || 'Có lỗi xảy ra khi cập nhật'));
        }
    } catch (error) {
        console.error('Error updating customer:', error);
        alert('Lỗi khi cập nhật thông tin khách hàng');
    }
}

// Load customer selects cho các dropdown
async function loadCustomerSelects() {
    try {
        const response = await fetch('/api/manager/customers');
        const data = await response.json();
        
        if (data.success) {
            const debtSelect = document.getElementById('debtCustomerSelect');
            const balanceSelect = document.getElementById('balanceCustomerSelect');
            
            if (debtSelect) {
                debtSelect.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
                data.customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = `${customer.code} - ${customer.name}`;
                    debtSelect.appendChild(option);
                });
            }
            
            if (balanceSelect) {
                balanceSelect.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
                data.customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = `${customer.code} - ${customer.name}`;
                    balanceSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading customer selects:', error);
    }
}

// Setup customer form
function setupCustomerForm() {
    const customerForm = document.getElementById('customerForm');
    if (customerForm && !customerForm.hasAttribute('data-listener-attached')) {
        customerForm.setAttribute('data-listener-attached', 'true');
        customerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('customerName').value.trim();
            const idCard = document.getElementById('customerIdCard').value.trim();
            const address = document.getElementById('customerAddress').value.trim();
            const phone = document.getElementById('customerPhone').value.trim();
            const company = document.getElementById('customerCompany').value.trim();
            
            if (!name || !idCard || !address || !phone) {
                alert('Vui lòng điền đầy đủ thông tin bắt buộc');
                return;
            }
            
            try {
                const response = await fetch('/api/manager/customers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        idCard,
                        address,
                        phone,
                        company
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(`Thêm khách hàng thành công! Mã số: ${data.code}`);
                    customerForm.reset();
                    document.getElementById('customerCode').value = '';
                    loadCustomers();
                    loadCustomerSelects();
                    switchTab('list');
                } else {
                    alert('Lỗi: ' + (data.error || 'Không thể thêm khách hàng'));
                }
            } catch (error) {
                console.error('Error adding customer:', error);
                alert('Có lỗi xảy ra khi thêm khách hàng');
            }
        });
    }
}

// Reset customer form
function resetCustomerForm() {
    const form = document.getElementById('customerForm');
    if (form) {
        form.reset();
        document.getElementById('customerCode').value = '';
    }
}

// Switch tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate tab button based on index
    const tabButtons = document.querySelectorAll('.tab');
    const tabIndexMap = {
        'list': 0,
        'add': 1,
        'debt': 2,
        'balance': 3
    };
    const index = tabIndexMap[tabName];
    if (index !== undefined && tabButtons[index]) {
        tabButtons[index].classList.add('active');
    }
    
    // Load data if needed
    if (tabName === 'list') {
        loadCustomers();
    } else if (tabName === 'debt') {
        loadDebtSummary();
    } else if (tabName === 'balance') {
        loadCustomersForBalance();
    }
}

// ========== ĐỐI CHIẾU CÔNG NỢ ==========

// Load bảng tổng hợp công nợ
async function loadDebtSummary() {
    const fromDate = document.getElementById('debtFromDate')?.value || '';
    const toDate = document.getElementById('debtToDate')?.value || '';
    const customerCode = document.getElementById('debtCustomerCodeFilter')?.value || '';
    const customerName = document.getElementById('debtCustomerNameFilter')?.value || '';
    
    try {
        const params = new URLSearchParams();
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
        if (customerCode) params.append('customerCode', customerCode);
        if (customerName) params.append('customerName', customerName);
        
        let url = '/api/manager/customers/debt-summary';
        const paramsString = params.toString();
        if (paramsString) {
            url += '?' + paramsString;
        }
        
        console.log('Loading debt summary from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayDebtSummary(data.debtSummary);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải dữ liệu công nợ'));
        }
    } catch (error) {
        console.error('Error loading debt summary:', error);
        alert('Có lỗi xảy ra khi tải dữ liệu công nợ');
    }
}

// Hiển thị bảng tổng hợp công nợ
function displayDebtSummary(debtSummary) {
    const tbody = document.getElementById('debtSummaryTableBody');
    const tfoot = document.getElementById('debtSummaryTableFoot');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    
    if (debtSummary.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Không có dữ liệu</td></tr>';
        return;
    }
    
    let totalOpeningDebt = 0;
    let totalDebtInPeriod = 0;
    let totalPaidInPeriod = 0;
    let totalRemainingDebt = 0;
    
    debtSummary.forEach((item, index) => {
        totalOpeningDebt += item.openingDebt || 0;
        totalDebtInPeriod += item.debtInPeriod || 0;
        totalPaidInPeriod += item.paidInPeriod || 0;
        totalRemainingDebt += item.remainingDebt || 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.customerCode || 'N/A'}</strong></td>
            <td>${item.customerName || 'N/A'}</td>
            <td>${(item.openingDebt || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>${(item.debtInPeriod || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>${(item.paidInPeriod || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td style="font-weight: bold; color: ${(item.remainingDebt || 0) > 0 ? '#d32f2f' : '#2e7d32'};">
                ${(item.remainingDebt || 0).toLocaleString('vi-VN')} VNĐ
            </td>
            <td>
                <button class="btn-edit" onclick="viewDebtDetail('${item.customerId}')">Xem Chi Tiết</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Dòng tổng cộng
    const footerRow = document.createElement('tr');
    footerRow.innerHTML = `
        <td colspan="3" style="text-align: center; font-weight: bold;">TỔNG CỘNG</td>
        <td style="font-weight: bold;">${totalOpeningDebt.toLocaleString('vi-VN')} VNĐ</td>
        <td style="font-weight: bold;">${totalDebtInPeriod.toLocaleString('vi-VN')} VNĐ</td>
        <td style="font-weight: bold;">${totalPaidInPeriod.toLocaleString('vi-VN')} VNĐ</td>
        <td style="font-weight: bold; color: ${totalRemainingDebt > 0 ? '#d32f2f' : '#2e7d32'};">
            ${totalRemainingDebt.toLocaleString('vi-VN')} VNĐ
        </td>
        <td></td>
    `;
    tfoot.appendChild(footerRow);
}

// Reset filter công nợ
function resetDebtFilter() {
    document.getElementById('debtFromDate').value = '';
    document.getElementById('debtToDate').value = '';
    document.getElementById('debtCustomerCodeFilter').value = '';
    document.getElementById('debtCustomerNameFilter').value = '';
    loadDebtSummary();
}

// Xem chi tiết công nợ khách hàng
async function viewDebtDetail(customerId) {
    const fromDate = document.getElementById('debtFromDate')?.value || '';
    const toDate = document.getElementById('debtToDate')?.value || '';
    
    try {
        const params = new URLSearchParams();
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
        
        let url = `/api/manager/customers/${customerId}/debt`;
        const paramsString = params.toString();
        if (paramsString) {
            url += '?' + paramsString;
        }
        
        console.log('Loading debt detail from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayDebtDetail(data);
            document.getElementById('debtDetailModal').style.display = 'block';
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải chi tiết công nợ'));
        }
    } catch (error) {
        console.error('Error loading debt detail:', error);
        alert('Có lỗi xảy ra khi tải chi tiết công nợ');
    }
}

// Hiển thị chi tiết công nợ trong modal
function displayDebtDetail(data) {
    document.getElementById('debtDetailCustomerCode').textContent = data.customer.code;
    document.getElementById('debtDetailCustomerName').textContent = data.customer.name;
    
    const fromDate = document.getElementById('debtFromDate')?.value || '';
    const toDate = document.getElementById('debtToDate')?.value || '';
    let periodText = 'Tất cả';
    if (fromDate || toDate) {
        const from = fromDate ? new Date(fromDate).toLocaleDateString('vi-VN') : 'Đầu';
        const to = toDate ? new Date(toDate).toLocaleDateString('vi-VN') : 'Cuối';
        periodText = `Từ ${from} đến ${to}`;
    }
    document.getElementById('debtDetailPeriod').textContent = periodText;
    
    document.getElementById('debtDetailOpeningDebt').textContent = (data.openingDebt || 0).toLocaleString('vi-VN');
    document.getElementById('debtDetailClosingDebt').textContent = (data.closingDebt || 0).toLocaleString('vi-VN');
    
    const tbody = document.getElementById('debtDetailTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.debtDetails && data.debtDetails.length > 0) {
        data.debtDetails.forEach((detail, index) => {
            const row = document.createElement('tr');
            const date = detail.date?.toDate ? detail.date.toDate().toLocaleDateString('vi-VN') : 
                        detail.date ? new Date(detail.date).toLocaleDateString('vi-VN') : 'N/A';
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${detail.documentNumber || 'N/A'}</td>
                <td>${date}</td>
                <td>${(detail.debt || 0).toLocaleString('vi-VN')} VNĐ</td>
                <td>${(detail.paid || 0).toLocaleString('vi-VN')} VNĐ</td>
            `;
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Không có giao dịch</td></tr>';
    }
}

// Đóng modal chi tiết công nợ
function closeDebtDetailModal() {
    document.getElementById('debtDetailModal').style.display = 'none';
}

// In bảng tổng hợp công nợ
function printDebtSummary() {
    window.print();
}

// In bảng chi tiết công nợ
function printDebtDetail() {
    const modal = document.getElementById('debtDetailModal');
    const printContent = modal.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    location.reload();
}

// Đóng modal khi click bên ngoài
window.onclick = function(event) {
    const modal = document.getElementById('debtDetailModal');
    if (event.target === modal) {
        closeDebtDetailModal();
    }
}

// ========== NHẬP SỐ DƯ ĐẦU KỲ ==========
// Kiểm tra xem biến đã được khai báo chưa để tránh lỗi khi load nhiều lần
if (typeof allCustomersForBalance === 'undefined') {
    var allCustomersForBalance = [];
}
if (typeof balanceRowCounter === 'undefined') {
    var balanceRowCounter = 0;
}

// Load danh sách khách hàng cho autocomplete
async function loadCustomersForBalance() {
    try {
        const response = await fetch('/api/manager/customers');
        const data = await response.json();
        
        if (data.success) {
            allCustomersForBalance = data.customers.filter(c => c.isActive !== false);
        }
    } catch (error) {
        console.error('Error loading customers for balance:', error);
    }
}

// Thêm dòng mới vào bảng nhập số dư đầu kỳ
function addBalanceRow() {
    const tbody = document.getElementById('balanceInputTableBody');
    if (!tbody) return;
    
    balanceRowCounter++;
    const rowId = `balance-row-${balanceRowCounter}`;
    const rowNumber = tbody.querySelectorAll('tr').length + 1;
    
    const row = document.createElement('tr');
    row.id = rowId;
    row.innerHTML = `
        <td>${rowNumber}</td>
        <td>
            <div class="customer-search-wrapper">
                <input type="text" 
                       class="balance-customer-code" 
                       placeholder="Nhập mã số KH..."
                       data-row-id="${rowId}"
                       onkeyup="searchCustomerByCode(event, '${rowId}')"
                       onfocus="showCustomerAutocomplete(event, 'code', '${rowId}')">
                <div class="customer-autocomplete" id="autocomplete-code-${rowId}"></div>
            </div>
        </td>
        <td>
            <div class="customer-search-wrapper">
                <input type="text" 
                       class="balance-customer-name" 
                       placeholder="Nhập họ tên KH..."
                       data-row-id="${rowId}"
                       onkeyup="searchCustomerByName(event, '${rowId}')"
                       onfocus="showCustomerAutocomplete(event, 'name', '${rowId}')">
                <div class="customer-autocomplete" id="autocomplete-name-${rowId}"></div>
            </div>
        </td>
        <td>
            <input type="text" 
                   class="balance-customer-address" 
                   placeholder="Tự động điền"
                   readonly
                   data-row-id="${rowId}">
        </td>
        <td>
            <input type="number" 
                   class="balance-opening-balance" 
                   placeholder="Nhập số dư đầu kỳ"
                   step="0.01"
                   min="0"
                   data-row-id="${rowId}">
        </td>
        <td>
            <button type="button" class="btn-delete" onclick="removeBalanceRow('${rowId}')">Xóa</button>
        </td>
    `;
    
    tbody.appendChild(row);
    
    // Load customers nếu chưa có
    if (allCustomersForBalance.length === 0) {
        loadCustomersForBalance();
    }
}

// Xóa dòng khỏi bảng
function removeBalanceRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updateBalanceRowNumbers();
    }
}

// Cập nhật số thứ tự các dòng
function updateBalanceRowNumbers() {
    const tbody = document.getElementById('balanceInputTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const firstCell = row.querySelector('td:first-child');
        if (firstCell) {
            firstCell.textContent = index + 1;
        }
    });
}

// Xóa tất cả dòng
function clearBalanceTable() {
    const tbody = document.getElementById('balanceInputTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        balanceRowCounter = 0;
    }
}

// Tìm kiếm khách hàng theo mã số
function searchCustomerByCode(event, rowId) {
    const input = event.target;
    const query = input.value.trim().toUpperCase();
    
    if (!query) {
        hideAutocomplete(`autocomplete-code-${rowId}`);
        return;
    }
    
    const matches = allCustomersForBalance.filter(customer => 
        customer.code?.toUpperCase().includes(query)
    ).slice(0, 10);
    
    showAutocomplete(matches, `autocomplete-code-${rowId}`, rowId, 'code');
}

// Tìm kiếm khách hàng theo tên
function searchCustomerByName(event, rowId) {
    const input = event.target;
    const query = input.value.trim();
    
    if (!query) {
        hideAutocomplete(`autocomplete-name-${rowId}`);
        return;
    }
    
    const matches = allCustomersForBalance.filter(customer => 
        customer.name?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    
    showAutocomplete(matches, `autocomplete-name-${rowId}`, rowId, 'name');
}

// Hiển thị autocomplete
function showAutocomplete(customers, autocompleteId, rowId, type) {
    const autocomplete = document.getElementById(autocompleteId);
    if (!autocomplete) return;
    
    if (customers.length === 0) {
        autocomplete.style.display = 'none';
        return;
    }
    
    autocomplete.innerHTML = '';
    customers.forEach(customer => {
        const item = document.createElement('div');
        item.className = 'customer-autocomplete-item';
        item.innerHTML = `
            <strong>${customer.code}</strong> - ${customer.name}
            ${customer.address ? `<br><small>${customer.address}</small>` : ''}
        `;
        item.onclick = () => selectCustomer(customer, rowId, type);
        autocomplete.appendChild(item);
    });
    
    autocomplete.style.display = 'block';
}

// Ẩn autocomplete
function hideAutocomplete(autocompleteId) {
    const autocomplete = document.getElementById(autocompleteId);
    if (autocomplete) {
        autocomplete.style.display = 'none';
    }
}

// Chọn khách hàng từ autocomplete
function selectCustomer(customer, rowId, type) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    // Điền mã số
    const codeInput = row.querySelector('.balance-customer-code');
    if (codeInput) {
        codeInput.value = customer.code;
        codeInput.setAttribute('data-customer-id', customer.id);
    }
    
    // Điền họ tên
    const nameInput = row.querySelector('.balance-customer-name');
    if (nameInput) {
        nameInput.value = customer.name;
        nameInput.setAttribute('data-customer-id', customer.id);
    }
    
    // Điền địa chỉ
    const addressInput = row.querySelector('.balance-customer-address');
    if (addressInput) {
        addressInput.value = customer.address || '';
    }
    
    // Ẩn autocomplete
    hideAutocomplete(`autocomplete-code-${rowId}`);
    hideAutocomplete(`autocomplete-name-${rowId}`);
}

// Hiển thị autocomplete khi focus
function showCustomerAutocomplete(event, type, rowId) {
    const input = event.target;
    const query = input.value.trim();
    
    if (type === 'code') {
        searchCustomerByCode(event, rowId);
    } else if (type === 'name') {
        searchCustomerByName(event, rowId);
    }
}

// Lưu tất cả số dư đầu kỳ
async function saveAllOpeningBalances() {
    const tbody = document.getElementById('balanceInputTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
        alert('Vui lòng thêm ít nhất một dòng để nhập số dư đầu kỳ');
        return;
    }
    
    const balances = [];
    let hasError = false;
    
    rows.forEach((row, index) => {
        const codeInput = row.querySelector('.balance-customer-code');
        const nameInput = row.querySelector('.balance-customer-name');
        const balanceInput = row.querySelector('.balance-opening-balance');
        
        const customerId = codeInput?.getAttribute('data-customer-id') || nameInput?.getAttribute('data-customer-id');
        const balance = balanceInput?.value;
        
        if (!customerId) {
            alert(`Dòng ${index + 1}: Vui lòng chọn khách hàng`);
            hasError = true;
            return;
        }
        
        if (!balance || parseFloat(balance) < 0) {
            alert(`Dòng ${index + 1}: Vui lòng nhập số dư đầu kỳ hợp lệ`);
            hasError = true;
            return;
        }
        
        balances.push({
            customerId,
            openingBalance: parseFloat(balance),
            customerCode: codeInput?.value || '',
            customerName: nameInput?.value || ''
        });
    });
    
    if (hasError) {
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn lưu số dư đầu kỳ cho ${balances.length} khách hàng?`)) {
        return;
    }
    
    try {
        // Lưu từng khách hàng
        let successCount = 0;
        let errorCount = 0;
        
        for (const balance of balances) {
            try {
                const response = await fetch(`/api/manager/customers/${balance.customerId}/opening-balance`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        openingBalance: balance.openingBalance,
                        note: `Nhập số dư đầu kỳ - ${balance.customerCode}`
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error saving balance for ${balance.customerCode}:`, error);
                errorCount++;
            }
        }
        
        if (successCount > 0) {
            alert(`Đã lưu thành công ${successCount} khách hàng${errorCount > 0 ? `, ${errorCount} khách hàng lỗi` : ''}`);
            clearBalanceTable();
            loadCustomers();
        } else {
            alert('Không thể lưu số dư đầu kỳ. Vui lòng thử lại.');
        }
    } catch (error) {
        console.error('Error saving opening balances:', error);
        alert('Có lỗi xảy ra khi lưu số dư đầu kỳ');
    }
}

// Search customers
async function searchCustomers() {
    const searchInput = document.getElementById('searchCustomerInput');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    
    if (!query) {
        loadCustomers();
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/search?query=${encodeURIComponent(query)}&type=customers`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.results && data.results.customers) {
            // Lọc lại để đảm bảo không có khách hàng đã xóa
            const activeCustomers = data.results.customers.filter(customer => {
                // Chỉ lấy khách hàng đang hoạt động
                return customer.isActive !== false;
            });
            
            // Tính toán lại công nợ cho kết quả tìm kiếm
            const customersWithDebt = await Promise.all(activeCustomers.map(async (customer) => {
                try {
                    const debtResponse = await fetch(`/api/manager/customers/${customer.id}/debt`);
                    if (debtResponse.ok) {
                        const debtData = await debtResponse.json();
                        if (debtData.success) {
                            customer.debt = debtData.closingBalance || 0;
                            customer.openingBalance = debtData.openingBalance || 0;
                        }
                    }
                } catch (e) {
                    console.error('Error loading debt for customer:', e);
                }
                return customer;
            }));
            
            displayCustomers(customersWithDebt);
        } else {
            displayCustomers([]);
        }
    } catch (error) {
        console.error('Error searching customers:', error);
        alert('Có lỗi xảy ra khi tìm kiếm khách hàng');
    }
}

function resetCustomerSearch() {
    const searchInput = document.getElementById('searchCustomerInput');
    if (searchInput) {
        searchInput.value = '';
    }
    loadCustomers();
}


// Delete customer
async function deleteCustomer(customerId) {
    if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/customers/${customerId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa khách hàng thành công!');
            loadCustomers();
            loadCustomerSelects();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa khách hàng'));
        }
    } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Có lỗi xảy ra khi xóa khách hàng');
    }
}

// ========== QUẢN LÝ THANH TOÁN ==========

// Load danh sách khách hàng cho phần thanh toán
async function loadPaymentCustomers() {
    try {
        const response = await fetch('/api/manager/customers');
        const data = await response.json();
        
        if (data.success) {
            // API /api/manager/customers đã tính sẵn công nợ trong customer.debt
            // Sử dụng trực tiếp dữ liệu từ API
            const customersWithDebt = data.customers.map(customer => {
                // Đảm bảo debt được tính đúng (có thể đã có sẵn từ API)
                if (customer.debt === undefined || customer.debt === null) {
                    customer.debt = 0;
                }
                return customer;
            });
            displayPaymentCustomers(customersWithDebt);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải danh sách khách hàng'));
        }
    } catch (error) {
        console.error('Error loading payment customers:', error);
        alert('Có lỗi xảy ra khi tải danh sách khách hàng');
    }
}

// Hiển thị danh sách khách hàng cho phần thanh toán
function displayPaymentCustomers(customers) {
    const tbody = document.getElementById('paymentCustomersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Không có khách hàng nào</td></tr>';
        return;
    }
    
    customers.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${customer.code || 'N/A'}</strong></td>
            <td>${customer.name || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td style="text-align: right; font-weight: 500; color: ${(customer.debt || 0) > 0 ? '#dc3545' : '#28a745'};">${(customer.debt || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-primary" onclick="openAddDebtModal('${customer.id}')" style="margin-right: 5px;">Phát Sinh Nợ</button>
                <button class="btn-primary" onclick="openPayDebtModal('${customer.id}')">Thanh Toán Dư Nợ</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Tìm kiếm khách hàng trong phần thanh toán
async function searchPaymentCustomers() {
    const searchInput = document.getElementById('paymentCustomerSearch');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        loadPaymentCustomers();
        return;
    }
    
    try {
        const response = await fetch('/api/manager/customers');
        const data = await response.json();
        
        if (data.success) {
            // Lọc khách hàng theo query
            const filtered = data.customers.filter(customer => {
                const code = (customer.code || '').toLowerCase();
                const name = (customer.name || '').toLowerCase();
                const phone = (customer.phone || '').toLowerCase();
                return code.includes(query) || name.includes(query) || phone.includes(query);
            });
            
            // API /api/manager/customers đã tính sẵn công nợ trong customer.debt
            // Sử dụng trực tiếp dữ liệu từ API
            const customersWithDebt = filtered.map(customer => {
                // Đảm bảo debt được tính đúng (có thể đã có sẵn từ API)
                if (customer.debt === undefined || customer.debt === null) {
                    customer.debt = 0;
                }
                return customer;
            });
            displayPaymentCustomers(customersWithDebt);
        }
    } catch (error) {
        console.error('Error searching payment customers:', error);
        alert('Có lỗi xảy ra khi tìm kiếm khách hàng');
    }
}

// Reset tìm kiếm
function resetPaymentSearch() {
    const searchInput = document.getElementById('paymentCustomerSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    loadPaymentCustomers();
}

// Mở modal Phát Sinh Nợ
async function openAddDebtModal(customerId) {
    try {
        const response = await fetch(`/api/manager/customers/${customerId}`);
        const data = await response.json();
        
        if (data.success) {
            const customer = data.customer;
            
            // Lấy công nợ hiện tại từ API
            let currentDebt = 0;
            try {
                const debtResponse = await fetch(`/api/manager/customers/${customerId}/debt`);
                if (debtResponse.ok) {
                    const debtData = await debtResponse.json();
                    if (debtData.success) {
                        currentDebt = debtData.closingBalance || 0;
                    }
                }
            } catch (e) {
                console.error('Error loading debt:', e);
                // Nếu API không hoạt động, tính từ customer data
                currentDebt = customer.debt || 0;
            }
            
            document.getElementById('addDebtCustomerId').value = customerId;
            document.getElementById('addDebtCustomerName').value = customer.name || 'N/A';
            document.getElementById('addDebtCustomerCode').value = customer.code || 'N/A';
            document.getElementById('addDebtCurrentDebt').value = currentDebt.toLocaleString('vi-VN') + ' VNĐ';
            document.getElementById('addDebtAmount').value = '';
            document.getElementById('addDebtNote').value = '';
            
            const modal = document.getElementById('addDebtModal');
            if (modal) {
                modal.style.display = 'block';
            }
        } else {
            alert('Không tìm thấy khách hàng');
        }
    } catch (error) {
        console.error('Error opening add debt modal:', error);
        alert('Có lỗi xảy ra khi tải thông tin khách hàng');
    }
}

// Đóng modal Phát Sinh Nợ
function closeAddDebtModal() {
    const modal = document.getElementById('addDebtModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Mở modal Thanh Toán Dư Nợ
async function openPayDebtModal(customerId) {
    try {
        const response = await fetch(`/api/manager/customers/${customerId}`);
        const data = await response.json();
        
        if (data.success) {
            const customer = data.customer;
            
            // Lấy công nợ hiện tại từ API
            let currentDebt = 0;
            try {
                const debtResponse = await fetch(`/api/manager/customers/${customerId}/debt`);
                if (debtResponse.ok) {
                    const debtData = await debtResponse.json();
                    if (debtData.success) {
                        currentDebt = debtData.closingBalance || 0;
                    }
                }
            } catch (e) {
                console.error('Error loading debt:', e);
                // Nếu API không hoạt động, tính từ customer data
                currentDebt = customer.debt || 0;
            }
            
            document.getElementById('payDebtCustomerId').value = customerId;
            document.getElementById('payDebtCustomerName').value = customer.name || 'N/A';
            document.getElementById('payDebtCustomerCode').value = customer.code || 'N/A';
            document.getElementById('payDebtCurrentDebt').value = currentDebt.toLocaleString('vi-VN') + ' VNĐ';
            document.getElementById('payDebtAmount').value = '';
            document.getElementById('payDebtNote').value = '';
            
            const modal = document.getElementById('payDebtModal');
            if (modal) {
                modal.style.display = 'block';
            }
        } else {
            alert('Không tìm thấy khách hàng');
        }
    } catch (error) {
        console.error('Error opening pay debt modal:', error);
        alert('Có lỗi xảy ra khi tải thông tin khách hàng');
    }
}

// Đóng modal Thanh Toán Dư Nợ
function closePayDebtModal() {
    const modal = document.getElementById('payDebtModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Đóng modal In Phiếu Thu
function closePrintReceiptModal() {
    const modal = document.getElementById('printReceiptModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export functions để có thể gọi từ HTML
window.loadPaymentCustomers = loadPaymentCustomers;
window.displayPaymentCustomers = displayPaymentCustomers;
window.searchPaymentCustomers = searchPaymentCustomers;
window.resetPaymentSearch = resetPaymentSearch;
window.openAddDebtModal = openAddDebtModal;
window.closeAddDebtModal = closeAddDebtModal;
window.openPayDebtModal = openPayDebtModal;
window.closePayDebtModal = closePayDebtModal;
window.closePrintReceiptModal = closePrintReceiptModal;


