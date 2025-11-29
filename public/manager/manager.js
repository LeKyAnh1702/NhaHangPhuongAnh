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
    ordersList.innerHTML = '';
    
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

// Load inventory
async function loadInventory() {
    try {
        const response = await fetch('/api/manager/inventory');
        const data = await response.json();
        
        if (data.success) {
            displayInventory(data.inventory);
            displayWarnings(data.warnings);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function displayInventory(inventory) {
    const inventoryList = document.getElementById('inventoryList');
    inventoryList.innerHTML = '';
    
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
    warningsDiv.innerHTML = '';
    
    if (warnings.length > 0) {
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

// Initialize
loadPendingOrders();
loadInventory();


