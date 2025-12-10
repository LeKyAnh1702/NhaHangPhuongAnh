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
    if (!inventoryList) return;
    
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
        console.log('Fetching users from API...');
        const response = await fetch('/api/admin/users');
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Users data:', data);
        
        if (data.success) {
            console.log('Displaying users, count:', data.users?.length || 0);
            displayUsers(data.users);
        } else {
            console.error('Failed to load users:', data.error);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(users) {
    console.log('displayUsers called with', users?.length || 0, 'users');
    const usersTableBody = document.getElementById('usersTableBody');
    if (!usersTableBody) {
        console.error('usersTableBody element not found!');
        return;
    }
    
    usersTableBody.innerHTML = '';
    
    if (users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Chưa có người dùng nào</td></tr>';
        return;
    }
    
    users.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // Chức vụ hiển thị
        const roleText = {
            'admin': 'Admin',
            'manager': 'Quản lý',
            'customer': 'Khách hàng'
        };
        
        // Trạng thái
        const statusText = user.isActive !== false ? 'Hoạt động' : 'Vô hiệu hóa';
        const statusClass = user.isActive !== false ? 'status-active' : 'status-inactive';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.name || 'N/A'}</td>
            <td><span class="role-badge role-${user.role}">${roleText[user.role] || user.role}</span></td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.phone || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn-edit" onclick="editUser('${user.id}')">Sửa</button>
                <button class="btn-delete" onclick="deleteUser('${user.id}')">Xóa</button>
            </td>
        `;
        usersTableBody.appendChild(row);
    });
}

// Biến để track chế độ edit
let currentEditUserId = null;

// Form submit handler - Người dùng (sẽ được gắn trong DOMContentLoaded chính)
function setupUserForm() {
    const userForm = document.getElementById('userForm');
    if (userForm && !userForm.hasAttribute('data-listener-attached')) {
        userForm.setAttribute('data-listener-attached', 'true');
        console.log('Setting up user form listener');
        userForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('User form submitted');
            
            if (currentEditUserId) {
                // Đang ở chế độ edit
                await updateUser(currentEditUserId);
            } else {
                // Đang ở chế độ thêm mới
                const name = document.getElementById('userName').value.trim();
                const email = document.getElementById('userEmail').value.trim();
                const role = document.getElementById('userRole').value;
                const phone = document.getElementById('userPhone').value.trim();
                const password = document.getElementById('userPassword').value;
                
                if (!name || !email || !role || !password) {
                    alert('Vui lòng điền đầy đủ thông tin bắt buộc');
                    return;
                }
                
                try {
                    const response = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name,
                            email,
                            role,
                            phone,
                            password
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('Thêm người dùng thành công!');
                        userForm.reset();
                        loadUsers();
                    } else {
                        alert('Lỗi: ' + (data.error || 'Không thể thêm người dùng'));
                    }
                } catch (error) {
                    console.error('Error adding user:', error);
                    alert('Có lỗi xảy ra khi thêm người dùng: ' + error.message);
                }
            }
        });
    }
    // Không cần log nếu form không tồn tại (có thể đang ở trang khác)
}

// Sửa người dùng
async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            
            // Điền form với dữ liệu hiện tại
            document.getElementById('userName').value = user.name || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userRole').value = user.role || '';
            document.getElementById('userPhone').value = user.phone || '';
            document.getElementById('userPassword').value = ''; // Không hiển thị password
            
            // Đổi form thành chế độ sửa
            currentEditUserId = userId;
            const form = document.getElementById('userForm');
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Cập Nhật Người Dùng';
            
            // Scroll to form
            document.getElementById('userForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Không tìm thấy người dùng');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        alert('Có lỗi xảy ra khi tải thông tin người dùng');
    }
}

async function updateUser(userId) {
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const role = document.getElementById('userRole').value;
    const phone = document.getElementById('userPhone').value.trim();
    const password = document.getElementById('userPassword').value;
    
    if (!name || !email || !role) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    const updateData = { name, email, role, phone };
    if (password) {
        updateData.password = password;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật người dùng thành công!');
            document.getElementById('userForm').reset();
            currentEditUserId = null;
            const submitBtn = document.querySelector('#userForm button[type="submit"]');
            submitBtn.textContent = 'Thêm Người Dùng';
            loadUsers();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể cập nhật'));
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Có lỗi xảy ra khi cập nhật người dùng');
    }
}

// Xóa người dùng
async function deleteUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa người dùng thành công!');
            loadUsers();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa người dùng'));
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Có lỗi xảy ra khi xóa người dùng');
    }
}

function showUserModal() {
    // Reset form về chế độ thêm mới
    currentEditUserId = null;
    document.getElementById('userForm').reset();
    const submitBtn = document.querySelector('#userForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Thêm Người Dùng';
    }
    document.getElementById('userForm').scrollIntoView({ behavior: 'smooth' });
}

// Biến để track chế độ edit supplier
let currentEditSupplierId = null;

// Load suppliers
async function loadSuppliers() {
    try {
        console.log('Fetching suppliers from API...');
        const response = await fetch('/api/admin/suppliers');
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Suppliers data:', data);
        
        if (data.success) {
            console.log('Displaying suppliers, count:', data.suppliers?.length || 0);
            // Tính công nợ cho mỗi supplier
            const suppliersWithDebt = await Promise.all(data.suppliers.map(async (supplier) => {
                try {
                    const debtResponse = await fetch(`/api/admin/suppliers/${supplier.id}/debt`);
                    if (debtResponse.ok) {
                        const debtData = await debtResponse.json();
                        if (debtData.success) {
                            supplier.debt = debtData.closingBalance || 0;
                            supplier.openingBalance = debtData.openingBalance || 0;
                        }
                    }
                } catch (e) {
                    console.error('Error loading debt for supplier:', e);
                    supplier.debt = 0;
                    supplier.openingBalance = supplier.openingBalance || 0;
                }
                return supplier;
            }));
            displaySuppliers(suppliersWithDebt);
        } else {
            console.error('Failed to load suppliers:', data.error);
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

function displaySuppliers(suppliers) {
    console.log('displaySuppliers called with', suppliers?.length || 0, 'suppliers');
    const suppliersTableBody = document.getElementById('suppliersTableBody');
    if (!suppliersTableBody) {
        console.error('suppliersTableBody element not found!');
        return;
    }
    if (!suppliersTableBody) return;
    
    suppliersTableBody.innerHTML = '';
    
    if (suppliers.length === 0) {
        suppliersTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;">Chưa có nhà cung cấp nào</td></tr>';
        return;
    }
    
    // Sắp xếp theo mã số
    suppliers.sort((a, b) => (a.code || 0) - (b.code || 0));
    
    suppliers.forEach((supplier, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${supplier.code || 'N/A'}</strong></td>
            <td>${supplier.name || 'N/A'}</td>
            <td>${supplier.company || 'N/A'}</td>
            <td>${supplier.address || 'N/A'}</td>
            <td>${supplier.taxCode || 'N/A'}</td>
            <td>${supplier.bankAccount || 'N/A'}</td>
            <td>${supplier.bankName || 'N/A'}</td>
            <td>${supplier.phone || 'N/A'}</td>
            <td style="text-align: right; font-weight: 500;">${(supplier.openingBalance || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td style="text-align: right; font-weight: 500; color: ${(supplier.debt || 0) > 0 ? '#dc3545' : '#28a745'};">${(supplier.debt || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-edit" onclick="editSupplier('${supplier.id}')">Sửa</button>
                <button class="btn-delete" onclick="deleteSupplier('${supplier.id}')">Xóa</button>
            </td>
        `;
        suppliersTableBody.appendChild(row);
    });
}

// Form submit handler - Nhà cung cấp (sẽ được gắn trong DOMContentLoaded chính)
function setupSupplierForm() {
    const supplierForm = document.getElementById('supplierForm');
    if (supplierForm && !supplierForm.hasAttribute('data-listener-attached')) {
        supplierForm.setAttribute('data-listener-attached', 'true');
        console.log('Setting up supplier form listener');
        supplierForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Supplier form submitted');
            
            if (currentEditSupplierId) {
                // Đang ở chế độ edit
                await updateSupplier(currentEditSupplierId);
            } else {
                // Đang ở chế độ thêm mới
                const name = document.getElementById('supplierName').value.trim();
                const company = document.getElementById('supplierCompany').value.trim();
                const address = document.getElementById('supplierAddress').value.trim();
                const taxCode = document.getElementById('supplierTaxCode').value.trim();
                const bankAccount = document.getElementById('supplierBankAccount').value.trim();
                const bankName = document.getElementById('supplierBankName').value.trim();
                const phone = document.getElementById('supplierPhone').value.trim();
                
                if (!name || !company || !address || !phone) {
                    alert('Vui lòng điền đầy đủ thông tin bắt buộc');
                    return;
                }
                
                try {
                    const response = await fetch('/api/admin/suppliers', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name,
                            company,
                            address,
                            taxCode,
                            bankAccount,
                            bankName,
                            phone
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Hiển thị mã số đã được tạo
                        if (data.code) {
                            document.getElementById('supplierCode').value = data.code;
                        }
                        alert(`Thêm nhà cung cấp thành công! Mã số: ${data.code || 'N/A'}`);
                        supplierForm.reset();
                        document.getElementById('supplierCode').value = '';
                        loadSuppliers();
                    } else {
                        alert('Lỗi: ' + (data.error || 'Không thể thêm nhà cung cấp'));
                    }
                } catch (error) {
                    console.error('Error adding supplier:', error);
                    alert('Có lỗi xảy ra khi thêm nhà cung cấp: ' + error.message);
                }
            }
        });
    }
    // Không cần log nếu form không tồn tại (có thể đang ở trang khác)
}

// Sửa nhà cung cấp
async function editSupplier(supplierId) {
    try {
        const response = await fetch(`/api/admin/suppliers/${supplierId}`);
        const data = await response.json();
        
        if (data.success) {
            const supplier = data.supplier;
            
            // Điền thông tin vào form modal
            document.getElementById('editSupplierId').value = supplier.id;
            document.getElementById('editSupplierCode').value = supplier.code || '';
            document.getElementById('editSupplierName').value = supplier.name || '';
            document.getElementById('editSupplierCompany').value = supplier.company || '';
            document.getElementById('editSupplierAddress').value = supplier.address || '';
            document.getElementById('editSupplierTaxCode').value = supplier.taxCode || '';
            document.getElementById('editSupplierBankAccount').value = supplier.bankAccount || '';
            document.getElementById('editSupplierBankName').value = supplier.bankName || '';
            document.getElementById('editSupplierPhone').value = supplier.phone || '';
            
            // Hiển thị modal
            document.getElementById('editSupplierModal').style.display = 'block';
        } else {
            alert('Không tìm thấy nhà cung cấp');
        }
    } catch (error) {
        console.error('Error loading supplier:', error);
        alert('Có lỗi xảy ra khi tải thông tin nhà cung cấp');
    }
}

// Đóng modal sửa nhà cung cấp
function closeEditSupplierModal() {
    document.getElementById('editSupplierModal').style.display = 'none';
    document.getElementById('editSupplierForm').reset();
}

// Cập nhật nhà cung cấp từ modal
async function updateSupplierFromModal() {
    const supplierId = document.getElementById('editSupplierId').value;
    const name = document.getElementById('editSupplierName').value.trim();
    const company = document.getElementById('editSupplierCompany').value.trim();
    const address = document.getElementById('editSupplierAddress').value.trim();
    const taxCode = document.getElementById('editSupplierTaxCode').value.trim();
    const bankAccount = document.getElementById('editSupplierBankAccount').value.trim();
    const bankName = document.getElementById('editSupplierBankName').value.trim();
    const phone = document.getElementById('editSupplierPhone').value.trim();
    
    if (!name || !company || !address || !phone) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/suppliers/${supplierId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                company,
                address,
                taxCode,
                bankAccount,
                bankName,
                phone
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật nhà cung cấp thành công!');
            closeEditSupplierModal();
            loadSuppliers(); // Reload danh sách
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể cập nhật'));
        }
    } catch (error) {
        console.error('Error updating supplier:', error);
        alert('Có lỗi xảy ra khi cập nhật nhà cung cấp');
    }
}

// Function cũ để tương thích với form "Thêm" (nếu cần)
async function updateSupplier(supplierId) {
    const name = document.getElementById('supplierName').value.trim();
    const company = document.getElementById('supplierCompany').value.trim();
    const address = document.getElementById('supplierAddress').value.trim();
    const taxCode = document.getElementById('supplierTaxCode').value.trim();
    const bankAccount = document.getElementById('supplierBankAccount').value.trim();
    const bankName = document.getElementById('supplierBankName').value.trim();
    const phone = document.getElementById('supplierPhone').value.trim();
    
    if (!name || !company || !address || !phone) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/suppliers/${supplierId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                company,
                address,
                taxCode,
                bankAccount,
                bankName,
                phone
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật nhà cung cấp thành công!');
            document.getElementById('supplierForm').reset();
            currentEditSupplierId = null;
            const submitBtn = document.querySelector('#supplierForm button[type="submit"]');
            submitBtn.textContent = 'Thêm Nhà Cung Cấp';
            loadSuppliers();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể cập nhật'));
        }
    } catch (error) {
        console.error('Error updating supplier:', error);
        alert('Có lỗi xảy ra khi cập nhật nhà cung cấp');
    }
}

// Xóa nhà cung cấp
async function deleteSupplier(supplierId) {
    if (!confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/suppliers/${supplierId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa nhà cung cấp thành công!');
            loadSuppliers();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa nhà cung cấp'));
        }
    } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Có lỗi xảy ra khi xóa nhà cung cấp');
    }
}

function showSupplierForm() {
    // Reset form về chế độ thêm mới
    currentEditSupplierId = null;
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierCode').value = '';
    const submitBtn = document.querySelector('#supplierForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Thêm Nhà Cung Cấp';
    }
    document.getElementById('supplierForm').scrollIntoView({ behavior: 'smooth' });
}

// ========== QUẢN LÝ TABS NHÀ CUNG CẤP ==========
// Switch supplier tabs
function switchSupplierTab(tabName) {
    // Ẩn tất cả tabs
    document.querySelectorAll('#suppliers-section .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('#suppliers-section .tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hiển thị tab được chọn
    const selectedTab = document.getElementById(`tab-supplier-${tabName}`);
    const selectedBtn = Array.from(document.querySelectorAll('#suppliers-section .tab')).find(btn => {
        const onclick = btn.getAttribute('onclick') || '';
        return onclick.includes(`switchSupplierTab('${tabName}')`);
    });
    
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Load dữ liệu khi chuyển tab
    if (tabName === 'list') {
        loadSuppliers();
    } else if (tabName === 'debt') {
        loadSupplierDebtSummary();
    } else if (tabName === 'balance') {
        loadSuppliersForBalance();
    } else if (tabName === 'payment') {
        loadSupplierPayment();
    }
}

// ========== ĐỐI CHIẾU CÔNG NỢ NHÀ CUNG CẤP ==========
async function loadSupplierDebtSummary() {
    const fromDate = document.getElementById('supplierDebtFromDate')?.value || '';
    const toDate = document.getElementById('supplierDebtToDate')?.value || '';
    const supplierCode = document.getElementById('supplierDebtCodeFilter')?.value || '';
    const supplierName = document.getElementById('supplierDebtNameFilter')?.value || '';
    
    try {
        const params = new URLSearchParams();
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
        if (supplierCode) params.append('supplierCode', supplierCode);
        if (supplierName) params.append('supplierName', supplierName);
        
        let url = '/api/admin/suppliers/debt-summary';
        const paramsString = params.toString();
        if (paramsString) {
            url += '?' + paramsString;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displaySupplierDebtSummary(data.debtSummary);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải dữ liệu công nợ'));
        }
    } catch (error) {
        console.error('Error loading supplier debt summary:', error);
        alert('Có lỗi xảy ra khi tải dữ liệu công nợ');
    }
}

function displaySupplierDebtSummary(debtSummary) {
    const tbody = document.getElementById('supplierDebtSummaryTableBody');
    const tfoot = document.getElementById('supplierDebtSummaryTableFoot');
    
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
            <td><strong>${item.supplierCode || 'N/A'}</strong></td>
            <td>${item.supplierName || 'N/A'}</td>
            <td>${(item.openingDebt || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>${(item.debtInPeriod || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>${(item.paidInPeriod || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td style="font-weight: bold; color: ${item.remainingDebt > 0 ? '#dc3545' : '#28a745'};">${(item.remainingDebt || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-primary" onclick="viewSupplierDebtDetail('${item.supplierId}')">Xem Chi Tiết</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (tfoot) {
        tfoot.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: right; font-weight: bold;">TỔNG CỘNG:</td>
                <td style="font-weight: bold;">${totalOpeningDebt.toLocaleString('vi-VN')} VNĐ</td>
                <td style="font-weight: bold;">${totalDebtInPeriod.toLocaleString('vi-VN')} VNĐ</td>
                <td style="font-weight: bold;">${totalPaidInPeriod.toLocaleString('vi-VN')} VNĐ</td>
                <td style="font-weight: bold; color: ${totalRemainingDebt > 0 ? '#dc3545' : '#28a745'};">${totalRemainingDebt.toLocaleString('vi-VN')} VNĐ</td>
                <td></td>
            </tr>
        `;
    }
}

async function viewSupplierDebtDetail(supplierId) {
    const fromDate = document.getElementById('supplierDebtFromDate')?.value || '';
    const toDate = document.getElementById('supplierDebtToDate')?.value || '';
    
    try {
        const params = new URLSearchParams();
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
        
        let url = `/api/admin/suppliers/${supplierId}/debt`;
        const paramsString = params.toString();
        if (paramsString) {
            url += '?' + paramsString;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displaySupplierDebtDetail(data);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải chi tiết công nợ'));
        }
    } catch (error) {
        console.error('Error loading supplier debt detail:', error);
        alert('Có lỗi xảy ra khi tải chi tiết công nợ');
    }
}

function displaySupplierDebtDetail(data) {
    const modal = document.getElementById('supplierDebtDetailModal');
    if (!modal) return;
    
    document.getElementById('supplierDebtDetailName').textContent = data.supplier.name || 'N/A';
    document.getElementById('supplierDebtDetailCode').textContent = data.supplier.code || 'N/A';
    
    const fromDate = document.getElementById('supplierDebtFromDate')?.value || '';
    const toDate = document.getElementById('supplierDebtToDate')?.value || '';
    let periodText = 'Tất cả';
    if (fromDate && toDate) {
        periodText = `Từ ${fromDate} đến ${toDate}`;
    } else if (fromDate) {
        periodText = `Từ ${fromDate}`;
    } else if (toDate) {
        periodText = `Đến ${toDate}`;
    }
    document.getElementById('supplierDebtDetailPeriod').textContent = periodText;
    
    document.getElementById('supplierDebtDetailOpeningDebt').textContent = (data.openingDebt || 0).toLocaleString('vi-VN');
    document.getElementById('supplierDebtDetailClosingDebt').textContent = (data.closingBalance || 0).toLocaleString('vi-VN');
    
    const tbody = document.getElementById('supplierDebtDetailTableBody');
    tbody.innerHTML = '';
    
    if (data.debtDetails && data.debtDetails.length > 0) {
        data.debtDetails.forEach((detail, index) => {
            const row = document.createElement('tr');
            const dateStr = detail.date ? new Date(detail.date).toLocaleDateString('vi-VN') : 'N/A';
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${detail.docNumber || 'N/A'}</td>
                <td>${dateStr}</td>
                <td>${(detail.debtAmount || 0).toLocaleString('vi-VN')} VNĐ</td>
                <td>${(detail.paidAmount || 0).toLocaleString('vi-VN')} VNĐ</td>
            `;
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Không có dữ liệu</td></tr>';
    }
    
    modal.style.display = 'block';
}

function closeSupplierDebtDetailModal() {
    const modal = document.getElementById('supplierDebtDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function resetSupplierDebtFilter() {
    document.getElementById('supplierDebtFromDate').value = '';
    document.getElementById('supplierDebtToDate').value = '';
    document.getElementById('supplierDebtCodeFilter').value = '';
    document.getElementById('supplierDebtNameFilter').value = '';
    loadSupplierDebtSummary();
}

function printSupplierDebtSummary() {
    window.print();
}

function printSupplierDebtDetail() {
    window.print();
}

// ========== NHẬP SỐ DƯ ĐẦU KỲ NHÀ CUNG CẤP ==========
let supplierBalanceRowCounter = 0;

function addSupplierBalanceRow() {
    const tbody = document.getElementById('supplierBalanceInputTableBody');
    if (!tbody) return;
    
    supplierBalanceRowCounter++;
    const rowId = `supplier-balance-row-${supplierBalanceRowCounter}`;
    
    const row = document.createElement('tr');
    row.id = rowId;
    row.innerHTML = `
        <td>${tbody.children.length + 1}</td>
        <td>
            <input type="text" class="balance-supplier-code" placeholder="Nhập mã số NCC" 
                   onkeyup="searchSupplierByCode(event, '${rowId}')" 
                   onfocus="showSupplierAutocomplete(event, 'code', '${rowId}')">
            <div id="autocomplete-code-${rowId}" class="customer-dropdown" style="display: none;"></div>
        </td>
        <td>
            <input type="text" class="balance-supplier-name" placeholder="Nhập tên công ty" 
                   onkeyup="searchSupplierByName(event, '${rowId}')" 
                   onfocus="showSupplierAutocomplete(event, 'name', '${rowId}')">
            <div id="autocomplete-name-${rowId}" class="customer-dropdown" style="display: none;"></div>
        </td>
        <td><input type="text" class="balance-supplier-address" placeholder="Địa chỉ" readonly></td>
        <td>
            <input type="number" class="balance-opening-balance" placeholder="Nhập số dư" min="0" step="1000">
        </td>
        <td>
            <button class="btn-delete" onclick="removeSupplierBalanceRow('${rowId}')">Xóa</button>
        </td>
    `;
    tbody.appendChild(row);
    updateSupplierBalanceRowNumbers();
}

function removeSupplierBalanceRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updateSupplierBalanceRowNumbers();
    }
}

function updateSupplierBalanceRowNumbers() {
    const tbody = document.getElementById('supplierBalanceInputTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const firstCell = row.querySelector('td:first-child');
        if (firstCell) {
            firstCell.textContent = index + 1;
        }
    });
}

async function loadSuppliersForBalance() {
    // Có thể load danh sách suppliers để autocomplete
    // Hiện tại để trống, sẽ được implement nếu cần
}

let allSuppliersForBalance = [];

async function searchSupplierByCode(event, rowId) {
    const query = event.target.value.trim();
    if (!query) {
        hideAutocomplete(`autocomplete-code-${rowId}`);
        return;
    }
    
    try {
        const response = await fetch('/api/admin/suppliers');
        const data = await response.json();
        
        if (data.success) {
            allSuppliersForBalance = data.suppliers.filter(s => s.isActive !== false);
            const filtered = allSuppliersForBalance.filter(supplier => {
                const code = String(supplier.code || '').toUpperCase();
                return code.includes(query.toUpperCase());
            });
            
            const autocomplete = document.getElementById(`autocomplete-code-${rowId}`);
            autocomplete.innerHTML = '';
            
            if (filtered.length === 0) {
                autocomplete.innerHTML = '<div class="customer-autocomplete-item">Không tìm thấy</div>';
            } else {
                filtered.forEach(supplier => {
                    const item = document.createElement('div');
                    item.className = 'customer-autocomplete-item';
                    item.innerHTML = `<strong>${supplier.code || ''}</strong> - ${supplier.company || supplier.name || ''}`;
                    item.onclick = () => selectSupplier(supplier, rowId);
                    autocomplete.appendChild(item);
                });
            }
            autocomplete.style.display = 'block';
        }
    } catch (error) {
        console.error('Error searching supplier:', error);
    }
}

async function searchSupplierByName(event, rowId) {
    const query = event.target.value.trim();
    if (!query) {
        hideAutocomplete(`autocomplete-name-${rowId}`);
        return;
    }
    
    try {
        const response = await fetch('/api/admin/suppliers');
        const data = await response.json();
        
        if (data.success) {
            allSuppliersForBalance = data.suppliers.filter(s => s.isActive !== false);
            const filtered = allSuppliersForBalance.filter(supplier => {
                const name = (supplier.company || supplier.name || '').toLowerCase();
                return name.includes(query.toLowerCase());
            });
            
            const autocomplete = document.getElementById(`autocomplete-name-${rowId}`);
            autocomplete.innerHTML = '';
            
            if (filtered.length === 0) {
                autocomplete.innerHTML = '<div class="customer-autocomplete-item">Không tìm thấy</div>';
            } else {
                filtered.forEach(supplier => {
                    const item = document.createElement('div');
                    item.className = 'customer-autocomplete-item';
                    item.innerHTML = `<strong>${supplier.code || ''}</strong> - ${supplier.company || supplier.name || ''}`;
                    item.onclick = () => selectSupplier(supplier, rowId);
                    autocomplete.appendChild(item);
                });
            }
            autocomplete.style.display = 'block';
        }
    } catch (error) {
        console.error('Error searching supplier:', error);
    }
}

function showSupplierAutocomplete(event, type, rowId) {
    if (type === 'code') {
        searchSupplierByCode(event, rowId);
    } else if (type === 'name') {
        searchSupplierByName(event, rowId);
    }
}

function selectSupplier(supplier, rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const codeInput = row.querySelector('.balance-supplier-code');
    if (codeInput) {
        codeInput.value = supplier.code;
        codeInput.setAttribute('data-supplier-id', supplier.id);
    }
    
    const nameInput = row.querySelector('.balance-supplier-name');
    if (nameInput) {
        nameInput.value = supplier.company || supplier.name;
        nameInput.setAttribute('data-supplier-id', supplier.id);
    }
    
    const addressInput = row.querySelector('.balance-supplier-address');
    if (addressInput) {
        addressInput.value = supplier.address || '';
    }
    
    hideAutocomplete(`autocomplete-code-${rowId}`);
    hideAutocomplete(`autocomplete-name-${rowId}`);
}

function clearSupplierBalanceTable() {
    const tbody = document.getElementById('supplierBalanceInputTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        supplierBalanceRowCounter = 0;
    }
}

async function saveAllSupplierOpeningBalances() {
    const tbody = document.getElementById('supplierBalanceInputTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
        alert('Vui lòng thêm ít nhất một dòng để nhập số dư đầu kỳ');
        return;
    }
    
    const balances = [];
    let hasError = false;
    
    rows.forEach((row, index) => {
        const codeInput = row.querySelector('.balance-supplier-code');
        const nameInput = row.querySelector('.balance-supplier-name');
        const balanceInput = row.querySelector('.balance-opening-balance');
        
        const supplierId = codeInput?.getAttribute('data-supplier-id') || nameInput?.getAttribute('data-supplier-id');
        const balance = balanceInput?.value;
        
        if (!supplierId) {
            alert(`Dòng ${index + 1}: Vui lòng chọn nhà cung cấp`);
            hasError = true;
            return;
        }
        
        if (!balance || parseFloat(balance) < 0) {
            alert(`Dòng ${index + 1}: Vui lòng nhập số dư đầu kỳ hợp lệ`);
            hasError = true;
            return;
        }
        
        balances.push({
            supplierId,
            openingBalance: parseFloat(balance),
            supplierCode: codeInput?.value || '',
            supplierName: nameInput?.value || ''
        });
    });
    
    if (hasError) {
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn lưu số dư đầu kỳ cho ${balances.length} nhà cung cấp?`)) {
        return;
    }
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (const balance of balances) {
            try {
                const response = await fetch(`/api/admin/suppliers/${balance.supplierId}/opening-balance`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        openingBalance: balance.openingBalance,
                        note: `Nhập số dư đầu kỳ - ${balance.supplierCode}`
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error saving balance for ${balance.supplierCode}:`, error);
                errorCount++;
            }
        }
        
        if (successCount > 0) {
            alert(`Đã lưu thành công ${successCount} nhà cung cấp${errorCount > 0 ? `, ${errorCount} nhà cung cấp lỗi` : ''}`);
            clearSupplierBalanceTable();
            loadSuppliers();
        } else {
            alert('Không thể lưu số dư đầu kỳ. Vui lòng thử lại.');
        }
    } catch (error) {
        console.error('Error saving supplier opening balances:', error);
        alert('Có lỗi xảy ra khi lưu số dư đầu kỳ');
    }
}

// ========== QUẢN LÝ THANH TOÁN NHÀ CUNG CẤP ==========

// Load danh sách nhà cung cấp cho phần thanh toán
async function loadSupplierPayment() {
    try {
        const response = await fetch('/api/admin/suppliers');
        const data = await response.json();
        
        if (data.success) {
            // Tính công nợ cho mỗi nhà cung cấp
            const suppliersWithDebt = await Promise.all(data.suppliers.map(async (supplier) => {
                try {
                    const debtResponse = await fetch(`/api/admin/suppliers/${supplier.id}/debt`);
                    if (debtResponse.ok) {
                        const debtData = await debtResponse.json();
                        if (debtData.success) {
                            supplier.debt = debtData.closingBalance || 0;
                        }
                    }
                } catch (e) {
                    console.error('Error loading debt for supplier:', e);
                    supplier.debt = 0;
                }
                return supplier;
            }));
            displaySupplierPayment(suppliersWithDebt);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải danh sách nhà cung cấp'));
        }
    } catch (error) {
        console.error('Error loading supplier payment:', error);
        alert('Có lỗi xảy ra khi tải danh sách nhà cung cấp');
    }
}

// Hiển thị danh sách nhà cung cấp cho phần thanh toán
function displaySupplierPayment(suppliers) {
    const tbody = document.getElementById('supplierPaymentTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Không có nhà cung cấp nào</td></tr>';
        return;
    }
    
    suppliers.forEach((supplier, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${supplier.code || 'N/A'}</strong></td>
            <td>${supplier.name || 'N/A'}</td>
            <td>${supplier.phone || 'N/A'}</td>
            <td style="text-align: right; font-weight: 500; color: ${(supplier.debt || 0) > 0 ? '#dc3545' : '#28a745'};">${(supplier.debt || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-primary" onclick="openAddSupplierDebtModal('${supplier.id}')" style="margin-right: 5px;">Phát Sinh Nợ</button>
                <button class="btn-primary" onclick="openPaySupplierDebtModal('${supplier.id}')">Thanh Toán Dư Nợ</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Tìm kiếm nhà cung cấp trong phần thanh toán
async function searchSupplierPayment() {
    const searchInput = document.getElementById('supplierPaymentSearch');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        loadSupplierPayment();
        return;
    }
    
    try {
        const response = await fetch('/api/admin/suppliers');
        const data = await response.json();
        
        if (data.success) {
            // Lọc nhà cung cấp theo query
            const filtered = data.suppliers.filter(supplier => {
                const code = (supplier.code || '').toString().toLowerCase();
                const name = (supplier.name || '').toLowerCase();
                const phone = (supplier.phone || '').toLowerCase();
                return code.includes(query) || name.includes(query) || phone.includes(query);
            });
            
            // Tính công nợ cho mỗi nhà cung cấp
            const suppliersWithDebt = await Promise.all(filtered.map(async (supplier) => {
                try {
                    const debtResponse = await fetch(`/api/admin/suppliers/${supplier.id}/debt`);
                    if (debtResponse.ok) {
                        const debtData = await debtResponse.json();
                        if (debtData.success) {
                            supplier.debt = debtData.closingBalance || 0;
                        }
                    }
                } catch (e) {
                    console.error('Error loading debt for supplier:', e);
                    supplier.debt = 0;
                }
                return supplier;
            }));
            displaySupplierPayment(suppliersWithDebt);
        }
    } catch (error) {
        console.error('Error searching supplier payment:', error);
        alert('Có lỗi xảy ra khi tìm kiếm nhà cung cấp');
    }
}

// Reset tìm kiếm
function resetSupplierPaymentSearch() {
    const searchInput = document.getElementById('supplierPaymentSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    loadSupplierPayment();
}

// Mở modal Phát Sinh Nợ
async function openAddSupplierDebtModal(supplierId) {
    try {
        const response = await fetch(`/api/admin/suppliers/${supplierId}`);
        const data = await response.json();
        
        if (data.success) {
            const supplier = data.supplier;
            
            // Lấy công nợ hiện tại từ API
            let currentDebt = 0;
            try {
                const debtResponse = await fetch(`/api/admin/suppliers/${supplierId}/debt`);
                if (debtResponse.ok) {
                    const debtData = await debtResponse.json();
                    if (debtData.success) {
                        currentDebt = debtData.closingBalance || 0;
                    }
                }
            } catch (e) {
                console.error('Error loading debt:', e);
                currentDebt = supplier.debt || 0;
            }
            
            document.getElementById('addSupplierDebtSupplierId').value = supplierId;
            document.getElementById('addSupplierDebtSupplierName').value = supplier.name || 'N/A';
            document.getElementById('addSupplierDebtSupplierCode').value = supplier.code || 'N/A';
            document.getElementById('addSupplierDebtCurrentDebt').value = currentDebt.toLocaleString('vi-VN') + ' VNĐ';
            document.getElementById('addSupplierDebtAmount').value = '';
            document.getElementById('addSupplierDebtNote').value = '';
            
            const modal = document.getElementById('addSupplierDebtModal');
            if (modal) {
                modal.style.display = 'block';
            }
        } else {
            alert('Không tìm thấy nhà cung cấp');
        }
    } catch (error) {
        console.error('Error opening add supplier debt modal:', error);
        alert('Có lỗi xảy ra khi tải thông tin nhà cung cấp');
    }
}

// Đóng modal Phát Sinh Nợ
function closeAddSupplierDebtModal() {
    const modal = document.getElementById('addSupplierDebtModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Mở modal Thanh Toán Dư Nợ
async function openPaySupplierDebtModal(supplierId) {
    try {
        const response = await fetch(`/api/admin/suppliers/${supplierId}`);
        const data = await response.json();
        
        if (data.success) {
            const supplier = data.supplier;
            
            // Lấy công nợ hiện tại từ API
            let currentDebt = 0;
            try {
                const debtResponse = await fetch(`/api/admin/suppliers/${supplierId}/debt`);
                if (debtResponse.ok) {
                    const debtData = await debtResponse.json();
                    if (debtData.success) {
                        currentDebt = debtData.closingBalance || 0;
                    }
                }
            } catch (e) {
                console.error('Error loading debt:', e);
                currentDebt = supplier.debt || 0;
            }
            
            document.getElementById('paySupplierDebtSupplierId').value = supplierId;
            document.getElementById('paySupplierDebtSupplierName').value = supplier.name || 'N/A';
            document.getElementById('paySupplierDebtSupplierCode').value = supplier.code || 'N/A';
            document.getElementById('paySupplierDebtCurrentDebt').value = currentDebt.toLocaleString('vi-VN') + ' VNĐ';
            document.getElementById('paySupplierDebtAmount').value = '';
            document.getElementById('paySupplierDebtNote').value = '';
            
            const modal = document.getElementById('paySupplierDebtModal');
            if (modal) {
                modal.style.display = 'block';
            }
        } else {
            alert('Không tìm thấy nhà cung cấp');
        }
    } catch (error) {
        console.error('Error opening pay supplier debt modal:', error);
        alert('Có lỗi xảy ra khi tải thông tin nhà cung cấp');
    }
}

// Đóng modal Thanh Toán Dư Nợ
function closePaySupplierDebtModal() {
    const modal = document.getElementById('paySupplierDebtModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Đóng modal In Phiếu Thu
function closePrintSupplierReceiptModal() {
    const modal = document.getElementById('printSupplierReceiptModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Submit Phát Sinh Nợ
async function submitAddSupplierDebt() {
    const supplierId = document.getElementById('addSupplierDebtSupplierId').value;
    const amount = parseFloat(document.getElementById('addSupplierDebtAmount').value);
    const note = document.getElementById('addSupplierDebtNote').value.trim();
    
    if (!supplierId || !amount || amount <= 0) {
        alert('Vui lòng nhập số tiền hợp lệ');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/suppliers/debt/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                supplierId,
                amount,
                note: note || 'Phát sinh nợ'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Phát sinh nợ thành công!');
            closeAddSupplierDebtModal();
            loadSupplierPayment();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể phát sinh nợ'));
        }
    } catch (error) {
        console.error('Error adding supplier debt:', error);
        alert('Có lỗi xảy ra khi phát sinh nợ');
    }
}

// Submit Thanh Toán Dư Nợ
async function submitPaySupplierDebt() {
    const supplierId = document.getElementById('paySupplierDebtSupplierId').value;
    const amount = parseFloat(document.getElementById('paySupplierDebtAmount').value);
    const note = document.getElementById('paySupplierDebtNote').value.trim();
    
    if (!supplierId || !amount || amount <= 0) {
        alert('Vui lòng nhập số tiền hợp lệ');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/suppliers/debt/pay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                supplierId,
                amount,
                note: note || 'Thanh toán dư nợ'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Thanh toán thành công!');
            closePaySupplierDebtModal();
            
            // Hiển thị modal in phiếu thu
            await displaySupplierReceipt(data.receipt);
            
            loadSupplierPayment();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể thanh toán'));
        }
    } catch (error) {
        console.error('Error paying supplier debt:', error);
        alert('Có lỗi xảy ra khi thanh toán');
    }
}

// Hiển thị phiếu thu
async function displaySupplierReceipt(receipt) {
    const modal = document.getElementById('printSupplierReceiptModal');
    const content = document.getElementById('supplierReceiptPrintContent');
    
    if (!modal || !content) return;
    
    const date = new Date(receipt.date || Date.now());
    const dateStr = date.toLocaleDateString('vi-VN');
    const timeStr = date.toLocaleTimeString('vi-VN');
    
    content.innerHTML = `
        <div class="receipt-header" style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #8d5524;">PHIẾU THU</h2>
            <p style="margin: 5px 0;">Nhà Hàng Phương Anh</p>
        </div>
        <div class="receipt-info" style="margin-bottom: 20px;">
            <p><strong>Ngày:</strong> ${dateStr}</p>
            <p><strong>Giờ:</strong> ${timeStr}</p>
            <p><strong>Mã số NCC:</strong> ${receipt.supplierCode || 'N/A'}</p>
            <p><strong>Nhà cung cấp:</strong> ${receipt.supplierName || 'N/A'}</p>
            <p><strong>Số tiền:</strong> ${(receipt.amount || 0).toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Ghi chú:</strong> ${receipt.note || ''}</p>
        </div>
        <div class="receipt-signatures" style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div class="signature-box" style="text-align: center;">
                <p style="border-top: 1px solid #000; padding-top: 5px; width: 200px;">Người nộp tiền</p>
            </div>
            <div class="signature-box" style="text-align: center;">
                <p style="border-top: 1px solid #000; padding-top: 5px; width: 200px;">Người thu tiền</p>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// In phiếu thu
function printSupplierReceipt() {
    const content = document.getElementById('supplierReceiptPrintContent');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Phiếu Thu</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .receipt-header { text-align: center; margin-bottom: 20px; }
                    .receipt-info { margin-bottom: 20px; }
                    .receipt-signatures { margin-top: 40px; display: flex; justify-content: space-between; }
                    .signature-box { text-align: center; }
                    @media print {
                        body { margin: 0; padding: 10px; }
                    }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
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

// ========== QUẢN LÝ NGUYÊN VẬT LIỆU ==========
let currentEditMaterialId = null;

// Load materials
async function loadMaterials() {
    try {
        console.log('Fetching materials from API...');
        const response = await fetch('/api/admin/materials');
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Materials data:', data);
        
        if (data.success) {
            console.log('Displaying materials, count:', data.materials?.length || 0);
            displayMaterials(data.materials);
        } else {
            console.error('Failed to load materials:', data.error);
        }
    } catch (error) {
        console.error('Error loading materials:', error);
    }
}

function displayMaterials(materials) {
    console.log('displayMaterials called with', materials?.length || 0, 'materials');
    const materialsTableBody = document.getElementById('materialsTableBody');
    if (!materialsTableBody) {
        console.error('materialsTableBody element not found!');
        return;
    }
    if (!materialsTableBody) return;
    
    materialsTableBody.innerHTML = '';
    
    if (materials.length === 0) {
        materialsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Chưa có nguyên vật liệu nào</td></tr>';
        return;
    }
    
    // Sắp xếp theo mã số
    materials.sort((a, b) => {
        const codeA = a.code || '';
        const codeB = b.code || '';
        return codeA.localeCompare(codeB);
    });
    
    materials.forEach((material, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${material.code || 'N/A'}</strong></td>
            <td>${material.name || 'N/A'}</td>
            <td>${material.unit || 'N/A'}</td>
            <td>${material.package || 'N/A'}</td>
            <td>
                <button class="btn-edit" onclick="editMaterial('${material.id}')">Sửa</button>
                <button class="btn-delete" onclick="deleteMaterial('${material.id}')">Xóa</button>
            </td>
        `;
        materialsTableBody.appendChild(row);
    });
}

// Form submit handler - Nguyên vật liệu (sẽ được gắn trong DOMContentLoaded chính)
function setupMaterialForm() {
    const materialForm = document.getElementById('materialForm');
    if (materialForm && !materialForm.hasAttribute('data-listener-attached')) {
        materialForm.setAttribute('data-listener-attached', 'true');
        console.log('Setting up material form listener');
        materialForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Material form submitted');
            
            if (currentEditMaterialId) {
                // Đang ở chế độ edit
                await updateMaterial(currentEditMaterialId);
            } else {
                // Đang ở chế độ thêm mới
                const name = document.getElementById('materialName').value.trim();
                const unit = document.getElementById('materialUnit').value;
                const packageInfo = document.getElementById('materialPackage').value.trim();
                
                if (!name || !unit || !packageInfo) {
                    alert('Vui lòng điền đầy đủ thông tin bắt buộc');
                    return;
                }
                
                try {
                    const response = await fetch('/api/admin/materials', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name,
                            unit,
                            package: packageInfo
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Hiển thị mã số đã được tạo
                        if (data.code) {
                            document.getElementById('materialCode').value = data.code;
                        }
                        alert(`Thêm nguyên vật liệu thành công! Mã số: ${data.code || 'N/A'}`);
                        materialForm.reset();
                        document.getElementById('materialCode').value = '';
                        loadMaterials();
                    } else {
                        alert('Lỗi: ' + (data.error || 'Không thể thêm nguyên vật liệu'));
                    }
                } catch (error) {
                    console.error('Error adding material:', error);
                    alert('Có lỗi xảy ra khi thêm nguyên vật liệu: ' + error.message);
                }
            }
        });
    }
    // Không cần log nếu form không tồn tại (có thể đang ở trang khác)
}

// Sửa nguyên vật liệu
async function editMaterial(materialId) {
    try {
        const response = await fetch(`/api/admin/materials/${materialId}`);
        const data = await response.json();
        
        if (data.success) {
            const material = data.material;
            
            // Điền form với dữ liệu hiện tại
            document.getElementById('materialCode').value = material.code || '';
            document.getElementById('materialName').value = material.name || '';
            document.getElementById('materialUnit').value = material.unit || '';
            document.getElementById('materialPackage').value = material.package || '';
            
            // Đổi form thành chế độ sửa
            currentEditMaterialId = materialId;
            const form = document.getElementById('materialForm');
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Cập Nhật Nguyên Vật Liệu';
            
            // Scroll to form
            document.getElementById('materialForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Không tìm thấy nguyên vật liệu');
        }
    } catch (error) {
        console.error('Error loading material:', error);
        alert('Có lỗi xảy ra khi tải thông tin nguyên vật liệu');
    }
}

async function updateMaterial(materialId) {
    const name = document.getElementById('materialName').value.trim();
    const unit = document.getElementById('materialUnit').value;
    const packageInfo = document.getElementById('materialPackage').value.trim();
    
    if (!name || !unit || !packageInfo) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/materials/${materialId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                unit,
                package: packageInfo
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật nguyên vật liệu thành công!');
            document.getElementById('materialForm').reset();
            document.getElementById('materialCode').value = '';
            currentEditMaterialId = null;
            const submitBtn = document.querySelector('#materialForm button[type="submit"]');
            submitBtn.textContent = 'Thêm Nguyên Vật Liệu';
            loadMaterials();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể cập nhật'));
        }
    } catch (error) {
        console.error('Error updating material:', error);
        alert('Có lỗi xảy ra khi cập nhật nguyên vật liệu');
    }
}

// Xóa nguyên vật liệu
async function deleteMaterial(materialId) {
    if (!confirm('Bạn có chắc chắn muốn xóa nguyên vật liệu này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/materials/${materialId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa nguyên vật liệu thành công!');
            loadMaterials();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa nguyên vật liệu'));
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        alert('Có lỗi xảy ra khi xóa nguyên vật liệu');
    }
}

function showMaterialForm() {
    // Reset form về chế độ thêm mới
    currentEditMaterialId = null;
    document.getElementById('materialForm').reset();
    document.getElementById('materialCode').value = '';
    const submitBtn = document.querySelector('#materialForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Thêm Nguyên Vật Liệu';
    }
    document.getElementById('materialForm').scrollIntoView({ behavior: 'smooth' });
}

// ==================== QUẢN LÝ NHẬP KHO ====================

let allSuppliersForImport = [];
let allMaterialsForImport = [];
let importItemCounter = 0;
let currentEditReceiptId = null; // Để theo dõi phiếu nhập kho đang sửa

// Load danh sách nhà cung cấp và nguyên vật liệu cho form nhập kho
async function loadSuppliersForImport() {
    try {
        const response = await fetch('/api/admin/suppliers');
        const data = await response.json();
        if (data.success) {
            allSuppliersForImport = data.suppliers.filter(s => s.isActive !== false);
        }
    } catch (error) {
        console.error('Error loading suppliers for import:', error);
    }
}

async function loadMaterialsForImport() {
    try {
        const response = await fetch('/api/admin/materials');
        const data = await response.json();
        if (data.success) {
            allMaterialsForImport = data.materials.filter(m => m.isActive !== false);
        }
    } catch (error) {
        console.error('Error loading materials for import:', error);
    }
}

// Hiển thị modal nhập kho
async function showImportModal() {
    const modal = document.getElementById('importModal');
    if (!modal) {
        console.error('Import modal not found!');
        alert('Không tìm thấy form nhập kho. Vui lòng tải lại trang.');
        return;
    }
    
    console.log('Opening import modal...');
    
    // Reset về chế độ thêm mới
    currentEditReceiptId = null;
    
    // Load dữ liệu
    await loadSuppliersForImport();
    await loadMaterialsForImport();
    
    // Reset form
    document.getElementById('importForm').reset();
    document.getElementById('importItemsTableBody').innerHTML = '';
    document.getElementById('importTotalAmount').textContent = '0';
    document.getElementById('selectedSupplierId').value = '';
    document.getElementById('selectedSupplierInfo').style.display = 'none';
    document.getElementById('supplierDropdown').innerHTML = '';
    importItemCounter = 0;
    
    // Set ngày mặc định là hôm nay
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('importDate').value = today;
    
    // Tạo số chứng từ tạm thời (sẽ được tạo chính thức khi lưu)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('importDocNumber').value = `NK${year}${month}XXX`;
    
    // Đổi text nút submit
    const submitBtn = document.querySelector('#importForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Lưu Phiếu Nhập Kho';
    
    modal.style.display = 'block';
    console.log('Import modal displayed');
}

// Đóng modal nhập kho
function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.style.display = 'none';
        currentEditReceiptId = null; // Reset edit state
    }
}

// Tìm kiếm nhà cung cấp
function filterSuppliers() {
    const searchTerm = document.getElementById('supplierSearch').value.toLowerCase().trim();
    const dropdown = document.getElementById('supplierDropdown');
    
    if (!searchTerm) {
        dropdown.innerHTML = '';
        return;
    }
    
    const filtered = allSuppliersForImport.filter(supplier => {
        const name = (supplier.name || '').toLowerCase();
        const company = (supplier.company || '').toLowerCase();
        return name.includes(searchTerm) || company.includes(searchTerm);
    });
    
    dropdown.innerHTML = '';
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item">Không tìm thấy nhà cung cấp</div>';
    } else {
        filtered.forEach(supplier => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `<strong>${supplier.name || ''}</strong> - ${supplier.company || ''} (Mã: ${supplier.code || ''})`;
            item.onclick = () => selectSupplier(supplier);
            dropdown.appendChild(item);
        });
    }
}

// Chọn nhà cung cấp
function selectSupplier(supplier) {
    document.getElementById('selectedSupplierId').value = supplier.id;
    document.getElementById('selectedSupplierName').textContent = `${supplier.name || ''} - ${supplier.company || ''}`;
    document.getElementById('selectedSupplierCode').textContent = supplier.code || '';
    document.getElementById('selectedSupplierInfo').style.display = 'block';
    document.getElementById('supplierSearch').value = '';
    document.getElementById('supplierDropdown').innerHTML = '';
}

// Xóa lựa chọn nhà cung cấp
function clearSupplierSelection() {
    document.getElementById('selectedSupplierId').value = '';
    document.getElementById('selectedSupplierInfo').style.display = 'none';
    document.getElementById('supplierSearch').value = '';
}

// Chuyển đến phần quản lý nhà cung cấp
function goToSupplierManagement() {
    closeImportModal();
    window.location.href = '/admin/suppliers';
}

// Chuyển đến phần quản lý nguyên vật liệu
function goToMaterialManagement() {
    closeImportModal();
    window.location.href = '/admin/materials';
}

// Thêm dòng nguyên vật liệu vào bảng
function addImportItem() {
    if (allMaterialsForImport.length === 0) {
        alert('Vui lòng thêm nguyên vật liệu trước!');
        goToMaterialManagement();
        return;
    }
    
    const tbody = document.getElementById('importItemsTableBody');
    const row = document.createElement('tr');
    row.id = `importItem_${importItemCounter}`;
    
    // Tạo dropdown cho nguyên vật liệu
    const materialSelect = document.createElement('select');
    materialSelect.className = 'material-select';
    materialSelect.innerHTML = '<option value="">-- Chọn nguyên vật liệu --</option>';
    allMaterialsForImport.forEach(material => {
        const option = document.createElement('option');
        option.value = material.id;
        option.dataset.code = material.code || '';
        option.dataset.name = material.name || '';
        option.dataset.unit = material.unit || '';
        option.textContent = `${material.code || ''} - ${material.name || ''} (${material.unit || ''})`;
        materialSelect.appendChild(option);
    });
    materialSelect.onchange = function() {
        updateImportItemRow(row, this.value);
    };
    
    // Tạo các cell riêng biệt
    const sttCell = document.createElement('td');
    sttCell.textContent = importItemCounter + 1;
    
    const selectCell = document.createElement('td');
    selectCell.appendChild(materialSelect);
    
    const codeCell = document.createElement('td');
    codeCell.className = 'material-code-cell';
    
    const nameCell = document.createElement('td');
    nameCell.className = 'material-name-cell';
    
    const unitCell = document.createElement('td');
    unitCell.className = 'material-unit-cell';
    
    const quantityCell = document.createElement('td');
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'quantity-input';
    quantityInput.step = '0.1';
    quantityInput.min = '0';
    quantityInput.placeholder = '0.0';
    quantityInput.onchange = function() { calculateImportItemTotal(this); };
    quantityInput.oninput = function() { calculateImportItemTotal(this); };
    quantityCell.appendChild(quantityInput);
    
    const priceCell = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'price-input';
    priceInput.step = '0.01';
    priceInput.min = '0';
    priceInput.placeholder = '0.00';
    priceInput.onchange = function() { calculateImportItemTotal(this); };
    priceInput.oninput = function() { calculateImportItemTotal(this); };
    priceCell.appendChild(priceInput);
    
    const amountCell = document.createElement('td');
    amountCell.className = 'amount-cell';
    amountCell.textContent = '0';
    
    // Thêm tất cả cells vào row
    row.appendChild(sttCell);
    row.appendChild(selectCell);
    row.appendChild(codeCell);
    row.appendChild(nameCell);
    row.appendChild(unitCell);
    row.appendChild(quantityCell);
    row.appendChild(priceCell);
    row.appendChild(amountCell);
    
    // Re-attach event listener cho select
    materialSelect.onchange = function() {
        updateImportItemRow(row, this.value);
    };
    
    tbody.appendChild(row);
    importItemCounter++;
    updateImportItemNumbers();
}

// Cập nhật thông tin dòng khi chọn nguyên vật liệu
function updateImportItemRow(row, materialId) {
    if (!materialId) {
        row.querySelector('.material-code-cell').textContent = '';
        row.querySelector('.material-name-cell').textContent = '';
        row.querySelector('.material-unit-cell').textContent = '';
        return;
    }
    
    const material = allMaterialsForImport.find(m => m.id === materialId);
    if (material) {
        row.querySelector('.material-code-cell').textContent = material.code || '';
        row.querySelector('.material-name-cell').textContent = material.name || '';
        row.querySelector('.material-unit-cell').textContent = material.unit || '';
        
        // Lưu thông tin vào data attributes
        row.dataset.materialId = material.id;
        row.dataset.materialCode = material.code || '';
        row.dataset.materialName = material.name || '';
        row.dataset.materialUnit = material.unit || '';
    }
}

// Tính thành tiền cho một dòng
function calculateImportItemTotal(input) {
    const row = input.closest('tr');
    const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
    const unitPrice = parseFloat(row.querySelector('.price-input').value) || 0;
    const amount = Math.round(quantity * unitPrice);
    row.querySelector('.amount-cell').textContent = amount.toLocaleString('vi-VN');
    calculateImportTotal();
}

// Tính tổng tiền
function calculateImportTotal() {
    const rows = document.querySelectorAll('#importItemsTableBody tr');
    let total = 0;
    rows.forEach(row => {
        const amountText = row.querySelector('.amount-cell').textContent.replace(/[^\d]/g, '');
        total += parseInt(amountText) || 0;
    });
    document.getElementById('importTotalAmount').textContent = total.toLocaleString('vi-VN');
}

// Xóa dòng nguyên vật liệu
function removeImportItem(itemId) {
    const row = document.getElementById(`importItem_${itemId}`);
    if (row) {
        row.remove();
        updateImportItemNumbers();
        calculateImportTotal();
    }
}

// Cập nhật số thứ tự
function updateImportItemNumbers() {
    const rows = document.querySelectorAll('#importItemsTableBody tr');
    rows.forEach((row, index) => {
        row.querySelector('td:first-child').textContent = index + 1;
    });
}

// Load danh sách phiếu nhập kho
async function loadImportReceipts() {
    try {
        // Đảm bảo load suppliers trước để hiển thị tên nhà cung cấp
        if (allSuppliersForImport.length === 0) {
            await loadSuppliersForImport();
        }
        
        const response = await fetch('/api/admin/import-receipts');
        const data = await response.json();
        
        if (data.success) {
            displayImportReceipts(data.receipts);
        } else {
            console.error('Error loading import receipts:', data.error);
            alert('Lỗi khi tải danh sách phiếu nhập kho: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading import receipts:', error);
        alert('Có lỗi xảy ra khi tải danh sách phiếu nhập kho');
    }
}

// Hiển thị danh sách phiếu nhập kho
function displayImportReceipts(receipts) {
    const tbody = document.getElementById('importReceiptsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (receipts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Chưa có phiếu nhập kho nào</td></tr>';
        return;
    }
    
    receipts.forEach((receipt, index) => {
        const row = document.createElement('tr');
        const importDate = receipt.importDate ? new Date(receipt.importDate).toLocaleDateString('vi-VN') : 'N/A';
        
        // Lấy tên nhà cung cấp
        const supplier = allSuppliersForImport.find(s => s.id === receipt.supplierId);
        const supplierName = supplier ? `${supplier.name || ''} - ${supplier.company || ''}` : 'N/A';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${receipt.docNumber || 'N/A'}</strong></td>
            <td>${importDate}</td>
            <td>${supplierName}</td>
            <td>${receipt.items ? receipt.items.length : 0}</td>
            <td>${(receipt.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-edit" onclick="editImportReceipt('${receipt.id}')">Sửa</button>
                <button class="btn-delete" onclick="deleteImportReceipt('${receipt.id}')">Xóa</button>
                <button class="btn-primary" onclick="printImportReceiptById('${receipt.id}')">In</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Tìm kiếm phiếu nhập kho
async function searchImportReceipts() {
    const fromDate = document.getElementById('searchImportFromDate').value;
    const toDate = document.getElementById('searchImportToDate').value;
    const docNumber = document.getElementById('searchImportDocNumber').value.trim();
    
    try {
        let url = '/api/admin/import-receipts?';
        const params = [];
        if (fromDate) params.push(`fromDate=${fromDate}`);
        if (toDate) params.push(`toDate=${toDate}`);
        if (docNumber) params.push(`docNumber=${docNumber}`);
        
        url += params.join('&');
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayImportReceipts(data.receipts);
        }
    } catch (error) {
        console.error('Error searching import receipts:', error);
        alert('Có lỗi xảy ra khi tìm kiếm');
    }
}

// Xóa bộ lọc tìm kiếm
function resetImportSearch() {
    document.getElementById('searchImportFromDate').value = '';
    document.getElementById('searchImportToDate').value = '';
    document.getElementById('searchImportDocNumber').value = '';
    loadImportReceipts();
}

// Sửa phiếu nhập kho
async function editImportReceipt(receiptId) {
    try {
        const response = await fetch(`/api/admin/import-receipts/${receiptId}`);
        const data = await response.json();
        
        if (data.success) {
            const receipt = data.receipt;
            currentEditReceiptId = receiptId;
            
            // Load dữ liệu
            await loadSuppliersForImport();
            await loadMaterialsForImport();
            
            // Điền thông tin vào form
            document.getElementById('importDocNumber').value = receipt.docNumber || '';
            const importDate = receipt.importDate ? new Date(receipt.importDate).toISOString().split('T')[0] : '';
            document.getElementById('importDate').value = importDate;
            
            // Chọn nhà cung cấp
            const supplier = allSuppliersForImport.find(s => s.id === receipt.supplierId);
            if (supplier) {
                selectSupplier(supplier);
            }
            
            // Xóa các dòng cũ
            document.getElementById('importItemsTableBody').innerHTML = '';
            importItemCounter = 0;
            
            // Thêm các nguyên vật liệu
            if (receipt.items && receipt.items.length > 0) {
                receipt.items.forEach(item => {
                    addImportItem();
                    const lastRow = document.querySelector(`#importItemsTableBody tr:last-child`);
                    if (lastRow) {
                        // Tìm và chọn nguyên vật liệu
                        const materialSelect = lastRow.querySelector('.material-select');
                        if (materialSelect) {
                            materialSelect.value = item.materialId;
                            updateImportItemRow(lastRow, item.materialId);
                        }
                        
                        // Điền số lượng và đơn giá
                        const quantityInput = lastRow.querySelector('.quantity-input');
                        const priceInput = lastRow.querySelector('.price-input');
                        if (quantityInput) quantityInput.value = item.quantity;
                        if (priceInput) priceInput.value = item.unitPrice;
                        calculateImportItemTotal(quantityInput || priceInput);
                    }
                });
            }
            
            // Đổi text nút submit
            const submitBtn = document.querySelector('#importForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Cập Nhật Phiếu Nhập Kho';
            
            // Hiển thị modal
            document.getElementById('importModal').style.display = 'block';
            document.getElementById('importForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Không tìm thấy phiếu nhập kho');
        }
    } catch (error) {
        console.error('Error loading import receipt for edit:', error);
        alert('Có lỗi xảy ra khi tải thông tin phiếu nhập kho');
    }
}

// Xóa phiếu nhập kho
async function deleteImportReceipt(receiptId) {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu nhập kho này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/import-receipts/${receiptId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Kiểm tra response status trước khi parse JSON
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                alert('Lỗi: ' + (errorData.error || 'Không thể xóa phiếu nhập kho'));
            } catch (e) {
                alert('Lỗi: ' + response.status + ' ' + response.statusText);
            }
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa phiếu nhập kho thành công!');
            loadImportReceipts();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa phiếu nhập kho'));
        }
    } catch (error) {
        console.error('Error deleting import receipt:', error);
        alert('Có lỗi xảy ra khi xóa phiếu nhập kho: ' + error.message);
    }
}

// In phiếu nhập kho (từ form đang nhập)
function printImportReceipt() {
    const docNumber = document.getElementById('importDocNumber').value;
    const importDate = document.getElementById('importDate').value;
    const supplierId = document.getElementById('selectedSupplierId').value;
    
    if (!supplierId) {
        alert('Vui lòng chọn nhà cung cấp!');
        return;
    }
    
    const rows = document.querySelectorAll('#importItemsTableBody tr');
    if (rows.length === 0) {
        alert('Vui lòng thêm ít nhất một nguyên vật liệu!');
        return;
    }
    
    // Validate các dòng
    let hasError = false;
    rows.forEach(row => {
        const materialId = row.dataset.materialId;
        const quantity = parseFloat(row.querySelector('.quantity-input').value);
        const unitPrice = parseFloat(row.querySelector('.price-input').value);
        
        if (!materialId || !quantity || !unitPrice) {
            hasError = true;
        }
    });
    
    if (hasError) {
        alert('Vui lòng điền đầy đủ thông tin cho tất cả nguyên vật liệu!');
        return;
    }
    
    // Tạo nội dung in
    const supplier = allSuppliersForImport.find(s => s.id === supplierId);
    const supplierName = supplier ? `${supplier.name || ''} - ${supplier.company || ''}` : 'N/A';
    const supplierCode = supplier ? supplier.code || '' : '';
    
    let itemsHtml = '';
    let totalAmount = 0;
    rows.forEach((row, index) => {
        const materialCode = row.dataset.materialCode || '';
        const materialName = row.dataset.materialName || '';
        const unit = row.dataset.materialUnit || '';
        const quantity = parseFloat(row.querySelector('.quantity-input').value);
        const unitPrice = parseFloat(row.querySelector('.price-input').value);
        const amount = Math.round(quantity * unitPrice);
        totalAmount += amount;
        
        itemsHtml += `
            <tr>
                <td>${index + 1}</td>
                <td>${materialCode}</td>
                <td>${materialName}</td>
                <td>${unit}</td>
                <td style="text-align: right;">${quantity.toFixed(1)}</td>
                <td style="text-align: right;">${unitPrice.toFixed(2)}</td>
                <td style="text-align: right;">${amount.toLocaleString('vi-VN')}</td>
            </tr>
        `;
    });
    
    const printContent = `
        <div class="print-receipt">
            <div class="receipt-header">
                <h2>PHIẾU NHẬP KHO</h2>
                <p><strong>Số chứng từ:</strong> ${docNumber}</p>
                <p><strong>Ngày nhập:</strong> ${new Date(importDate).toLocaleDateString('vi-VN')}</p>
            </div>
            <div class="receipt-supplier">
                <p><strong>Nhà cung cấp:</strong> ${supplierName} (Mã: ${supplierCode})</p>
            </div>
            <table class="receipt-items-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Mã Số</th>
                        <th>Tên Nguyên Vật Liệu</th>
                        <th>Đơn Vị</th>
                        <th>Số Lượng</th>
                        <th>Đơn Giá</th>
                        <th>Thành Tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="6" style="text-align: right; font-weight: bold;">TỔNG TIỀN:</td>
                        <td style="text-align: right; font-weight: bold; font-size: 1.2em;">${totalAmount.toLocaleString('vi-VN')} VNĐ</td>
                    </tr>
                </tfoot>
            </table>
            <div class="receipt-signatures">
                <div class="signature-box">
                    <p><strong>Người bán</strong></p>
                    <p>(Nhà cung cấp)</p>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-box">
                    <p><strong>Thủ kho</strong></p>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-box">
                    <p><strong>Kế toán</strong></p>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-box">
                    <p><strong>Thủ trưởng đơn vị</strong></p>
                    <div class="signature-line"></div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('printImportContent').innerHTML = printContent;
    document.getElementById('printImportModal').style.display = 'block';
}

// In phiếu nhập kho theo ID
async function printImportReceiptById(receiptId) {
    try {
        const response = await fetch(`/api/admin/import-receipts/${receiptId}`);
        const data = await response.json();
        
        if (data.success) {
            const receipt = data.receipt;
            const supplier = allSuppliersForImport.find(s => s.id === receipt.supplierId);
            const supplierName = supplier ? `${supplier.name || ''} - ${supplier.company || ''}` : 'N/A';
            const supplierCode = supplier ? supplier.code || '' : '';
            
            let itemsHtml = '';
            receipt.items.forEach((item, index) => {
                itemsHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.materialCode || ''}</td>
                        <td>${item.materialName || ''}</td>
                        <td>${item.unit || ''}</td>
                        <td style="text-align: right;">${item.quantity.toFixed(1)}</td>
                        <td style="text-align: right;">${item.unitPrice.toFixed(2)}</td>
                        <td style="text-align: right;">${item.amount.toLocaleString('vi-VN')}</td>
                    </tr>
                `;
            });
            
            const printContent = `
                <div class="print-receipt">
                    <div class="receipt-header">
                        <h2>PHIẾU NHẬP KHO</h2>
                        <p><strong>Số chứng từ:</strong> ${receipt.docNumber || ''}</p>
                        <p><strong>Ngày nhập:</strong> ${new Date(receipt.importDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div class="receipt-supplier">
                        <p><strong>Nhà cung cấp:</strong> ${supplierName} (Mã: ${supplierCode})</p>
                    </div>
                    <table class="receipt-items-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Mã Số</th>
                                <th>Tên Nguyên Vật Liệu</th>
                                <th>Đơn Vị</th>
                                <th>Số Lượng</th>
                                <th>Đơn Giá</th>
                                <th>Thành Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="6" style="text-align: right; font-weight: bold;">TỔNG TIỀN:</td>
                                <td style="text-align: right; font-weight: bold; font-size: 1.2em;">${(receipt.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="receipt-signatures">
                        <div class="signature-box">
                            <p><strong>Người bán</strong></p>
                            <p>(Nhà cung cấp)</p>
                            <div class="signature-line"></div>
                        </div>
                        <div class="signature-box">
                            <p><strong>Thủ kho</strong></p>
                            <div class="signature-line"></div>
                        </div>
                        <div class="signature-box">
                            <p><strong>Kế toán</strong></p>
                            <div class="signature-line"></div>
                        </div>
                        <div class="signature-box">
                            <p><strong>Thủ trưởng đơn vị</strong></p>
                            <div class="signature-line"></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('printImportContent').innerHTML = printContent;
            document.getElementById('printImportModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error printing import receipt:', error);
        alert('Có lỗi xảy ra khi in phiếu nhập kho');
    }
}

// Đóng modal in
function closePrintImportModal() {
    document.getElementById('printImportModal').style.display = 'none';
}

// Xử lý submit form nhập kho
document.addEventListener('DOMContentLoaded', function() {
    const importForm = document.getElementById('importForm');
    if (importForm) {
        importForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const importDate = document.getElementById('importDate').value;
            const supplierId = document.getElementById('selectedSupplierId').value;
            
            if (!importDate) {
                alert('Vui lòng chọn ngày nhập kho!');
                return;
            }
            
            if (!supplierId) {
                alert('Vui lòng chọn nhà cung cấp!');
                return;
            }
            
            const rows = document.querySelectorAll('#importItemsTableBody tr');
            if (rows.length === 0) {
                alert('Vui lòng thêm ít nhất một nguyên vật liệu!');
                return;
            }
            
            // Thu thập dữ liệu items
            const items = [];
            let hasError = false;
            
            rows.forEach(row => {
                const materialId = row.dataset.materialId;
                const materialCode = row.dataset.materialCode || '';
                const materialName = row.dataset.materialName || '';
                const unit = row.dataset.materialUnit || '';
                const quantity = parseFloat(row.querySelector('.quantity-input').value);
                const unitPrice = parseFloat(row.querySelector('.price-input').value);
                
                if (!materialId || !quantity || quantity <= 0 || !unitPrice || unitPrice <= 0) {
                    hasError = true;
                    return;
                }
                
                items.push({
                    materialId,
                    materialCode,
                    materialName,
                    unit,
                    quantity: quantity.toFixed(1),
                    unitPrice: unitPrice.toFixed(2)
                });
            });
            
            if (hasError || items.length === 0) {
                alert('Vui lòng điền đầy đủ và chính xác thông tin cho tất cả nguyên vật liệu!');
                return;
            }
            
            try {
                let response;
                let data;
                
                if (currentEditReceiptId) {
                    // Cập nhật phiếu nhập kho
                    response = await fetch(`/api/admin/import-receipts/${currentEditReceiptId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            importDate,
                            supplierId,
                            items
                        })
                    });
                    
                    data = await response.json();
                    
                    if (data.success) {
                        alert(`Cập nhật phiếu nhập kho thành công!\nTổng tiền: ${data.totalAmount.toLocaleString('vi-VN')} VNĐ`);
                        closeImportModal();
                        loadImportReceipts();
                    } else {
                        alert('Lỗi: ' + (data.error || 'Không thể cập nhật phiếu nhập kho'));
                    }
                } else {
                    // Tạo phiếu nhập kho mới
                    response = await fetch('/api/admin/import-receipts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            importDate,
                            supplierId,
                            items
                        })
                    });
                    
                    data = await response.json();
                    
                    if (data.success) {
                        alert(`Lưu phiếu nhập kho thành công!\nSố chứng từ: ${data.docNumber}\nTổng tiền: ${data.totalAmount.toLocaleString('vi-VN')} VNĐ`);
                        closeImportModal();
                        loadImportReceipts();
                    } else {
                        alert('Lỗi: ' + (data.error || 'Không thể lưu phiếu nhập kho'));
                    }
                }
            } catch (error) {
                console.error('Error saving import receipt:', error);
                alert('Có lỗi xảy ra khi lưu phiếu nhập kho');
            }
        });
    }
    
    // Đóng modal khi click bên ngoài
    window.onclick = function(event) {
        const importModal = document.getElementById('importModal');
        const printModal = document.getElementById('printImportModal');
        const exportModal = document.getElementById('exportModal');
        const printExportModal = document.getElementById('printExportModal');
        if (event.target == importModal) {
            closeImportModal();
        }
        if (event.target == printModal) {
            closePrintImportModal();
        }
        if (event.target == exportModal) {
            closeExportModal();
        }
        if (event.target == printExportModal) {
            closePrintExportModal();
        }
    };
});

// ==================== QUẢN LÝ XUẤT KHO ====================

let exportItemCounter = 0;
let currentEditExportReceiptId = null;

// Hiển thị modal xuất kho
async function showExportModal() {
    const modal = document.getElementById('exportModal');
    if (!modal) {
        console.error('Export modal not found!');
        alert('Không tìm thấy form xuất kho. Vui lòng tải lại trang.');
        return;
    }
    
    console.log('Opening export modal...');
    
    // Reset về chế độ thêm mới
    currentEditExportReceiptId = null;
    
    // Load dữ liệu
    await loadMaterialsForImport();
    
    // Reset form
    document.getElementById('exportForm').reset();
    document.getElementById('exportItemsTableBody').innerHTML = '';
    document.getElementById('exportTotalAmount').textContent = '0';
    exportItemCounter = 0;
    
    // Set ngày mặc định là hôm nay
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('exportDate').value = today;
    
    // Tạo số chứng từ tạm thời
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('exportDocNumber').value = `XK${year}${month}XXX`;
    
    // Đổi text nút submit
    const submitBtn = document.querySelector('#exportForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Lưu Phiếu Xuất Kho';
    
    modal.style.display = 'block';
    console.log('Export modal displayed');
}

// Đóng modal xuất kho
function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.style.display = 'none';
        currentEditExportReceiptId = null;
    }
}

// Thêm dòng nguyên vật liệu vào bảng xuất kho
function addExportItem() {
    if (allMaterialsForImport.length === 0) {
        alert('Vui lòng thêm nguyên vật liệu trước!');
        goToMaterialManagement();
        return;
    }
    
    const tbody = document.getElementById('exportItemsTableBody');
    const row = document.createElement('tr');
    row.id = `exportItem_${exportItemCounter}`;
    
    const materialSelect = document.createElement('select');
    materialSelect.className = 'material-select';
    materialSelect.innerHTML = '<option value="">-- Chọn nguyên vật liệu --</option>';
    allMaterialsForImport.forEach(material => {
        const option = document.createElement('option');
        option.value = material.id;
        option.dataset.code = material.code || '';
        option.dataset.name = material.name || '';
        option.dataset.unit = material.unit || '';
        option.textContent = `${material.code || ''} - ${material.name || ''} (${material.unit || ''})`;
        materialSelect.appendChild(option);
    });
    materialSelect.onchange = async function() {
        await updateExportItemRow(row, this.value);
    };
    
    // Tạo các cell riêng biệt
    const sttCell = document.createElement('td');
    sttCell.textContent = exportItemCounter + 1;
    
    const selectCell = document.createElement('td');
    selectCell.appendChild(materialSelect);
    
    const codeCell = document.createElement('td');
    codeCell.className = 'material-code-cell';
    
    const nameCell = document.createElement('td');
    nameCell.className = 'material-name-cell';
    
    const unitCell = document.createElement('td');
    unitCell.className = 'material-unit-cell';
    
    const quantityCell = document.createElement('td');
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'quantity-input';
    quantityInput.step = '0.1';
    quantityInput.min = '0';
    quantityInput.placeholder = '0.0';
    quantityInput.onchange = function() { calculateExportItemTotal(this); };
    quantityInput.oninput = function() { calculateExportItemTotal(this); };
    quantityCell.appendChild(quantityInput);
    
    const priceCell = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'price-input';
    priceInput.step = '0.01';
    priceInput.min = '0';
    priceInput.placeholder = '0.00';
    priceInput.onchange = function() { calculateExportItemTotal(this); };
    priceInput.oninput = function() { calculateExportItemTotal(this); };
    priceCell.appendChild(priceInput);
    
    const amountCell = document.createElement('td');
    amountCell.className = 'amount-cell';
    amountCell.textContent = '0';
    
    // Thêm tất cả cells vào row
    row.appendChild(sttCell);
    row.appendChild(selectCell);
    row.appendChild(codeCell);
    row.appendChild(nameCell);
    row.appendChild(unitCell);
    row.appendChild(quantityCell);
    row.appendChild(priceCell);
    row.appendChild(amountCell);
    
    // Re-attach event listener cho select
    materialSelect.onchange = async function() {
        await updateExportItemRow(row, this.value);
    };
    
    tbody.appendChild(row);
    exportItemCounter++;
    updateExportItemNumbers();
}

// Cập nhật thông tin dòng khi chọn nguyên vật liệu
async function updateExportItemRow(row, materialId) {
    if (!materialId) {
        row.querySelector('.material-code-cell').textContent = '';
        row.querySelector('.material-name-cell').textContent = '';
        row.querySelector('.material-unit-cell').textContent = '';
        const priceInput = row.querySelector('.price-input');
        if (priceInput) {
            priceInput.value = '';
            priceInput.removeAttribute('readonly');
        }
        return;
    }
    
    const material = allMaterialsForImport.find(m => m.id === materialId);
    if (material) {
        row.querySelector('.material-code-cell').textContent = material.code || '';
        row.querySelector('.material-name-cell').textContent = material.name || '';
        row.querySelector('.material-unit-cell').textContent = material.unit || '';
        
        row.dataset.materialId = material.id;
        row.dataset.materialCode = material.code || '';
        row.dataset.materialName = material.name || '';
        row.dataset.materialUnit = material.unit || '';
        
        // Lấy đơn giá từ nhập kho
        try {
            const response = await fetch(`/api/admin/materials/${materialId}/import-price`);
            const data = await response.json();
            if (data.success && data.latestPrice > 0) {
                const priceInput = row.querySelector('.price-input');
                if (priceInput) {
                    priceInput.value = data.latestPrice.toFixed(2);
                    priceInput.setAttribute('readonly', 'readonly');
                    priceInput.style.backgroundColor = '#f5f5f5';
                    calculateExportItemTotal(priceInput);
                }
            }
        } catch (error) {
            console.error('Error getting import price:', error);
        }
    }
}

// Tính thành tiền cho một dòng xuất kho
function calculateExportItemTotal(input) {
    const row = input.closest('tr');
    const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
    const unitPrice = parseFloat(row.querySelector('.price-input').value) || 0;
    const amount = Math.round(quantity * unitPrice);
    row.querySelector('.amount-cell').textContent = amount.toLocaleString('vi-VN');
    calculateExportTotal();
}

// Tính tổng tiền xuất kho
function calculateExportTotal() {
    const rows = document.querySelectorAll('#exportItemsTableBody tr');
    let total = 0;
    rows.forEach(row => {
        const amountText = row.querySelector('.amount-cell').textContent.replace(/[^\d]/g, '');
        total += parseInt(amountText) || 0;
    });
    document.getElementById('exportTotalAmount').textContent = total.toLocaleString('vi-VN');
}

// Xóa dòng nguyên vật liệu xuất kho
function removeExportItem(itemId) {
    const row = document.getElementById(`exportItem_${itemId}`);
    if (row) {
        row.remove();
        updateExportItemNumbers();
        calculateExportTotal();
    }
}

// Cập nhật số thứ tự xuất kho
function updateExportItemNumbers() {
    const rows = document.querySelectorAll('#exportItemsTableBody tr');
    rows.forEach((row, index) => {
        row.querySelector('td:first-child').textContent = index + 1;
    });
}

// Load danh sách phiếu xuất kho
async function loadExportReceipts() {
    try {
        const response = await fetch('/api/admin/export-receipts');
        const data = await response.json();
        
        if (data.success) {
            displayExportReceipts(data.receipts);
        } else {
            console.error('Error loading export receipts:', data.error);
        }
    } catch (error) {
        console.error('Error loading export receipts:', error);
    }
}

// Hiển thị danh sách phiếu xuất kho
function displayExportReceipts(receipts) {
    const tbody = document.getElementById('exportReceiptsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (receipts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Chưa có phiếu xuất kho nào</td></tr>';
        return;
    }
    
    receipts.forEach((receipt, index) => {
        const row = document.createElement('tr');
        const exportDate = receipt.exportDate ? new Date(receipt.exportDate).toLocaleDateString('vi-VN') : 'N/A';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${receipt.docNumber || 'N/A'}</strong></td>
            <td>${exportDate}</td>
            <td>${receipt.items ? receipt.items.length : 0}</td>
            <td>${(receipt.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-edit" onclick="editExportReceipt('${receipt.id}')">Sửa</button>
                <button class="btn-delete" onclick="deleteExportReceipt('${receipt.id}')">Xóa</button>
                <button class="btn-primary" onclick="printExportReceiptById('${receipt.id}')">In</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Tìm kiếm phiếu xuất kho
async function searchExportReceipts() {
    const fromDate = document.getElementById('searchExportFromDate').value;
    const toDate = document.getElementById('searchExportToDate').value;
    const docNumber = document.getElementById('searchExportDocNumber').value.trim();
    
    try {
        let url = '/api/admin/export-receipts?';
        const params = [];
        if (fromDate) params.push(`fromDate=${fromDate}`);
        if (toDate) params.push(`toDate=${toDate}`);
        if (docNumber) params.push(`docNumber=${docNumber}`);
        
        url += params.join('&');
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayExportReceipts(data.receipts);
        }
    } catch (error) {
        console.error('Error searching export receipts:', error);
        alert('Có lỗi xảy ra khi tìm kiếm');
    }
}

// Xóa bộ lọc tìm kiếm xuất kho
function resetExportSearch() {
    document.getElementById('searchExportFromDate').value = '';
    document.getElementById('searchExportToDate').value = '';
    document.getElementById('searchExportDocNumber').value = '';
    loadExportReceipts();
}

// Sửa phiếu xuất kho
async function editExportReceipt(receiptId) {
    try {
        const response = await fetch(`/api/admin/export-receipts/${receiptId}`);
        const data = await response.json();
        
        if (data.success) {
            const receipt = data.receipt;
            currentEditExportReceiptId = receiptId;
            
            await loadMaterialsForImport();
            
            document.getElementById('exportDocNumber').value = receipt.docNumber || '';
            const exportDate = receipt.exportDate ? new Date(receipt.exportDate).toISOString().split('T')[0] : '';
            document.getElementById('exportDate').value = exportDate;
            
            document.getElementById('exportItemsTableBody').innerHTML = '';
            exportItemCounter = 0;
            
            if (receipt.items && receipt.items.length > 0) {
                for (const item of receipt.items) {
                    addExportItem();
                    const lastRow = document.querySelector(`#exportItemsTableBody tr:last-child`);
                    if (lastRow) {
                        const materialSelect = lastRow.querySelector('.material-select');
                        if (materialSelect) {
                            materialSelect.value = item.materialId;
                            await updateExportItemRow(lastRow, item.materialId);
                        }
                        const quantityInput = lastRow.querySelector('.quantity-input');
                        if (quantityInput) quantityInput.value = item.quantity;
                        calculateExportItemTotal(quantityInput);
                    }
                }
            }
            
            const submitBtn = document.querySelector('#exportForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Cập Nhật Phiếu Xuất Kho';
            
            document.getElementById('exportModal').style.display = 'block';
        } else {
            alert('Không tìm thấy phiếu xuất kho');
        }
    } catch (error) {
        console.error('Error loading export receipt for edit:', error);
        alert('Có lỗi xảy ra khi tải thông tin phiếu xuất kho');
    }
}

// Xóa phiếu xuất kho
async function deleteExportReceipt(receiptId) {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu xuất kho này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/export-receipts/${receiptId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                alert('Lỗi: ' + (errorData.error || 'Không thể xóa phiếu xuất kho'));
            } catch (e) {
                alert('Lỗi: ' + response.status + ' ' + response.statusText);
            }
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa phiếu xuất kho thành công!');
            loadExportReceipts();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa phiếu xuất kho'));
        }
    } catch (error) {
        console.error('Error deleting export receipt:', error);
        alert('Có lỗi xảy ra khi xóa phiếu xuất kho: ' + error.message);
    }
}

// In phiếu xuất kho (từ form đang nhập)
function printExportReceipt() {
    const docNumber = document.getElementById('exportDocNumber').value;
    const exportDate = document.getElementById('exportDate').value;
    
    const rows = document.querySelectorAll('#exportItemsTableBody tr');
    if (rows.length === 0) {
        alert('Vui lòng thêm ít nhất một nguyên vật liệu!');
        return;
    }
    
    let hasError = false;
    rows.forEach(row => {
        const materialId = row.dataset.materialId;
        const quantity = parseFloat(row.querySelector('.quantity-input').value);
        const unitPrice = parseFloat(row.querySelector('.price-input').value);
        
        if (!materialId || !quantity || !unitPrice) {
            hasError = true;
        }
    });
    
    if (hasError) {
        alert('Vui lòng điền đầy đủ thông tin cho tất cả nguyên vật liệu!');
        return;
    }
    
    let itemsHtml = '';
    let totalAmount = 0;
    rows.forEach((row, index) => {
        const materialCode = row.dataset.materialCode || '';
        const materialName = row.dataset.materialName || '';
        const unit = row.dataset.materialUnit || '';
        const quantity = parseFloat(row.querySelector('.quantity-input').value);
        const unitPrice = parseFloat(row.querySelector('.price-input').value);
        const amount = Math.round(quantity * unitPrice);
        totalAmount += amount;
        
        itemsHtml += `
            <tr>
                <td>${index + 1}</td>
                <td>${materialCode}</td>
                <td>${materialName}</td>
                <td>${unit}</td>
                <td style="text-align: right;">${quantity.toFixed(1)}</td>
                <td style="text-align: right;">${unitPrice.toFixed(2)}</td>
                <td style="text-align: right;">${amount.toLocaleString('vi-VN')}</td>
            </tr>
        `;
    });
    
    const printContent = `
        <div class="print-receipt">
            <div class="receipt-header">
                <h2>PHIẾU XUẤT KHO</h2>
                <p><strong>Số chứng từ:</strong> ${docNumber}</p>
                <p><strong>Ngày xuất:</strong> ${new Date(exportDate).toLocaleDateString('vi-VN')}</p>
            </div>
            <table class="receipt-items-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Mã Số</th>
                        <th>Tên Nguyên Vật Liệu</th>
                        <th>Đơn Vị</th>
                        <th>Số Lượng</th>
                        <th>Đơn Giá</th>
                        <th>Thành Tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="6" style="text-align: right; font-weight: bold;">TỔNG TIỀN:</td>
                        <td style="text-align: right; font-weight: bold; font-size: 1.2em;">${totalAmount.toLocaleString('vi-VN')} VNĐ</td>
                    </tr>
                </tfoot>
            </table>
            <div class="receipt-signatures">
                <div class="signature-box">
                    <p><strong>Thủ kho</strong></p>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-box">
                    <p><strong>Kế toán</strong></p>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-box">
                    <p><strong>Thủ trưởng đơn vị</strong></p>
                    <div class="signature-line"></div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('printExportContent').innerHTML = printContent;
    document.getElementById('printExportModal').style.display = 'block';
}

// In phiếu xuất kho theo ID
async function printExportReceiptById(receiptId) {
    try {
        const response = await fetch(`/api/admin/export-receipts/${receiptId}`);
        const data = await response.json();
        
        if (data.success) {
            const receipt = data.receipt;
            
            let itemsHtml = '';
            receipt.items.forEach((item, index) => {
                itemsHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.materialCode || ''}</td>
                        <td>${item.materialName || ''}</td>
                        <td>${item.unit || ''}</td>
                        <td style="text-align: right;">${item.quantity.toFixed(1)}</td>
                        <td style="text-align: right;">${item.unitPrice.toFixed(2)}</td>
                        <td style="text-align: right;">${item.amount.toLocaleString('vi-VN')}</td>
                    </tr>
                `;
            });
            
            const printContent = `
                <div class="print-receipt">
                    <div class="receipt-header">
                        <h2>PHIẾU XUẤT KHO</h2>
                        <p><strong>Số chứng từ:</strong> ${receipt.docNumber || ''}</p>
                        <p><strong>Ngày xuất:</strong> ${new Date(receipt.exportDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <table class="receipt-items-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Mã Số</th>
                                <th>Tên Nguyên Vật Liệu</th>
                                <th>Đơn Vị</th>
                                <th>Số Lượng</th>
                                <th>Đơn Giá</th>
                                <th>Thành Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="6" style="text-align: right; font-weight: bold;">TỔNG TIỀN:</td>
                                <td style="text-align: right; font-weight: bold; font-size: 1.2em;">${(receipt.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="receipt-signatures">
                        <div class="signature-box">
                            <p><strong>Thủ kho</strong></p>
                            <div class="signature-line"></div>
                        </div>
                        <div class="signature-box">
                            <p><strong>Kế toán</strong></p>
                            <div class="signature-line"></div>
                        </div>
                        <div class="signature-box">
                            <p><strong>Thủ trưởng đơn vị</strong></p>
                            <div class="signature-line"></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('printExportContent').innerHTML = printContent;
            document.getElementById('printExportModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error printing export receipt:', error);
        alert('Có lỗi xảy ra khi in phiếu xuất kho');
    }
}

// Đóng modal in xuất kho
function closePrintExportModal() {
    document.getElementById('printExportModal').style.display = 'none';
}

// Xử lý submit form xuất kho
document.addEventListener('DOMContentLoaded', function() {
    const exportForm = document.getElementById('exportForm');
    if (exportForm) {
        exportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const exportDate = document.getElementById('exportDate').value;
            
            if (!exportDate) {
                alert('Vui lòng chọn ngày xuất kho!');
                return;
            }
            
            const rows = document.querySelectorAll('#exportItemsTableBody tr');
            if (rows.length === 0) {
                alert('Vui lòng thêm ít nhất một nguyên vật liệu!');
                return;
            }
            
            const items = [];
            let hasError = false;
            
            rows.forEach(row => {
                const materialId = row.dataset.materialId;
                const materialCode = row.dataset.materialCode || '';
                const materialName = row.dataset.materialName || '';
                const unit = row.dataset.materialUnit || '';
                const quantity = parseFloat(row.querySelector('.quantity-input').value);
                const unitPrice = parseFloat(row.querySelector('.price-input').value);
                
                if (!materialId || !quantity || quantity <= 0 || !unitPrice || unitPrice <= 0) {
                    hasError = true;
                    return;
                }
                
                items.push({
                    materialId,
                    materialCode,
                    materialName,
                    unit,
                    quantity: quantity.toFixed(1),
                    unitPrice: unitPrice.toFixed(2)
                });
            });
            
            if (hasError || items.length === 0) {
                alert('Vui lòng điền đầy đủ và chính xác thông tin cho tất cả nguyên vật liệu!');
                return;
            }
            
            try {
                let response;
                let data;
                
                if (currentEditExportReceiptId) {
                    response = await fetch(`/api/admin/export-receipts/${currentEditExportReceiptId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            exportDate,
                            items
                        })
                    });
                    
                    // Kiểm tra response status trước khi parse JSON
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Error response:', errorText);
                        try {
                            const errorData = JSON.parse(errorText);
                            alert('Lỗi: ' + (errorData.error || 'Không thể cập nhật phiếu xuất kho'));
                        } catch (e) {
                            alert('Lỗi: ' + response.status + ' ' + response.statusText);
                        }
                        return;
                    }
                    
                    data = await response.json();
                    
                    if (data.success) {
                        alert(`Cập nhật phiếu xuất kho thành công!\nTổng tiền: ${data.totalAmount.toLocaleString('vi-VN')} VNĐ`);
                        closeExportModal();
                        loadExportReceipts();
                    } else {
                        alert('Lỗi: ' + (data.error || 'Không thể cập nhật phiếu xuất kho'));
                    }
                } else {
                    response = await fetch('/api/admin/export-receipts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            exportDate,
                            items
                        })
                    });
                    
                    // Kiểm tra response status trước khi parse JSON
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Error response:', errorText);
                        try {
                            const errorData = JSON.parse(errorText);
                            alert('Lỗi: ' + (errorData.error || 'Không thể lưu phiếu xuất kho'));
                        } catch (e) {
                            alert('Lỗi: ' + response.status + ' ' + response.statusText);
                        }
                        return;
                    }
                    
                    data = await response.json();
                    
                    if (data.success) {
                        alert(`Lưu phiếu xuất kho thành công!\nSố chứng từ: ${data.docNumber}\nTổng tiền: ${data.totalAmount.toLocaleString('vi-VN')} VNĐ`);
                        closeExportModal();
                        loadExportReceipts();
                    } else {
                        alert('Lỗi: ' + (data.error || 'Không thể lưu phiếu xuất kho'));
                    }
                }
            } catch (error) {
                console.error('Error saving export receipt:', error);
                alert('Có lỗi xảy ra khi lưu phiếu xuất kho: ' + error.message);
            }
        });
    }
});

// ==================== QUẢN LÝ TỒN KHO ====================

// Hiển thị phần tồn kho (chuyển đến trang riêng)
function showInventoryBalance() {
    window.location.href = '/admin/inventory-balance';
}

// Load bảng kê tồn kho
async function loadInventoryBalance() {
    try {
        const fromDate = document.getElementById('balanceFromDate').value;
        const toDate = document.getElementById('balanceToDate').value;
        const materialName = document.getElementById('balanceMaterialName').value.trim();
        const materialCode = document.getElementById('balanceMaterialCode').value.trim();
        
        let url = '/api/admin/inventory-balance?';
        const params = [];
        if (fromDate) params.push(`fromDate=${fromDate}`);
        if (toDate) params.push(`toDate=${toDate}`);
        if (materialName) params.push(`materialName=${materialName}`);
        if (materialCode) params.push(`materialCode=${materialCode}`);
        
        url += params.join('&');
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayInventoryBalance(data.balance);
        } else {
            console.error('Error loading inventory balance:', data.error);
            alert('Lỗi: ' + (data.error || 'Không thể tải bảng kê tồn kho'));
        }
    } catch (error) {
        console.error('Error loading inventory balance:', error);
        alert('Có lỗi xảy ra khi tải bảng kê tồn kho');
    }
}

// Hiển thị bảng kê tồn kho
function displayInventoryBalance(balanceData) {
    const tbody = document.getElementById('inventoryBalanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (balanceData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" style="text-align: center; padding: 20px;">Không có dữ liệu tồn kho</td></tr>';
        return;
    }
    
    balanceData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.materialCode || 'N/A'}</strong></td>
            <td>${item.materialName || 'N/A'}</td>
            <td>${item.unit || 'N/A'}</td>
            <!-- Dư đầu kỳ -->
            <td>${item.opening.quantity.toLocaleString('vi-VN')}</td>
            <td>${item.opening.unitPrice.toLocaleString('vi-VN')}</td>
            <td>${item.opening.amount.toLocaleString('vi-VN')}</td>
            <!-- Nhập trong kỳ -->
            <td>${item.import.quantity.toLocaleString('vi-VN')}</td>
            <td>${item.import.unitPrice.toLocaleString('vi-VN')}</td>
            <td>${item.import.amount.toLocaleString('vi-VN')}</td>
            <!-- Xuất trong kỳ -->
            <td>${item.export.quantity.toLocaleString('vi-VN')}</td>
            <td>${item.export.unitPrice.toLocaleString('vi-VN')}</td>
            <td>${item.export.amount.toLocaleString('vi-VN')}</td>
            <!-- Tồn cuối kỳ -->
            <td><strong>${item.closing.quantity.toLocaleString('vi-VN')}</strong></td>
            <td><strong>${item.closing.unitPrice.toLocaleString('vi-VN')}</strong></td>
            <td><strong>${item.closing.amount.toLocaleString('vi-VN')}</strong></td>
        `;
        tbody.appendChild(row);
    });
}

// Xóa bộ lọc tìm kiếm tồn kho
function resetBalanceSearch() {
    document.getElementById('balanceFromDate').value = '';
    document.getElementById('balanceToDate').value = '';
    document.getElementById('balanceMaterialName').value = '';
    document.getElementById('balanceMaterialCode').value = '';
    loadInventoryBalance();
}

// Chuyển đổi tab trong trang tồn kho
function switchInventoryTab(tabName) {
    // Ẩn tất cả các tab content
    document.querySelectorAll('.inventory-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Xóa active class từ tất cả các tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hiển thị tab được chọn
    if (tabName === 'balance') {
        document.getElementById('inventory-balance-section').style.display = 'block';
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
    } else if (tabName === 'opening') {
        document.getElementById('opening-balance-section').style.display = 'block';
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        loadMaterialsForOpeningBalance();
    } else if (tabName === 'view-opening') {
        document.getElementById('view-opening-balance-section').style.display = 'block';
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        loadOpeningBalanceView();
    }
}

// Load danh sách nguyên vật liệu cho bảng nhập số dư đầu kỳ
async function loadMaterialsForOpeningBalance() {
    try {
        const response = await fetch('/api/admin/materials');
        const data = await response.json();
        
        if (data.success && data.materials) {
            const materials = data.materials.filter(m => m.isActive !== false);
            displayMaterialsForOpeningBalance(materials);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải danh sách nguyên vật liệu'));
        }
    } catch (error) {
        console.error('Error loading materials:', error);
        alert('Có lỗi xảy ra khi tải danh sách nguyên vật liệu');
    }
}

// Hiển thị danh sách nguyên vật liệu trong bảng nhập số dư đầu kỳ
async function displayMaterialsForOpeningBalance(materials) {
    const tbody = document.getElementById('openingBalanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (materials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Không có nguyên vật liệu nào</td></tr>';
        return;
    }
    
    // Load số dư đầu kỳ hiện có
    let existingBalances = {};
    try {
        const balanceResponse = await fetch('/api/admin/opening-balance');
        if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            if (balanceData.success && balanceData.balances) {
                balanceData.balances.forEach(b => {
                    existingBalances[b.materialId] = b;
                });
            }
        } else {
            console.warn('Failed to load existing balances:', balanceResponse.status);
        }
    } catch (error) {
        console.error('Error loading existing balances:', error);
    }
    
    materials.forEach((material, index) => {
        const row = document.createElement('tr');
        const existing = existingBalances[material.id] || {};
        const quantity = existing.quantity || 0;
        const unitPrice = existing.unitPrice || 0;
        const amount = quantity * unitPrice;
        
        row.innerHTML = `
            <td class="readonly-cell">${material.code || 'N/A'}</td>
            <td class="readonly-cell">${material.name || 'N/A'}</td>
            <td class="readonly-cell">${material.unit || 'N/A'}</td>
            <td>
                <input type="number" 
                       class="opening-quantity" 
                       data-material-id="${material.id}"
                       value="${quantity}" 
                       step="0.01" 
                       min="0"
                       onchange="calculateOpeningAmount('${material.id}')">
            </td>
            <td>
                <input type="number" 
                       class="opening-price" 
                       data-material-id="${material.id}"
                       value="${unitPrice}" 
                       step="1000" 
                       min="0"
                       onchange="calculateOpeningAmount('${material.id}')">
            </td>
            <td class="opening-amount readonly-cell" data-material-id="${material.id}">${amount.toLocaleString('vi-VN')}</td>
        `;
        tbody.appendChild(row);
    });
}

// Tính thành tiền cho số dư đầu kỳ
function calculateOpeningAmount(materialId) {
    const quantityInput = document.querySelector(`.opening-quantity[data-material-id="${materialId}"]`);
    const priceInput = document.querySelector(`.opening-price[data-material-id="${materialId}"]`);
    const amountCell = document.querySelector(`.opening-amount[data-material-id="${materialId}"]`);
    
    if (quantityInput && priceInput && amountCell) {
        const quantity = parseFloat(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const amount = quantity * price;
        amountCell.textContent = amount.toLocaleString('vi-VN');
    }
}

// Lưu số dư đầu kỳ
async function saveOpeningBalance() {
    try {
        const rows = document.querySelectorAll('#openingBalanceTableBody tr');
        const balances = [];
        
        rows.forEach(row => {
            const quantityInput = row.querySelector('.opening-quantity');
            const priceInput = row.querySelector('.opening-price');
            
            if (quantityInput && priceInput) {
                const materialId = quantityInput.dataset.materialId;
                const quantity = parseFloat(quantityInput.value) || 0;
                const unitPrice = parseFloat(priceInput.value) || 0;
                
                if (materialId && (quantity > 0 || unitPrice > 0)) {
                    balances.push({
                        materialId: materialId,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        amount: quantity * unitPrice
                    });
                }
            }
        });
        
        if (balances.length === 0) {
            alert('Vui lòng nhập ít nhất một số dư đầu kỳ');
            return;
        }
        
        const response = await fetch('/api/admin/opening-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ balances })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Lưu số dư đầu kỳ thành công!');
            loadMaterialsForOpeningBalance();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể lưu số dư đầu kỳ'));
        }
    } catch (error) {
        console.error('Error saving opening balance:', error);
        alert('Có lỗi xảy ra khi lưu số dư đầu kỳ');
    }
}

// Reset form nhập số dư đầu kỳ
function resetOpeningBalanceForm() {
    if (confirm('Bạn có chắc chắn muốn làm mới form? Tất cả dữ liệu chưa lưu sẽ bị mất.')) {
        loadMaterialsForOpeningBalance();
    }
}

// Load và hiển thị số dư đầu kỳ để xem
async function loadOpeningBalanceView() {
    try {
        const materialCode = document.getElementById('openingBalanceSearchCode')?.value.trim() || '';
        const materialName = document.getElementById('openingBalanceSearchName')?.value.trim() || '';
        
        let url = '/api/admin/opening-balance';
        const params = [];
        if (materialCode) params.push(`materialCode=${encodeURIComponent(materialCode)}`);
        if (materialName) params.push(`materialName=${encodeURIComponent(materialName)}`);
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        console.log('Loading opening balance from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayOpeningBalanceView(data.balances);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải số dư đầu kỳ'));
        }
    } catch (error) {
        console.error('Error loading opening balance view:', error);
        alert('Có lỗi xảy ra khi tải số dư đầu kỳ');
    }
}

// Hiển thị số dư đầu kỳ trong bảng xem
function displayOpeningBalanceView(balances) {
    const tbody = document.getElementById('viewOpeningBalanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!balances || balances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Không có dữ liệu số dư đầu kỳ</td></tr>';
        return;
    }
    
    balances.forEach((balance, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${balance.materialCode || 'N/A'}</td>
            <td>${balance.materialName || 'N/A'}</td>
            <td>${balance.unit || 'N/A'}</td>
            <td style="text-align: right;">${(balance.quantity || 0).toLocaleString('vi-VN')}</td>
            <td style="text-align: right;">${(balance.unitPrice || 0).toLocaleString('vi-VN')}</td>
            <td style="text-align: right; font-weight: bold;">${(balance.amount || 0).toLocaleString('vi-VN')}</td>
        `;
        tbody.appendChild(row);
    });
}

// Reset tìm kiếm số dư đầu kỳ
function resetOpeningBalanceSearch() {
    document.getElementById('openingBalanceSearchCode').value = '';
    document.getElementById('openingBalanceSearchName').value = '';
    loadOpeningBalanceView();
}

// In bảng kê tồn kho
function printInventoryBalance() {
    const fromDate = document.getElementById('balanceFromDate').value;
    const toDate = document.getElementById('balanceToDate').value;
    const materialName = document.getElementById('balanceMaterialName').value.trim();
    const materialCode = document.getElementById('balanceMaterialCode').value.trim();
    
    const tbody = document.getElementById('inventoryBalanceTableBody');
    if (!tbody || tbody.children.length === 0) {
        alert('Không có dữ liệu để in!');
        return;
    }
    
    let periodText = '';
    if (fromDate && toDate) {
        periodText = `Từ ngày ${new Date(fromDate).toLocaleDateString('vi-VN')} đến ${new Date(toDate).toLocaleDateString('vi-VN')}`;
    } else if (fromDate) {
        periodText = `Từ ngày ${new Date(fromDate).toLocaleDateString('vi-VN')}`;
    } else if (toDate) {
        periodText = `Đến ngày ${new Date(toDate).toLocaleDateString('vi-VN')}`;
    }
    
    let filterText = '';
    if (materialName) filterText += ` - Tên: ${materialName}`;
    if (materialCode) filterText += ` - Mã: ${materialCode}`;
    
    let tableRows = '';
    Array.from(tbody.children).forEach(row => {
        tableRows += row.outerHTML;
    });
    
    const printContent = `
        <div class="print-receipt">
            <div class="receipt-header">
                <h2>BẢNG KÊ CÂN ĐỐI NGUYÊN VẬT LIỆU TỒN KHO</h2>
                ${periodText ? `<p><strong>Kỳ:</strong> ${periodText}</p>` : ''}
                ${filterText ? `<p><strong>Lọc:</strong> ${filterText}</p>` : ''}
                <p><strong>Ngày in:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
            </div>
            <table class="inventory-balance-table">
                <thead>
                    <tr>
                        <th rowspan="2">Mã Số</th>
                        <th rowspan="2">Tên Nguyên Vật Liệu</th>
                        <th rowspan="2">Đơn Vị Tính</th>
                        <th colspan="3">Dư Đầu Kỳ</th>
                        <th colspan="3">Nhập Trong Kỳ</th>
                        <th colspan="3">Xuất Trong Kỳ</th>
                        <th colspan="3">Tồn Cuối Kỳ</th>
                    </tr>
                    <tr>
                        <th>SL</th>
                        <th>ĐG</th>
                        <th>TT</th>
                        <th>SL</th>
                        <th>ĐG</th>
                        <th>TT</th>
                        <th>SL</th>
                        <th>ĐG</th>
                        <th>TT</th>
                        <th>SL</th>
                        <th>ĐG</th>
                        <th>TT</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="receipt-signatures" style="margin-top: 40px;">
                <div class="signature-box">
                    <p><strong>Người lập</strong></p>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-box">
                    <p><strong>Kế toán trưởng</strong></p>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-box">
                    <p><strong>Thủ trưởng đơn vị</strong></p>
                    <div class="signature-line"></div>
                </div>
            </div>
        </div>
    `;
    
    // Tạo window mới để in
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bảng Kê Tồn Kho</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding: 20px; }
                .print-receipt { width: 100%; }
                .receipt-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .receipt-header h2 { margin: 0 0 10px 0; font-size: 1.8em; text-transform: uppercase; }
                .receipt-header p { margin: 5px 0; font-size: 1em; }
                .inventory-balance-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 0.9em; }
                .inventory-balance-table th, .inventory-balance-table td { border: 1px solid #333; padding: 8px; text-align: center; }
                .inventory-balance-table th { background: #f0f0f0; font-weight: bold; }
                .inventory-balance-table td:first-child, .inventory-balance-table td:nth-child(2), .inventory-balance-table td:nth-child(3) { text-align: left; }
                .receipt-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; }
                .signature-box { text-align: center; }
                .signature-box p { margin: 5px 0; font-weight: bold; }
                .signature-line { height: 60px; border-bottom: 1px solid #333; margin-top: 40px; }
                @media print {
                    body { padding: 0; }
                    .inventory-balance-table { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            ${printContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// Initialize - chỉ load các phần có trên trang hiện tại
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - Setting up forms');
    // Setup form handlers
    setupUserForm();
    setupSupplierForm();
    setupMaterialForm();
    
    // Chỉ load các phần có element tương ứng
    if (document.getElementById('usersTableBody')) {
        console.log('Loading users...');
        loadUsers();
    }
    if (document.getElementById('suppliersTableBody')) {
        console.log('Loading suppliers...');
        loadSuppliers();
    }
    if (document.getElementById('materialsTableBody')) {
        console.log('Loading materials...');
        loadMaterials();
    }
    if (document.getElementById('menuList')) {
        loadMenu();
    }
    if (document.getElementById('combosList')) {
        loadCombos();
    }
    if (document.getElementById('tablesList')) {
        loadTables();
    }
    if (document.getElementById('vouchersList')) {
        loadVouchers();
    }
    if (document.getElementById('importReceiptsTableBody')) {
        loadImportReceipts();
    }
    if (document.getElementById('exportReceiptsTableBody')) {
        loadExportReceipts();
    }
    if (document.getElementById('inventoryBalanceTableBody')) {
        loadInventoryBalance();
    }
    if (document.getElementById('inventoryList')) {
        loadInventory();
    }
    
    // Khởi tạo tab suppliers nếu có
    if (document.getElementById('tab-supplier-list')) {
        switchSupplierTab('list');
    }
    
    // Event listener để đóng modal khi click vào ngoài
    window.onclick = function(event) {
        const supplierDebtModal = document.getElementById('supplierDebtDetailModal');
        if (event.target === supplierDebtModal) {
            closeSupplierDebtDetailModal();
        }
        const addSupplierDebtModal = document.getElementById('addSupplierDebtModal');
        if (event.target === addSupplierDebtModal) {
            closeAddSupplierDebtModal();
        }
        const paySupplierDebtModal = document.getElementById('paySupplierDebtModal');
        if (event.target === paySupplierDebtModal) {
            closePaySupplierDebtModal();
        }
        const printSupplierReceiptModal = document.getElementById('printSupplierReceiptModal');
        if (event.target === printSupplierReceiptModal) {
            closePrintSupplierReceiptModal();
        }
        const editSupplierModal = document.getElementById('editSupplierModal');
        if (event.target === editSupplierModal) {
            closeEditSupplierModal();
        }
    }
    
    // Event listeners cho form Phát Sinh Nợ và Thanh Toán
    const addSupplierDebtForm = document.getElementById('addSupplierDebtForm');
    if (addSupplierDebtForm) {
        addSupplierDebtForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await submitAddSupplierDebt();
        });
    }
    
    const paySupplierDebtForm = document.getElementById('paySupplierDebtForm');
    if (paySupplierDebtForm) {
        paySupplierDebtForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await submitPaySupplierDebt();
        });
    }
    
    // Event listener cho form Sửa Nhà Cung Cấp
    const editSupplierForm = document.getElementById('editSupplierForm');
    if (editSupplierForm) {
        editSupplierForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateSupplierFromModal();
        });
    }
});


