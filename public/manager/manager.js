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
                <button class="btn-update" onclick="showUpdateOrderModal('${order.id}')">Cập nhật</button>
            </div>
        `;
        ordersList.appendChild(orderDiv);
    });
}

async function confirmOrder(orderId) {
    try {
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
    
    try {
        const response = await fetch(`/api/manager/inventory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity: parseInt(quantity) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật tồn kho thành công!');
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
        </div>
    `;
}

// Initialize
loadOrders();
loadInventory();


