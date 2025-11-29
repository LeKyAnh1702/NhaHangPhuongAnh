// Load inventory
async function loadInventory() {
    try {
        const response = await fetch('/api/admin/inventory');
        const data = await response.json();
        
        if (data.success) {
            displayInventory(data.inventory);
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
                <p>Giá: ${(item.price || 0).toLocaleString()} VNĐ</p>
                <p>Nhà cung cấp: ${item.supplier || 'N/A'}</p>
            </div>
        `;
        inventoryList.appendChild(itemDiv);
    });
}

// Load menu
async function loadMenu() {
    try {
        const response = await fetch('/api/admin/menu');
        const data = await response.json();
        
        if (data.success) {
            displayMenu(data.menu);
        }
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}

function displayMenu(menu) {
    const menuList = document.getElementById('menuList');
    menuList.innerHTML = '';
    
    menu.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'menu-item';
        itemDiv.innerHTML = `
            <img src="${item.imageUrl || '../images/placeholder.jpg'}" alt="${item.name}">
            <h3>${item.name}</h3>
            <p>${item.description || ''}</p>
            <p>Giá: ${item.price.toLocaleString()} VNĐ</p>
            <p>Danh mục: ${item.category || 'N/A'}</p>
            <button onclick="editMenu('${item.id}')">Sửa</button>
            <button onclick="deleteMenu('${item.id}')">Xóa</button>
        `;
        menuList.appendChild(itemDiv);
    });
}

// Load tables
async function loadTables() {
    try {
        const response = await fetch('/api/admin/tables');
        const data = await response.json();
        
        if (data.success) {
            displayTables(data.tables);
        }
    } catch (error) {
        console.error('Error loading tables:', error);
    }
}

function displayTables(tables) {
    const tablesList = document.getElementById('tablesList');
    tablesList.innerHTML = '';
    
    tables.forEach(table => {
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table-item';
        tableDiv.innerHTML = `
            <h3>Bàn ${table.number}</h3>
            <p>Sức chứa: ${table.capacity} người</p>
            <p>Vị trí: ${table.location || 'N/A'}</p>
            <p>Trạng thái: ${table.status}</p>
            <button onclick="editTable('${table.id}')">Sửa</button>
        `;
        tablesList.appendChild(tableDiv);
    });
}

async function showRevenueReport() {
    const startDate = prompt('Ngày bắt đầu (YYYY-MM-DD):');
    const endDate = prompt('Ngày kết thúc (YYYY-MM-DD):');
    
    try {
        const response = await fetch(`/api/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();
        
        if (data.success) {
            displayRevenueReport(data.report);
        }
    } catch (error) {
        console.error('Error loading revenue report:', error);
    }
}

function displayRevenueReport(report) {
    const reportResults = document.getElementById('reportResults');
    reportResults.innerHTML = `
        <div class="report-results">
            <h3>Báo Cáo Doanh Thu</h3>
            <p>Tổng doanh thu: <strong>${report.totalRevenue.toLocaleString()} VNĐ</strong></p>
            <p>Tổng số đơn: <strong>${report.totalOrders}</strong></p>
            <h4>Doanh thu theo ngày:</h4>
            <ul>
                ${Object.entries(report.dailyRevenue).map(([date, revenue]) => 
                    `<li>${date}: ${revenue.toLocaleString()} VNĐ</li>`
                ).join('')}
            </ul>
        </div>
    `;
}

async function showInventoryReport() {
    try {
        const response = await fetch('/api/admin/reports/inventory');
        const data = await response.json();
        
        if (data.success) {
            displayInventoryReport(data.report);
        }
    } catch (error) {
        console.error('Error loading inventory report:', error);
    }
}

function displayInventoryReport(report) {
    const reportResults = document.getElementById('reportResults');
    reportResults.innerHTML = `
        <div class="report-results">
            <h3>Báo Cáo Tồn Kho</h3>
            <p>Tổng số mặt hàng: <strong>${report.totalItems}</strong></p>
            <p>Sắp hết hàng: <strong>${report.lowStock}</strong></p>
            <p>Hết hàng: <strong>${report.outOfStock}</strong></p>
            <p>Tổng giá trị tồn kho: <strong>${report.totalValue.toLocaleString()} VNĐ</strong></p>
            ${report.warnings.length > 0 ? `
                <h4>Cảnh báo:</h4>
                <ul>
                    ${report.warnings.map(item => 
                        `<li>${item.name}: ${item.quantity} ${item.unit || ''}</li>`
                    ).join('')}
                </ul>
            ` : ''}
        </div>
    `;
}

// Initialize
loadInventory();
loadMenu();
loadTables();


