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

// Các hàm tìm kiếm khách hàng đã được loại bỏ - giờ chỉ nhập thủ công Tên KH và SĐT

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

// Xử lý thay đổi hình thức
function handleDeliveryTypeChange() {
    const deliveryType = document.getElementById('deliveryType').value;
    const atTableFields = document.getElementById('atTableFields');
    const takeawayFields = document.getElementById('takeawayFields');
    const deliveryFields = document.getElementById('deliveryFields');
    
    // Ẩn tất cả các field
    if (atTableFields) atTableFields.style.display = 'none';
    if (takeawayFields) takeawayFields.style.display = 'none';
    if (deliveryFields) deliveryFields.style.display = 'none';
    
    // Bỏ required từ tất cả các field
    const allRequiredFields = document.querySelectorAll('#atTableFields input[required], #takeawayFields input[required], #deliveryFields input[required], #deliveryFields textarea[required]');
    allRequiredFields.forEach(field => {
        field.removeAttribute('required');
    });
    
    // Hiển thị và set required cho field tương ứng
    if (deliveryType === 'at-table') {
        if (atTableFields) atTableFields.style.display = 'block';
        const numberOfPeople = document.getElementById('numberOfPeople');
        const eatingTime = document.getElementById('eatingTime');
        if (numberOfPeople) numberOfPeople.setAttribute('required', 'required');
        if (eatingTime) eatingTime.setAttribute('required', 'required');
    } else if (deliveryType === 'takeaway') {
        if (takeawayFields) takeawayFields.style.display = 'block';
        const pickupTime = document.getElementById('pickupTime');
        if (pickupTime) pickupTime.setAttribute('required', 'required');
    } else if (deliveryType === 'delivery') {
        if (deliveryFields) deliveryFields.style.display = 'block';
        const deliveryTime = document.getElementById('deliveryTime');
        const deliveryAddress = document.getElementById('deliveryAddress');
        if (deliveryTime) deliveryTime.setAttribute('required', 'required');
        if (deliveryAddress) deliveryAddress.setAttribute('required', 'required');
    }
}

// Reset form
function resetCreateOrderForm() {
    orderItems = [];
    selectedTablesForOrder = [];
    const form = document.getElementById('createOrderForm');
    if (form) {
        form.reset();
    }
    
    // Reset các input khách hàng (đã thay đổi từ autocomplete sang nhập thủ công)
    const customerNameInput = document.getElementById('customerNameInput');
    const customerPhoneInput = document.getElementById('customerPhoneInput');
    if (customerNameInput) {
        customerNameInput.value = '';
    }
    if (customerPhoneInput) {
        customerPhoneInput.value = '';
    }
    
    // Reset hiển thị bàn đã chọn
    const selectedTablesDisplay = document.getElementById('selectedTablesDisplay');
    if (selectedTablesDisplay) {
        selectedTablesDisplay.style.display = 'none';
    }
    
    // Reset các field thời gian
    const eatingTimeInput = document.getElementById('eatingTime');
    if (eatingTimeInput) eatingTimeInput.value = '';
    const pickupTimeInput = document.getElementById('pickupTime');
    if (pickupTimeInput) pickupTimeInput.value = '';
    const deliveryTimeInput = document.getElementById('deliveryTime');
    if (deliveryTimeInput) deliveryTimeInput.value = '';
    const deliveryAddressInput = document.getElementById('deliveryAddress');
    if (deliveryAddressInput) deliveryAddressInput.value = '';
    
    updateOrderItemsTable();
    
    // Reset delivery type về mặc định và hiển thị field tương ứng
    const deliveryTypeSelect = document.getElementById('deliveryType');
    if (deliveryTypeSelect) {
        deliveryTypeSelect.value = 'at-table';
        handleDeliveryTypeChange();
        
        // Set thời gian mặc định cho field ăn tại bàn
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
    
    const customerNameInput = document.getElementById('customerNameInput');
    const customerPhoneInput = document.getElementById('customerPhoneInput');
    const customerName = customerNameInput ? customerNameInput.value.trim() : '';
    const customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
    
    if (!customerName || !customerPhone) {
        alert('Vui lòng nhập đầy đủ tên khách hàng và số điện thoại');
        return;
    }
    
    const deliveryType = document.getElementById('deliveryType').value;
    let numberOfPeople = 1;
    let eatingTime = null;
    let pickupTime = null;
    let deliveryTime = null;
    let deliveryAddress = '';
    
    if (deliveryType === 'at-table') {
        numberOfPeople = parseInt(document.getElementById('numberOfPeople').value) || 1;
        eatingTime = document.getElementById('eatingTime').value;
        if (!eatingTime) {
            alert('Vui lòng chọn thời gian ăn');
            return;
        }
    } else if (deliveryType === 'takeaway') {
        pickupTime = document.getElementById('pickupTime').value;
        if (!pickupTime) {
            alert('Vui lòng chọn thời gian lấy hàng');
            return;
        }
    } else if (deliveryType === 'delivery') {
        deliveryTime = document.getElementById('deliveryTime').value;
        deliveryAddress = document.getElementById('deliveryAddress').value.trim();
        if (!deliveryTime) {
            alert('Vui lòng chọn thời gian giao hàng');
            return;
        }
        if (!deliveryAddress) {
            alert('Vui lòng nhập địa chỉ giao hàng');
            return;
        }
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
    
    // Format thời gian dựa trên deliveryType
    let timeInfo = '';
    if (deliveryType === 'at-table' && eatingTime) {
        const eatingTimeDate = new Date(eatingTime);
        const eatingTimeFormatted = `${String(eatingTimeDate.getDate()).padStart(2, '0')}/${String(eatingTimeDate.getMonth() + 1).padStart(2, '0')}/${eatingTimeDate.getFullYear()}, ${String(eatingTimeDate.getHours()).padStart(2, '0')}:${String(eatingTimeDate.getMinutes()).padStart(2, '0')}`;
        timeInfo = `<p><strong>Thời gian ăn:</strong> ${eatingTimeFormatted}</p><p><strong>Số lượng người:</strong> ${numberOfPeople}</p>`;
    } else if (deliveryType === 'takeaway' && pickupTime) {
        const pickupTimeDate = new Date(pickupTime);
        const pickupTimeFormatted = `${String(pickupTimeDate.getDate()).padStart(2, '0')}/${String(pickupTimeDate.getMonth() + 1).padStart(2, '0')}/${pickupTimeDate.getFullYear()}, ${String(pickupTimeDate.getHours()).padStart(2, '0')}:${String(pickupTimeDate.getMinutes()).padStart(2, '0')}`;
        timeInfo = `<p><strong>Thời gian lấy hàng:</strong> ${pickupTimeFormatted}</p>`;
    } else if (deliveryType === 'delivery' && deliveryTime) {
        const deliveryTimeDate = new Date(deliveryTime);
        const deliveryTimeFormatted = `${String(deliveryTimeDate.getDate()).padStart(2, '0')}/${String(deliveryTimeDate.getMonth() + 1).padStart(2, '0')}/${deliveryTimeDate.getFullYear()}, ${String(deliveryTimeDate.getHours()).padStart(2, '0')}:${String(deliveryTimeDate.getMinutes()).padStart(2, '0')}`;
        timeInfo = `<p><strong>Thời gian giao hàng:</strong> ${deliveryTimeFormatted}</p><p><strong>Địa chỉ giao hàng:</strong> ${deliveryAddress}</p>`;
    }
    
    // Không cần lấy công nợ vì không có customerId khi nhập thủ công
    let debt = 0;
    
    body.innerHTML = `
        <div class="preview-business-info">
            <p><strong>Đơn vị phát hành:</strong> Hộ kinh doanh: Lê Kỳ Anh, địa chỉ tại Sơn Dương, T. Tuyên Quang.</p>
        </div>
        
        <div class="preview-transaction-info">
            <h3>Thông tin giao dịch:</h3>
            <p><strong>Người mua:</strong> ${customerName}</p>
            <p><strong>Ngày lập:</strong> ${orderDate}</p>
            <p><strong>Số Order:</strong> ${orderNumber}</p>
            <p><strong>Hình thức:</strong> ${deliveryType === 'at-table' ? 'Ăn tại bàn' : deliveryType === 'takeaway' ? 'Mang về' : 'Giao hàng'}</p>
            ${timeInfo}
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
            
            const customerNameInput = document.getElementById('customerNameInput');
            const customerPhoneInput = document.getElementById('customerPhoneInput');
            const customerName = customerNameInput ? customerNameInput.value.trim() : '';
            const customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
            
            if (!customerName || !customerPhone) {
                alert('Vui lòng nhập đầy đủ tên khách hàng và số điện thoại');
                return;
            }
            
            const deliveryType = document.getElementById('deliveryType').value;
            let numberOfPeople = 1;
            let eatingTime = null;
            let pickupTime = null;
            let deliveryTime = null;
            let deliveryAddress = '';
            let tableNumbers = null;
            
            if (deliveryType === 'at-table') {
                numberOfPeople = parseInt(document.getElementById('numberOfPeople').value) || 1;
                eatingTime = document.getElementById('eatingTime').value;
                if (!eatingTime) {
                    alert('Vui lòng chọn thời gian ăn');
                    return;
                }
                tableNumbers = selectedTablesForOrder.length > 0 ? selectedTablesForOrder : null;
            } else if (deliveryType === 'takeaway') {
                pickupTime = document.getElementById('pickupTime').value;
                if (!pickupTime) {
                    alert('Vui lòng chọn thời gian lấy hàng');
                    return;
                }
            } else if (deliveryType === 'delivery') {
                deliveryTime = document.getElementById('deliveryTime').value;
                deliveryAddress = document.getElementById('deliveryAddress').value.trim();
                if (!deliveryTime) {
                    alert('Vui lòng chọn thời gian giao hàng');
                    return;
                }
                if (!deliveryAddress) {
                    alert('Vui lòng nhập địa chỉ giao hàng');
                    return;
                }
            }
            
            // Tính tổng tiền
            const total = orderItems.reduce((sum, item) => {
                return sum + ((item.quantity || 1) * (item.price || 0));
            }, 0);
            
            const requestData = {
                customerId: null, // Không cần customerId khi nhập thủ công
                customerName,
                customerPhone,
                items: orderItems,
                total,
                discount: 0,
                finalTotal: total,
                numberOfPeople: deliveryType === 'at-table' ? numberOfPeople : 1,
                eatingTime: deliveryType === 'at-table' ? eatingTime : null,
                pickupTime: deliveryType === 'takeaway' ? pickupTime : null,
                deliveryTime: deliveryType === 'delivery' ? deliveryTime : null,
                deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : null,
                tableNumbers,
                deliveryType
            };
            
            console.log('[create-order.js] Sending order data:', JSON.stringify(requestData, null, 2));
            console.log('[create-order.js] Delivery type:', deliveryType);
            console.log('[create-order.js] Eating time:', eatingTime);
            console.log('[create-order.js] Pickup time:', pickupTime);
            console.log('[create-order.js] Delivery time:', deliveryTime);
            
            try {
                const response = await fetch('/api/manager/orders/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                
                const data = await response.json();
                console.log('[create-order.js] Response:', data);
                
                if (data.success) {
                    alert('Tạo đơn hàng thành công!');
                    resetCreateOrderForm();
                    // Chuyển sang tab Cập nhật đơn hàng
                    if (typeof switchOrderTab === 'function') {
                        switchOrderTab('update');
                    }
                } else {
                    console.error('[create-order.js] Error response:', data);
                    alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('[create-order.js] Error creating order:', error);
                alert('Có lỗi xảy ra khi tạo đơn hàng: ' + error.message);
            }
        });
    }
    
    // Không cần xử lý dropdown nữa vì đã loại bỏ chức năng tìm kiếm
    
    // Khởi tạo delivery type và set thời gian mặc định
    const deliveryTypeSelect = document.getElementById('deliveryType');
    if (deliveryTypeSelect) {
        // Gọi handleDeliveryTypeChange để hiển thị đúng field
        handleDeliveryTypeChange();
        
        // Set thời gian mặc định cho field tương ứng
        const deliveryType = deliveryTypeSelect.value;
        if (deliveryType === 'at-table') {
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
        } else if (deliveryType === 'takeaway') {
            const pickupTimeInput = document.getElementById('pickupTime');
            if (pickupTimeInput && !pickupTimeInput.value) {
                const now = new Date();
                now.setHours(now.getHours() + 1);
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                pickupTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
        } else if (deliveryType === 'delivery') {
            const deliveryTimeInput = document.getElementById('deliveryTime');
            if (deliveryTimeInput && !deliveryTimeInput.value) {
                const now = new Date();
                now.setHours(now.getHours() + 1);
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                deliveryTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
        }
    }
});

// Export functions để có thể gọi từ HTML
// Các hàm tìm kiếm khách hàng đã được loại bỏ
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
window.handleDeliveryTypeChange = handleDeliveryTypeChange;
window.previewManagerOrder = previewManagerOrder;
window.closePreviewManagerOrderModal = closePreviewManagerOrderModal;

