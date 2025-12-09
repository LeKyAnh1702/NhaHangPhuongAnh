// ========== QUẢN LÝ CẢNH BÁO TỒN KHO ==========

// Load danh sách cảnh báo
async function loadAlerts() {
    try {
        const response = await fetch('/api/manager/inventory-alerts');
        const data = await response.json();
        
        if (data.success) {
            displayAlerts(data.alerts || []);
            updateSummary(data.alerts || []);
        } else {
            console.error('Error loading alerts:', data.error);
            alert('Có lỗi xảy ra khi tải danh sách cảnh báo');
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
        alert('Có lỗi xảy ra khi tải danh sách cảnh báo');
    }
}

// Hiển thị danh sách cảnh báo
function displayAlerts(alerts) {
    const tbody = document.getElementById('alertsTableBody');
    tbody.innerHTML = '';
    
    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-alerts">Không có cảnh báo tồn kho</td></tr>';
        return;
    }
    
    alerts.forEach((alert, index) => {
        const row = document.createElement('tr');
        
        // Xác định class cho status badge
        const statusClass = alert.status === 'out' ? 'out' : 'low';
        const statusText = alert.status === 'out' ? 'Đã hết' : 'Sắp hết';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${alert.materialCode || 'N/A'}</td>
            <td>${alert.materialName || 'Unknown'}</td>
            <td>${alert.unit || 'N/A'}</td>
            <td>${alert.currentStock || 0}</td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Cập nhật tổng hợp cảnh báo
function updateSummary(alerts) {
    const redAlerts = alerts.filter(a => a.status === 'out');
    const yellowAlerts = alerts.filter(a => a.status === 'low');
    
    document.getElementById('redAlertsCount').textContent = redAlerts.length;
    document.getElementById('yellowAlertsCount').textContent = yellowAlerts.length;
}

// Load alerts on page load
document.addEventListener('DOMContentLoaded', function() {
    loadAlerts();
    
    // Tự động refresh mỗi 30 giây
    setInterval(loadAlerts, 30000);
});

