// Biến toàn cục cho phần tạo đơn hàng
if (typeof orderItems === 'undefined') {
    var orderItems = []; // Mảng lưu các món đã thêm vào đơn hàng
}
if (typeof allCustomers === 'undefined') {
    var allCustomers = []; // Danh sách tất cả khách hàng
}
if (typeof allMenuItems === 'undefined') {
    var allMenuItems = []; // Danh sách tất cả món ăn
}
if (typeof allCombos === 'undefined') {
    var allCombos = []; // Danh sách tất cả combo
}
if (typeof currentMenuTab === 'undefined') {
    var currentMenuTab = 'menu'; // 'menu' hoặc 'combo'
}
if (typeof selectedTablesForOrder === 'undefined') {
    var selectedTablesForOrder = []; // Mảng lưu các bàn đã chọn
}

// Load dữ liệu khi tab được mở
async function loadDataForCreateOrder() {
    await Promise.all([
        loadCustomers(),
        loadMenuItems(),
        loadCombos(),
        loadTablesForOrder()
    ]);
}

// Load danh sách khách hàng
async function loadCustomers() {
    try {
        const response = await fetch('/api/manager/customers');
        const data = await response.json();
        if (data.success) {
            allCustomers = data.customers || [];
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Load danh sách món ăn
async function loadMenuItems() {
    try {
        const response = await fetch('/api/manager/menu-items');
        const data = await response.json();
        if (data.success) {
            allMenuItems = (data.items || data.menuItems || []).filter(item => item.isActive !== false);
            if (currentMenuTab === 'menu') {
                displayMenuItemsForOrder();
            }
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
    }
}

// Load danh sách combo
async function loadCombos() {
    try {
        const response = await fetch('/api/manager/combos');
        const data = await response.json();
        if (data.success) {
            allCombos = (data.combos || []).filter(combo => combo.isActive !== false);
            if (currentMenuTab === 'combo') {
                displayCombosForOrder();
            }
        }
    } catch (error) {
        console.error('Error loading combos:', error);
    }
}

// Hiển thị món ăn
function displayMenuItemsForOrder() {
    const container = document.getElementById('menuListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (allMenuItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Chưa có món ăn nào</p>';
        return;
    }
    
    allMenuItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-item-card';
        card.innerHTML = `
            <div class="menu-item-info">
                <h4>${item.name || 'Chưa có tên'}</h4>
                <p>${item.unit || 'Đĩa'}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="menu-item-price">${(item.price || 0).toLocaleString('vi-VN')} VNĐ</span>
                <button class="btn-add-item" onclick="addItemToOrder('${item.id}', 'menu', '${item.name}', ${item.price || 0}, '${item.unit || 'Đĩa'}')">Thêm</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Hiển thị combo
function displayCombosForOrder() {
    const container = document.getElementById('menuListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (allCombos.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Chưa có combo nào</p>';
        return;
    }
    
    allCombos.forEach(combo => {
        const card = document.createElement('div');
        card.className = 'menu-item-card';
        card.innerHTML = `
            <div class="menu-item-info">
                <h4>${combo.name || 'Chưa có tên'}</h4>
                <p>Combo</p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="menu-item-price">${(combo.price || 0).toLocaleString('vi-VN')} VNĐ</span>
                <button class="btn-add-item" onclick="addItemToOrder('${combo.id}', 'combo', '${combo.name}', ${combo.price || 0}, 'Combo')">Thêm</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Chuyển tab menu/combo
function showMenuTabForOrder() {
    currentMenuTab = 'menu';
    document.getElementById('menuTabBtnCreate').classList.add('active');
    document.getElementById('comboTabBtnCreate').classList.remove('active');
    if (document.getElementById('allTabBtnCreate')) {
        document.getElementById('allTabBtnCreate').classList.remove('active');
    }
    displayMenuItemsForOrder();
}

function showComboTabForOrder() {
    currentMenuTab = 'combo';
    document.getElementById('menuTabBtnCreate').classList.remove('active');
    document.getElementById('comboTabBtnCreate').classList.add('active');
    if (document.getElementById('allTabBtnCreate')) {
        document.getElementById('allTabBtnCreate').classList.remove('active');
    }
    displayCombosForOrder();
}

// Hiển thị tất cả (cả menu và combo)
function showAllMenuForOrder() {
    currentMenuTab = 'all';
    document.getElementById('menuTabBtnCreate').classList.remove('active');
    document.getElementById('comboTabBtnCreate').classList.remove('active');
    document.getElementById('allTabBtnCreate').classList.add('active');
    displayAllMenuForOrder();
}

// Hiển thị cả menu và combo
function displayAllMenuForOrder() {
    const container = document.getElementById('menuListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Hiển thị món ăn
    if (allMenuItems.length > 0) {
        const menuHeader = document.createElement('div');
        menuHeader.style.cssText = 'padding: 10px; background: #8d5524; color: white; font-weight: bold; margin-bottom: 10px; border-radius: 4px;';
        menuHeader.textContent = 'Món ăn';
        container.appendChild(menuHeader);
        
        allMenuItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-item-card';
            card.innerHTML = `
                <div class="menu-item-info">
                    <h4>${item.name || 'Chưa có tên'}</h4>
                    <p>${item.unit || 'Đĩa'}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="menu-item-price">${(item.price || 0).toLocaleString('vi-VN')} VNĐ</span>
                    <button class="btn-add-item" onclick="addItemToOrder('${item.id}', 'menu', '${item.name}', ${item.price || 0}, '${item.unit || 'Đĩa'}')">Thêm</button>
                </div>
            `;
            container.appendChild(card);
        });
    }
    
    // Hiển thị combo
    if (allCombos.length > 0) {
        const comboHeader = document.createElement('div');
        comboHeader.style.cssText = 'padding: 10px; background: #8d5524; color: white; font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-radius: 4px;';
        comboHeader.textContent = 'Combo';
        container.appendChild(comboHeader);
        
        allCombos.forEach(combo => {
            const card = document.createElement('div');
            card.className = 'menu-item-card';
            card.innerHTML = `
                <div class="menu-item-info">
                    <h4>${combo.name || 'Chưa có tên'}</h4>
                    <p>Combo</p>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="menu-item-price">${(combo.price || 0).toLocaleString('vi-VN')} VNĐ</span>
                    <button class="btn-add-item" onclick="addItemToOrder('${combo.id}', 'combo', '${combo.name}', ${combo.price || 0}, 'Combo')">Thêm</button>
                </div>
            `;
            container.appendChild(card);
        });
    }
    
    if (allMenuItems.length === 0 && allCombos.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Chưa có món ăn hoặc combo nào</p>';
    }
}

// Tìm kiếm menu
async function searchMenuForOrder() {
    const searchInput = document.getElementById('menuSearchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        if (currentMenuTab === 'menu') {
            displayMenuItemsForOrder();
        } else if (currentMenuTab === 'combo') {
            displayCombosForOrder();
        } else if (currentMenuTab === 'all') {
            displayAllMenuForOrder();
        }
        return;
    }
    
    try {
        const response = await fetch(`/api/customer/menu/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        const container = document.getElementById('menuListContainer');
        container.innerHTML = '';
        
        if (data.success && data.menu && data.menu.length > 0) {
            data.menu.forEach(item => {
                const card = document.createElement('div');
                card.className = 'menu-item-card';
                const itemType = item.type === 'menu' ? 'menu' : 'combo';
                const itemName = item.name || 'Chưa có tên';
                const itemPrice = item.price || 0;
                const itemUnit = item.unit || (item.type === 'combo' ? 'Combo' : 'Đĩa');
                
                card.innerHTML = `
                    <div class="menu-item-info">
                        <h4>${itemName}</h4>
                        <p>${itemUnit}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="menu-item-price">${itemPrice.toLocaleString('vi-VN')} VNĐ</span>
                        <button class="btn-add-item" onclick="addItemToOrder('${item.id}', '${itemType}', '${itemName}', ${itemPrice}, '${itemUnit}')">Thêm</button>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Không tìm thấy kết quả</p>';
        }
    } catch (error) {
        console.error('Error searching menu:', error);
    }
}

function handleMenuSearchKeyPress(event) {
    if (event.key === 'Enter') {
        searchMenuForOrder();
    }
}

// Thêm món vào đơn hàng
function addItemToOrder(itemId, itemType, itemName, itemPrice, itemUnit) {
    // Kiểm tra xem món đã có trong đơn hàng chưa
    const existingItem = orderItems.find(item => item.menuId === itemId && item.type === itemType);
    
    if (existingItem) {
        // Nếu đã có, tăng số lượng
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        // Nếu chưa có, thêm mới
        orderItems.push({
            menuId: itemId,
            type: itemType,
            name: itemName,
            price: itemPrice,
            unit: itemUnit,
            quantity: 1
        });
    }
    
    updateOrderItemsTable();
}

// Cập nhật bảng danh sách thực đơn
function updateOrderItemsTable() {
    const tbody = document.getElementById('orderItemsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (orderItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Chưa có món nào trong đơn hàng</td></tr>';
        updateOrderTotal();
        return;
    }
    
    orderItems.forEach((item, index) => {
        const row = document.createElement('tr');
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        const total = quantity * price;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" value="${item.name || ''}" onchange="updateOrderItem(${index}, 'name', this.value)" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>
            <td>${item.unit || 'Đĩa'}</td>
            <td><input type="number" value="${quantity}" min="0.1" step="0.1" onchange="updateOrderItem(${index}, 'quantity', parseFloat(this.value))" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>
            <td><input type="number" value="${price}" min="0" onchange="updateOrderItem(${index}, 'price', parseFloat(this.value))" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>
            <td>${Math.round(total).toLocaleString('vi-VN')} VNĐ</td>
            <td><button class="btn-delete-item" onclick="removeOrderItem(${index})">Xóa</button></td>
        `;
        tbody.appendChild(row);
    });
    
    updateOrderTotal();
}

// Cập nhật item trong đơn hàng
function updateOrderItem(index, field, value) {
    if (index >= 0 && index < orderItems.length) {
        if (field === 'quantity') {
            if (value <= 0) {
                alert('Số lượng phải lớn hơn 0');
                updateOrderItemsTable();
                return;
            }
            orderItems[index].quantity = value;
        } else if (field === 'price') {
            if (value < 0) {
                alert('Đơn giá không được âm');
                updateOrderItemsTable();
                return;
            }
            orderItems[index].price = value;
        } else if (field === 'name') {
            orderItems[index].name = value;
        }
        updateOrderItemsTable();
    }
}

// Xóa item khỏi đơn hàng
function removeOrderItem(index) {
    if (confirm('Bạn có chắc muốn xóa món này khỏi đơn hàng?')) {
        orderItems.splice(index, 1);
        updateOrderItemsTable();
    }
}

// Cập nhật tổng tiền
function updateOrderTotal() {
    const total = orderItems.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        return sum + (quantity * price);
    }, 0);
    
    const totalElement = document.getElementById('orderTotalAmount');
    if (totalElement) {
        totalElement.textContent = Math.round(total).toLocaleString('vi-VN');
    }
}

// Tìm kiếm khách hàng
function filterCustomersForOrder() {
    const searchInput = document.getElementById('customerSearch');
    const query = searchInput.value.trim().toLowerCase();
    const dropdown = document.getElementById('customerDropdown');
    
    if (!query) {
        dropdown.style.display = 'none';
        return;
    }
    
    const filtered = allCustomers.filter(customer => {
        const name = (customer.name || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        return name.includes(query) || phone.includes(query);
    });
    
    dropdown.innerHTML = '';
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="customer-dropdown-item">Không tìm thấy khách hàng</div>';
    } else {
        filtered.slice(0, 10).forEach(customer => {
            const item = document.createElement('div');
            item.className = 'customer-dropdown-item';
            item.innerHTML = `<strong>${customer.name || 'N/A'}</strong> - ${customer.phone || 'N/A'}`;
            item.onclick = () => selectCustomerForOrder(customer);
            dropdown.appendChild(item);
        });
    }
    
    dropdown.style.display = 'block';
}

// Chọn khách hàng
function selectCustomerForOrder(customer) {
    document.getElementById('selectedCustomerId').value = customer.id;
    document.getElementById('selectedCustomerName').textContent = customer.name || 'N/A';
    document.getElementById('selectedCustomerPhone').textContent = customer.phone || 'N/A';
    document.getElementById('selectedCustomerInfo').style.display = 'block';
    document.getElementById('customerSearch').value = '';
    document.getElementById('customerDropdown').style.display = 'none';
    document.getElementById('customerNameInput').style.display = 'none';
    document.getElementById('customerPhoneInput').style.display = 'none';
}

// Xóa lựa chọn khách hàng
function clearCustomerSelection() {
    document.getElementById('selectedCustomerId').value = '';
    document.getElementById('selectedCustomerInfo').style.display = 'none';
    const customerNameInput = document.getElementById('customerNameInput');
    const customerPhoneInput = document.getElementById('customerPhoneInput');
    if (customerNameInput) {
        customerNameInput.style.display = 'block';
        customerNameInput.value = '';
    }
    if (customerPhoneInput) {
        customerPhoneInput.style.display = 'block';
        customerPhoneInput.value = '';
    }
}

// Load bàn ăn
async function loadTablesForOrder() {
    try {
        const response = await fetch('/api/manager/tables');
        const data = await response.json();
        if (data.success) {
            // Lưu danh sách bàn để sử dụng khi mở modal
            window.availableTablesForOrder = data.tables || [];
        }
    } catch (error) {
        console.error('Error loading tables:', error);
    }
}

// Mở modal chọn bàn
function openSelectTableForOrder() {
    const modal = document.getElementById('selectTableForOrderModal');
    const grid = document.getElementById('tablesGridSelectForOrder');
    
    if (!window.availableTablesForOrder) {
        loadTablesForOrder().then(() => {
            displayTablesForOrderSelection();
            modal.style.display = 'flex';
        });
    } else {
        displayTablesForOrderSelection();
        modal.style.display = 'flex';
    }
}

// Hiển thị bàn để chọn
function displayTablesForOrderSelection() {
    const grid = document.getElementById('tablesGridSelectForOrder');
    if (!grid || !window.availableTablesForOrder) return;
    
    grid.innerHTML = '';
    
    window.availableTablesForOrder.forEach(table => {
        const card = document.createElement('div');
        card.className = 'table-card-select';
        
        if (table.status === 'occupied' || table.status === 'reserved') {
            card.classList.add(table.status);
            card.style.cursor = 'not-allowed';
        }
        
        const isSelected = selectedTablesForOrder.includes(table.number);
        if (isSelected) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <input type="checkbox" ${isSelected ? 'checked' : ''} 
                   ${table.status === 'occupied' || table.status === 'reserved' ? 'disabled' : ''}
                   onchange="toggleTableSelectionForOrder(${table.number}, this.checked)">
            <div style="margin-top: 10px;">
                <strong>Bàn ${table.number}</strong>
                <p style="font-size: 12px; margin: 5px 0;">${table.status === 'available' ? 'Trống' : table.status === 'reserved' ? 'Đã đặt' : 'Đang dùng'}</p>
            </div>
        `;
        
        card.onclick = (e) => {
            if (e.target.type !== 'checkbox' && table.status === 'available') {
                const checkbox = card.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                toggleTableSelectionForOrder(table.number, checkbox.checked);
            }
        };
        
        grid.appendChild(card);
    });
    
    updateSelectedTablesCountForOrder();
}

// Toggle chọn bàn
function toggleTableSelectionForOrder(tableNumber, isSelected) {
    if (isSelected) {
        if (!selectedTablesForOrder.includes(tableNumber)) {
            selectedTablesForOrder.push(tableNumber);
        }
    } else {
        const index = selectedTablesForOrder.indexOf(tableNumber);
        if (index > -1) {
            selectedTablesForOrder.splice(index, 1);
        }
    }
    updateSelectedTablesCountForOrder();
}

// Cập nhật số lượng bàn đã chọn
function updateSelectedTablesCountForOrder() {
    const count = selectedTablesForOrder.length;
    const countElement = document.getElementById('selectedTablesCountForOrder');
    if (countElement) {
        countElement.textContent = `Đã chọn: ${count} bàn`;
    }
}

// Xác nhận chọn bàn
function confirmTableSelectionForOrder() {
    const selectedTablesDisplay = document.getElementById('selectedTablesDisplay');
    const selectedTablesList = document.getElementById('selectedTablesList');
    const selectedTableNumbers = document.getElementById('selectedTableNumbers');
    
    if (selectedTablesList) {
        selectedTablesList.textContent = selectedTablesForOrder.sort((a, b) => a - b).join(', ');
    }
    if (selectedTableNumbers) {
        selectedTableNumbers.value = JSON.stringify(selectedTablesForOrder);
    }
    if (selectedTablesDisplay) {
        selectedTablesDisplay.style.display = 'block';
    }
    
    closeSelectTableForOrderModal();
}

// Xóa lựa chọn bàn
function clearTableSelection() {
    selectedTablesForOrder = [];
    document.getElementById('selectedTablesDisplay').style.display = 'none';
    document.getElementById('selectedTableNumbers').value = '';
}

// Đóng modal chọn bàn
function closeSelectTableForOrderModal() {
    document.getElementById('selectTableForOrderModal').style.display = 'none';
}

// Reset form
function resetCreateOrderForm() {
    orderItems = [];
    selectedTablesForOrder = [];
    const form = document.getElementById('createOrderForm');
    if (form) {
        form.reset();
    }
    document.getElementById('selectedCustomerId').value = '';
    document.getElementById('selectedCustomerInfo').style.display = 'none';
    document.getElementById('selectedTablesDisplay').style.display = 'none';
    const customerNameInput = document.getElementById('customerNameInput');
    const customerPhoneInput = document.getElementById('customerPhoneInput');
    if (customerNameInput) {
        customerNameInput.style.display = 'block';
        customerNameInput.value = '';
    }
    if (customerPhoneInput) {
        customerPhoneInput.style.display = 'block';
        customerPhoneInput.value = '';
    }
    updateOrderItemsTable();
    
    // Set thời gian ăn mặc định (1 giờ sau hiện tại)
    const eatingTimeInput = document.getElementById('eatingTime');
    if (eatingTimeInput) {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        eatingTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Reset menu tab
    showMenuTabForOrder();
}

// Xem trước Order
async function previewManagerOrder() {
    if (orderItems.length === 0) {
        alert('Vui lòng thêm ít nhất một món vào đơn hàng');
        return;
    }
    
    const customerId = document.getElementById('selectedCustomerId').value;
    const customerNameInput = document.getElementById('customerNameInput');
    const customerPhoneInput = document.getElementById('customerPhoneInput');
    const customerName = customerId ? document.getElementById('selectedCustomerName').textContent : (customerNameInput.value || 'Khách lẻ');
    const customerPhone = customerId ? document.getElementById('selectedCustomerPhone').textContent : (customerPhoneInput.value || '');
    const numberOfPeople = parseInt(document.getElementById('numberOfPeople').value) || 1;
    const eatingTime = document.getElementById('eatingTime').value;
    
    if (!eatingTime) {
        alert('Vui lòng chọn thời gian ăn');
        return;
    }
    
    // Tạo order number ngẫu nhiên
    const orderNumber = Math.floor(10000 + Math.random() * 90000);
    
    // Hiển thị modal
    const modal = document.getElementById('previewManagerOrderModal');
    const body = document.getElementById('previewManagerOrderBody');
    
    // Tính tổng tiền
    const totalAmount = orderItems.reduce((sum, item) => {
        return sum + ((item.quantity || 1) * (item.price || 0));
    }, 0);
    
    // Format ngày
    const now = new Date();
    const orderDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    
    // Format thời gian ăn
    const eatingTimeDate = new Date(eatingTime);
    const eatingTimeFormatted = `${String(eatingTimeDate.getDate()).padStart(2, '0')}/${String(eatingTimeDate.getMonth() + 1).padStart(2, '0')}/${eatingTimeDate.getFullYear()}, ${String(eatingTimeDate.getHours()).padStart(2, '0')}:${String(eatingTimeDate.getMinutes()).padStart(2, '0')}`;
    
    // Lấy công nợ nếu có customerId
    let debt = 0;
    if (customerId) {
        try {
            const debtResponse = await fetch(`/api/manager/customers/${customerId}/debt`);
            const debtData = await debtResponse.json();
            if (debtData.success) {
                debt = debtData.closingBalance || 0;
            }
        } catch (error) {
            console.error('Error loading debt:', error);
        }
    }
    
    body.innerHTML = `
        <div class="preview-business-info">
            <p><strong>Đơn vị phát hành:</strong> Hộ kinh doanh: Lê Kỳ Anh, địa chỉ tại Sơn Dương, T. Tuyên Quang.</p>
        </div>
        
        <div class="preview-transaction-info">
            <h3>Thông tin giao dịch:</h3>
            <p><strong>Người mua:</strong> ${customerName}</p>
            <p><strong>Ngày lập:</strong> ${orderDate}</p>
            <p><strong>Số Order:</strong> ${orderNumber}</p>
            <p><strong>Thời gian ăn:</strong> ${eatingTimeFormatted}</p>
            <p><strong>Số lượng người:</strong> ${numberOfPeople}</p>
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
                    ${orderItems.map((item, index) => {
                        const quantity = item.quantity || 1;
                        const price = item.price || 0;
                        const amount = quantity * price;
                        const quantityFormatted = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
                        return `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.name || 'N/A'}</td>
                                <td>${item.unit || 'Đĩa'}</td>
                                <td>${quantityFormatted}</td>
                                <td>${Math.round(price).toLocaleString('vi-VN')} VNĐ</td>
                                <td>${Math.round(amount).toLocaleString('vi-VN')} VNĐ</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="preview-summary">
            <p><strong>Tổng cộng thành tiền hàng hóa:</strong> <span>${Math.round(totalAmount).toLocaleString('vi-VN')} VNĐ</span></p>
            <p><strong>Tiền chiết khấu:</strong> <span>0 VNĐ</span></p>
            <p><strong>Tổng thanh toán (Thực nhận):</strong> <span>${Math.round(totalAmount).toLocaleString('vi-VN')} VNĐ</span></p>
            <p><strong>Lũy kế còn nợ:</strong> <span>${Math.round(debt).toLocaleString('vi-VN')} VNĐ</span></p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Đóng modal xem trước
function closePreviewManagerOrderModal() {
    document.getElementById('previewManagerOrderModal').style.display = 'none';
}

// Xử lý submit form và khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    // Load dữ liệu khi tab được mở lần đầu
    const createTab = document.getElementById('tab-create');
    if (createTab) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (createTab.classList.contains('active')) {
                        loadDataForCreateOrder();
                    }
                }
            });
        });
        observer.observe(createTab, { attributes: true });
    }
    
    const form = document.getElementById('createOrderForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (orderItems.length === 0) {
                alert('Vui lòng thêm ít nhất một món vào đơn hàng');
                return;
            }
            
            const customerId = document.getElementById('selectedCustomerId').value;
            const customerNameInput = document.getElementById('customerNameInput');
            const customerPhoneInput = document.getElementById('customerPhoneInput');
            const customerName = customerId ? document.getElementById('selectedCustomerName').textContent : customerNameInput.value;
            const customerPhone = customerId ? document.getElementById('selectedCustomerPhone').textContent : customerPhoneInput.value;
            
            if (!customerName || !customerPhone) {
                alert('Vui lòng nhập thông tin khách hàng');
                return;
            }
            
            const numberOfPeople = parseInt(document.getElementById('numberOfPeople').value) || 1;
            const eatingTime = document.getElementById('eatingTime').value;
            
            if (!eatingTime) {
                alert('Vui lòng chọn thời gian ăn');
                return;
            }
            
            const tableNumbers = selectedTablesForOrder.length > 0 ? selectedTablesForOrder : null;
            const notes = document.getElementById('orderNotes').value || '';
            
            // Tính tổng tiền
            const total = orderItems.reduce((sum, item) => {
                return sum + ((item.quantity || 1) * (item.price || 0));
            }, 0);
            
            try {
                const response = await fetch('/api/manager/orders/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customerId: customerId || null,
                        customerName,
                        customerPhone,
                        items: orderItems,
                        total,
                        discount: 0,
                        finalTotal: total,
                        numberOfPeople,
                        eatingTime,
                        tableNumbers,
                        notes,
                        deliveryType: 'at-table'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Tạo đơn hàng thành công!');
                    resetCreateOrderForm();
                    // Chuyển sang tab Cập nhật đơn hàng
                    if (typeof switchOrderTab === 'function') {
                        switchOrderTab('update');
                    }
                } else {
                    alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error creating order:', error);
                alert('Có lỗi xảy ra khi tạo đơn hàng');
            }
        });
    }
    
    // Ẩn dropdown khi click bên ngoài
    document.addEventListener('click', function(e) {
        const searchContainer = document.getElementById('customerSearch');
        const dropdown = document.getElementById('customerDropdown');
        if (searchContainer && dropdown && !searchContainer.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Set thời gian ăn mặc định khi mở tab
    const eatingTimeInput = document.getElementById('eatingTime');
    if (eatingTimeInput && !eatingTimeInput.value) {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        eatingTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
});

// Export functions để có thể gọi từ HTML
window.filterCustomersForOrder = filterCustomersForOrder;
window.selectCustomerForOrder = selectCustomerForOrder;
window.clearCustomerSelection = clearCustomerSelection;
window.showMenuTabForOrder = showMenuTabForOrder;
window.showComboTabForOrder = showComboTabForOrder;
window.showAllMenuForOrder = showAllMenuForOrder;
window.searchMenuForOrder = searchMenuForOrder;
window.handleMenuSearchKeyPress = handleMenuSearchKeyPress;
window.addItemToOrder = addItemToOrder;
window.updateOrderItem = updateOrderItem;
window.removeOrderItem = removeOrderItem;
window.openSelectTableForOrder = openSelectTableForOrder;
window.toggleTableSelectionForOrder = toggleTableSelectionForOrder;
window.confirmTableSelectionForOrder = confirmTableSelectionForOrder;
window.closeSelectTableForOrderModal = closeSelectTableForOrderModal;
window.clearTableSelection = clearTableSelection;
window.resetCreateOrderForm = resetCreateOrderForm;
window.previewManagerOrder = previewManagerOrder;
window.closePreviewManagerOrderModal = closePreviewManagerOrderModal;

