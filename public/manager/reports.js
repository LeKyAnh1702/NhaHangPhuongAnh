// ========== QUẢN LÝ BÁO CÁO ==========

// Switch tab
function switchReportTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    const tabButtons = document.querySelectorAll('.tab');
    const tabIndexMap = {
        'invoices': 0,
        'revenue': 1
    };
    const index = tabIndexMap[tabName];
    if (index !== undefined && tabButtons[index]) {
        tabButtons[index].classList.add('active');
    }
    
    // Load data khi chuyển tab
    if (tabName === 'invoices') {
        loadInvoices();
    }
}

// ========== DANH SÁCH HÓA ĐƠN ==========

// Load danh sách hóa đơn
async function loadInvoices() {
    try {
        const startDate = document.getElementById('invoiceStartDate').value;
        const endDate = document.getElementById('invoiceEndDate').value;
        
        let url = '/api/manager/reports/invoices';
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayInvoices(data.invoices || []);
            updateInvoicesSummary(data.summary || {});
        } else {
            console.error('Error loading invoices:', data.error);
            alert('Có lỗi xảy ra khi tải danh sách hóa đơn');
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
        alert('Có lỗi xảy ra khi tải danh sách hóa đơn');
    }
}

// Hiển thị danh sách hóa đơn
function displayInvoices(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    tbody.innerHTML = '';
    
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Không có hóa đơn nào</td></tr>';
        return;
    }
    
    invoices.forEach((invoice, index) => {
        const row = document.createElement('tr');
        
        // Format ngày
        let dateStr = 'N/A';
        if (invoice.date) {
            const date = invoice.date instanceof Date ? invoice.date : new Date(invoice.date);
            if (!isNaN(date.getTime())) {
                dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            }
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${dateStr}</td>
            <td>${invoice.orderNumber || 'N/A'}</td>
            <td>${invoice.customerName || 'Khách lẻ'}</td>
            <td>${invoice.customerPhone || 'N/A'}</td>
            <td>${(invoice.amount || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-link" onclick="viewInvoiceDetail('${invoice.orderId}')">Chi tiết</button>
            </td>
            <td>
                <button class="btn-delete" onclick="deleteInvoice('${invoice.orderId}', '${invoice.customerId || ''}')">Xóa</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Cập nhật tổng hợp doanh thu
function updateInvoicesSummary(summary) {
    document.getElementById('totalInvoices').textContent = summary.totalInvoices || 0;
    document.getElementById('totalRevenue').textContent = (summary.totalRevenue || 0).toLocaleString('vi-VN') + ' VNĐ';
}

// Xóa hóa đơn
async function deleteInvoice(orderId, customerId) {
    if (!confirm('Bạn có chắc chắn muốn xóa hóa đơn này? Hành động này không thể hoàn tác. Điểm tích lũy của khách hàng sẽ được tính lại.')) {
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
            // Nếu có customerId, tính lại điểm tích lũy
            if (customerId) {
                try {
                    const pointsResponse = await fetch('/api/manager/points/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            customerId: customerId
                            // Không cần amount vì API sẽ tự tính lại từ tổng tất cả hóa đơn
                        })
                    });
                    
                    const pointsData = await pointsResponse.json();
                    if (pointsData.success) {
                        console.log('Points recalculated:', pointsData.points);
                    }
                } catch (pointsError) {
                    console.error('Error recalculating points:', pointsError);
                    // Không báo lỗi cho user vì xóa hóa đơn đã thành công
                }
            }
            
            alert('Xóa hóa đơn thành công! Tổng doanh thu và điểm tích lũy đã được cập nhật.');
            loadInvoices(); // Reload danh sách để cập nhật summary
        } else {
            alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Có lỗi xảy ra khi xóa hóa đơn: ' + error.message);
    }
}

// Reset filter hóa đơn
function resetInvoiceFilter() {
    document.getElementById('invoiceStartDate').value = '';
    document.getElementById('invoiceEndDate').value = '';
    loadInvoices();
}

// Xem chi tiết hóa đơn
async function viewInvoiceDetail(orderId) {
    try {
        const response = await fetch(`/api/manager/orders/${orderId}`);
        const data = await response.json();
        
        if (data.success && data.order) {
            displayInvoiceDetail(data.order);
            document.getElementById('invoiceDetailModal').style.display = 'block';
        } else {
            alert('Không tìm thấy thông tin hóa đơn');
        }
    } catch (error) {
        console.error('Error loading invoice detail:', error);
        alert('Có lỗi xảy ra khi tải chi tiết hóa đơn');
    }
}

// Hiển thị chi tiết hóa đơn
function displayInvoiceDetail(order) {
    const body = document.getElementById('invoiceDetailBody');
    
    // Format ngày
    let dateStr = 'N/A';
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
        if (!isNaN(date.getTime())) {
            dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
    }
    
    // Format số bàn
    let tableInfo = 'N/A';
    if (order.tableNumbers && Array.isArray(order.tableNumbers) && order.tableNumbers.length > 0) {
        tableInfo = order.tableNumbers.join(', ');
    } else if (order.tableNumber) {
        tableInfo = order.tableNumber.toString();
    }
    
    const customerName = order.customerName || (order.customer && order.customer.name) || 'Khách lẻ';
    const customerPhone = order.customerPhone || (order.customer && order.customer.phone) || 'N/A';
    
    const items = order.items || [];
    const subtotal = order.total || order.finalTotal || 0;
    const discount = order.discount || 0;
    const finalTotal = order.finalTotal || subtotal;
    
    let itemsHtml = '';
    if (items.length > 0) {
        items.forEach((item, index) => {
            const quantity = item.quantity || 1;
            const price = item.price || 0;
            const total = quantity * price;
            itemsHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.name || item.menuItemName || 'N/A'}</td>
                    <td>${item.unit || 'Đĩa'}</td>
                    <td>${quantity}</td>
                    <td>${price.toLocaleString('vi-VN')}</td>
                    <td>${total.toLocaleString('vi-VN')}</td>
                </tr>
            `;
        });
    } else {
        itemsHtml = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Không có món nào</td></tr>';
    }
    
    body.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p><strong>Hộ kinh doanh:</strong> Lê Kỳ Anh, địa chỉ tại Sơn Dương, T. Tuyên Quang.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <p><strong>Người mua:</strong> ${customerName}</p>
            <p><strong>SĐT:</strong> ${customerPhone}</p>
            <p><strong>Ngày lập:</strong> ${dateStr}</p>
            <p><strong>Số Order:</strong> ${order.orderNumber || 'N/A'}</p>
            <p><strong>Số bàn:</strong> ${tableInfo}</p>
        </div>
        
        <table class="invoice-detail-table">
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
                ${itemsHtml}
            </tbody>
        </table>
        
        <div class="invoice-detail-summary">
            <p>
                <span>Tổng cộng thành tiền hàng hóa:</span>
                <strong>${subtotal.toLocaleString('vi-VN')} VNĐ</strong>
            </p>
            <p>
                <span>Tiền chiết khấu:</span>
                <strong>${discount.toLocaleString('vi-VN')} VNĐ</strong>
            </p>
            <p>
                <span>Tổng thanh toán (Thực nhận):</span>
                <strong style="font-size: 1.2em;">${finalTotal.toLocaleString('vi-VN')} VNĐ</strong>
            </p>
        </div>
    `;
}

// Đóng modal chi tiết hóa đơn
function closeInvoiceDetailModal() {
    document.getElementById('invoiceDetailModal').style.display = 'none';
}

// ========== BÁO CÁO DOANH THU ==========

// Xử lý thay đổi loại báo cáo
function handleReportTypeChange() {
    const reportType = document.getElementById('reportType').value;
    const tableFilterGroup = document.getElementById('tableFilterGroup');
    const dishFilterGroup = document.getElementById('dishFilterGroup');
    
    if (reportType === 'table') {
        tableFilterGroup.style.display = 'flex';
        dishFilterGroup.style.display = 'none';
        loadTablesForReport();
    } else if (reportType === 'dish') {
        tableFilterGroup.style.display = 'none';
        dishFilterGroup.style.display = 'flex';
    } else {
        tableFilterGroup.style.display = 'none';
        dishFilterGroup.style.display = 'none';
    }
}

// Load danh sách bàn cho báo cáo
async function loadTablesForReport() {
    try {
        const response = await fetch('/api/manager/tables');
        const data = await response.json();
        
        const select = document.getElementById('reportTableFilter');
        select.innerHTML = '<option value="">Tất cả bàn</option>';
        
        if (data.success && data.tables) {
            data.tables.forEach(table => {
                const option = document.createElement('option');
                option.value = table.number;
                option.textContent = `Bàn ${table.number}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading tables:', error);
    }
}

// Tạo báo cáo doanh thu
async function generateRevenueReport() {
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const tableFilter = document.getElementById('reportTableFilter').value;
    const dishTypeFilter = document.getElementById('dishTypeFilter').value;
    
    try {
        let url = '/api/manager/reports/revenue';
        const params = new URLSearchParams();
        params.append('type', reportType);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (tableFilter) params.append('tableNumber', tableFilter);
        if (dishTypeFilter) params.append('dishType', dishTypeFilter);
        
        url += '?' + params.toString();
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayRevenueReport(data.report, reportType);
        } else {
            alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Có lỗi xảy ra khi tạo báo cáo');
    }
}

// Hiển thị báo cáo doanh thu
function displayRevenueReport(report, type) {
    const results = document.getElementById('reportResults');
    
    if (type === 'time') {
        // Báo cáo theo thời gian
        let html = `
            <h3>Báo Cáo Doanh Thu Theo Thời Gian</h3>
            <div class="revenue-summary-grid" style="margin-top: 20px;">
                <div class="revenue-card">
                    <div class="revenue-card-label">Tổng Số Đơn</div>
                    <div class="revenue-card-value">${report.totalOrders || 0}</div>
                </div>
                <div class="revenue-card">
                    <div class="revenue-card-label">Tổng Doanh Thu</div>
                    <div class="revenue-card-value">${(report.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ</div>
                </div>
            </div>
        `;
        
        if (report.byDate && Object.keys(report.byDate).length > 0) {
            html += '<table class="invoices-table" style="margin-top: 20px;"><thead><tr><th>Ngày</th><th>Số Đơn</th><th>Doanh Thu</th></tr></thead><tbody>';
            Object.entries(report.byDate).sort((a, b) => new Date(a[0]) - new Date(b[0])).forEach(([date, data]) => {
                html += `<tr><td>${date}</td><td>${data.orders || 0}</td><td style="text-align: right;">${(data.revenue || 0).toLocaleString('vi-VN')} VNĐ</td></tr>`;
            });
            html += '</tbody></table>';
        }
        
        results.innerHTML = html;
    } else if (type === 'table') {
        // Báo cáo theo bàn
        let html = `
            <h3>Báo Cáo Doanh Thu Theo Bàn</h3>
            <div class="revenue-summary-grid" style="margin-top: 20px;">
                <div class="revenue-card">
                    <div class="revenue-card-label">Tổng Số Đơn</div>
                    <div class="revenue-card-value">${report.totalOrders || 0}</div>
                </div>
                <div class="revenue-card">
                    <div class="revenue-card-label">Tổng Doanh Thu</div>
                    <div class="revenue-card-value">${(report.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ</div>
                </div>
            </div>
        `;
        
        if (report.byTable && Object.keys(report.byTable).length > 0) {
            html += '<table class="invoices-table" style="margin-top: 20px;"><thead><tr><th>Bàn</th><th>Số Đơn</th><th>Doanh Thu</th></tr></thead><tbody>';
            Object.entries(report.byTable).sort((a, b) => {
                const tableA = a[0] === 'Không có bàn' ? 9999 : parseInt(a[0]);
                const tableB = b[0] === 'Không có bàn' ? 9999 : parseInt(b[0]);
                return tableA - tableB;
            }).forEach(([table, data]) => {
                html += `<tr><td>Bàn ${table}</td><td>${data.orders || 0}</td><td style="text-align: right;">${(data.revenue || 0).toLocaleString('vi-VN')} VNĐ</td></tr>`;
            });
            html += '</tbody></table>';
        }
        
        results.innerHTML = html;
    } else if (type === 'dish') {
        // Báo cáo theo món/combo
        let html = `
            <h3>Báo Cáo Doanh Thu Theo Combo/Món Ăn</h3>
            <div class="revenue-summary-grid" style="margin-top: 20px;">
                <div class="revenue-card">
                    <div class="revenue-card-label">Tổng Số Đơn</div>
                    <div class="revenue-card-value">${report.totalOrders || 0}</div>
                </div>
                <div class="revenue-card">
                    <div class="revenue-card-label">Tổng Doanh Thu</div>
                    <div class="revenue-card-value">${(report.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ</div>
                </div>
            </div>
        `;
        
        if (report.byDish && Object.keys(report.byDish).length > 0) {
            html += '<table class="invoices-table" style="margin-top: 20px;"><thead><tr><th>Món/Combo</th><th>Số Lượng</th><th>Doanh Thu</th></tr></thead><tbody>';
            Object.entries(report.byDish).sort((a, b) => (b[1].revenue || 0) - (a[1].revenue || 0)).forEach(([dish, data]) => {
                html += `<tr><td>${dish}</td><td>${data.quantity || 0}</td><td style="text-align: right;">${(data.revenue || 0).toLocaleString('vi-VN')} VNĐ</td></tr>`;
            });
            html += '</tbody></table>';
        }
        
        results.innerHTML = html;
    }
}

// Reset filter báo cáo
function resetRevenueFilter() {
    document.getElementById('reportType').value = 'time';
    document.getElementById('reportStartDate').value = '';
    document.getElementById('reportEndDate').value = '';
    document.getElementById('reportTableFilter').value = '';
    document.getElementById('dishTypeFilter').value = 'all';
    handleReportTypeChange();
    document.getElementById('reportResults').innerHTML = '';
}

// Load invoices on page load
document.addEventListener('DOMContentLoaded', function() {
    loadInvoices();
});

