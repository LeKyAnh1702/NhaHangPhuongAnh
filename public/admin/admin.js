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

// Load combos
async function loadCombos() {
    try {
        const response = await fetch('/api/admin/combos');
        const data = await response.json();
        
        if (data.success) {
            displayCombos(data.combos);
        }
    } catch (error) {
        console.error('Error loading combos:', error);
    }
}

function displayCombos(combos) {
    const combosList = document.getElementById('combosList');
    if (!combosList) return;
    
    combosList.innerHTML = '';
    combos.forEach(combo => {
        const comboDiv = document.createElement('div');
        comboDiv.className = 'combo-item';
        comboDiv.innerHTML = `
            <h3>${combo.name}</h3>
            <p>${combo.description || ''}</p>
            <p>Giá: ${combo.price.toLocaleString()} VNĐ</p>
            <p>Số món: ${combo.items ? combo.items.length : 0}</p>
            <button onclick="editCombo('${combo.id}')">Sửa</button>
            <button onclick="deleteCombo('${combo.id}')">Xóa</button>
        `;
        combosList.appendChild(comboDiv);
    });
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

// Load users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `
            <h3>${user.name || user.email}</h3>
            <p>Email: ${user.email}</p>
            <p>Role: ${user.role}</p>
            <p>Điểm: ${user.points || 0}</p>
            <button onclick="editUser('${user.id}')">Sửa</button>
            <button onclick="deleteUser('${user.id}')">Xóa</button>
        `;
        usersList.appendChild(userDiv);
    });
}

// Load suppliers
async function loadSuppliers() {
    try {
        const response = await fetch('/api/admin/suppliers');
        const data = await response.json();
        
        if (data.success) {
            displaySuppliers(data.suppliers);
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

function displaySuppliers(suppliers) {
    const suppliersList = document.getElementById('suppliersList');
    if (!suppliersList) return;
    
    suppliersList.innerHTML = '';
    suppliers.forEach(supplier => {
        const supplierDiv = document.createElement('div');
        supplierDiv.className = 'supplier-item';
        supplierDiv.innerHTML = `
            <h3>${supplier.name}</h3>
            <p>Liên hệ: ${supplier.contact || 'N/A'}</p>
            <p>SĐT: ${supplier.phone || 'N/A'}</p>
            <p>Email: ${supplier.email || 'N/A'}</p>
            <button onclick="editSupplier('${supplier.id}')">Sửa</button>
        `;
        suppliersList.appendChild(supplierDiv);
    });
}

// Load vouchers
async function loadVouchers() {
    try {
        const response = await fetch('/api/admin/vouchers');
        const data = await response.json();
        
        if (data.success) {
            displayVouchers(data.vouchers);
        }
    } catch (error) {
        console.error('Error loading vouchers:', error);
    }
}

function displayVouchers(vouchers) {
    const vouchersList = document.getElementById('vouchersList');
    if (!vouchersList) return;
    
    vouchersList.innerHTML = '';
    vouchers.forEach(voucher => {
        const voucherDiv = document.createElement('div');
        voucherDiv.className = 'voucher-item';
        voucherDiv.innerHTML = `
            <h3>${voucher.code}</h3>
            <p>Giảm: ${voucher.discount}${voucher.discountType === 'percent' ? '%' : ' VNĐ'}</p>
            <p>Đã dùng: ${voucher.usedCount || 0}/${voucher.usageLimit || '∞'}</p>
            <p>Hết hạn: ${voucher.expiryDate ? new Date(voucher.expiryDate.toDate()).toLocaleDateString('vi-VN') : 'Không'}</p>
            <button onclick="editVoucher('${voucher.id}')">Sửa</button>
        `;
        vouchersList.appendChild(voucherDiv);
    });
}

// Load inventory logs
async function loadInventoryLogs() {
    try {
        const response = await fetch('/api/admin/inventory/logs');
        const data = await response.json();
        
        if (data.success) {
            displayInventoryLogs(data.logs);
        }
    } catch (error) {
        console.error('Error loading inventory logs:', error);
    }
}

function displayInventoryLogs(logs) {
    const logsList = document.getElementById('inventoryLogsList');
    if (!logsList) return;
    
    logsList.innerHTML = '';
    logs.forEach(log => {
        const logDiv = document.createElement('div');
        logDiv.className = 'log-item';
        logDiv.innerHTML = `
            <p><strong>${log.type === 'import' ? 'Nhập' : log.type === 'export' ? 'Xuất' : 'Điều chỉnh'}</strong></p>
            <p>Số lượng: ${log.quantity}</p>
            <p>Lý do: ${log.reason || log.note || 'N/A'}</p>
            <p>Ngày: ${new Date(log.createdAt?.toDate()).toLocaleString('vi-VN')}</p>
        `;
        logsList.appendChild(logDiv);
    });
}

// Initialize
loadInventory();
loadMenu();
loadCombos();
loadTables();
loadUsers();
loadSuppliers();
loadVouchers();


