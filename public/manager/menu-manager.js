// ========== QUẢN LÝ THỰC ĐƠN ==========

let allMenuItems = [];
let selectedComboItems = [];
let editingComboItems = []; // Danh sách món khi đang sửa combo

// Switch tab
function switchMenuTab(tabName) {
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
        'items': 0,
        'combos': 1
    };
    const index = tabIndexMap[tabName];
    if (index !== undefined && tabButtons[index]) {
        tabButtons[index].classList.add('active');
    }
    
    // Load data
    if (tabName === 'items') {
        loadMenuItems();
    } else if (tabName === 'combos') {
        loadCombos();
        loadMenuItemsForCombo();
    }
}

// ========== MÓN LẺ ==========

// Load danh sách món lẻ
async function loadMenuItems() {
    try {
        const response = await fetch('/api/manager/menu-items');
        const data = await response.json();
        
        if (data.success) {
            allMenuItems = data.items;
            displayMenuItems(data.items);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải danh sách món'));
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
        alert('Có lỗi xảy ra khi tải danh sách món');
    }
}

// Hiển thị danh sách món lẻ
function displayMenuItems(items) {
    const tbody = document.getElementById('menuItemsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Chưa có món nào</td></tr>';
        return;
    }
    
    items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.code || 'N/A'}</strong></td>
            <td>${item.name || 'N/A'}</td>
            <td>${item.unit || 'N/A'}</td>
            <td>${item.packaging || 'N/A'}</td>
            <td>${(item.price || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-edit" onclick="editMenuItem('${item.id}')">Sửa</button>
                <button class="btn-delete" onclick="deleteMenuItem('${item.id}')">Xóa</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Setup form món lẻ
document.addEventListener('DOMContentLoaded', function() {
    const menuItemForm = document.getElementById('menuItemForm');
    if (menuItemForm) {
        menuItemForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('menuItemName').value.trim();
            const unit = document.getElementById('menuItemUnit').value.trim();
            const packaging = document.getElementById('menuItemPackaging').value.trim();
            const price = document.getElementById('menuItemPrice').value;
            
            if (!name || !unit || !packaging || !price) {
                alert('Vui lòng điền đầy đủ thông tin');
                return;
            }
            
            try {
                const response = await fetch('/api/manager/menu-items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        unit,
                        packaging,
                        price: parseFloat(price)
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Thêm món thành công!');
                    resetMenuItemForm();
                    loadMenuItems();
                } else {
                    alert('Lỗi: ' + (data.error || 'Không thể thêm món'));
                }
            } catch (error) {
                console.error('Error adding menu item:', error);
                alert('Có lỗi xảy ra khi thêm món');
            }
        });
    }
});

// Reset form món lẻ
function resetMenuItemForm() {
    document.getElementById('menuItemForm').reset();
    document.getElementById('menuItemCode').value = '';
}

// Sửa món lẻ
async function editMenuItem(itemId) {
    try {
        const response = await fetch('/api/manager/menu-items');
        const data = await response.json();
        
        if (data.success) {
            const item = data.items.find(i => i.id === itemId);
            if (item) {
                document.getElementById('editMenuItemId').value = item.id;
                document.getElementById('editMenuItemCode').value = item.code;
                document.getElementById('editMenuItemName').value = item.name;
                document.getElementById('editMenuItemUnit').value = item.unit;
                document.getElementById('editMenuItemPackaging').value = item.packaging;
                document.getElementById('editMenuItemPrice').value = item.price;
                
                document.getElementById('editMenuItemModal').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading menu item:', error);
        alert('Có lỗi xảy ra khi tải thông tin món');
    }
}

// Setup form sửa món lẻ
document.addEventListener('DOMContentLoaded', function() {
    const editMenuItemForm = document.getElementById('editMenuItemForm');
    if (editMenuItemForm) {
        editMenuItemForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const id = document.getElementById('editMenuItemId').value;
            const name = document.getElementById('editMenuItemName').value.trim();
            const unit = document.getElementById('editMenuItemUnit').value.trim();
            const packaging = document.getElementById('editMenuItemPackaging').value.trim();
            const price = document.getElementById('editMenuItemPrice').value;
            
            if (!name || !unit || !packaging || !price) {
                alert('Vui lòng điền đầy đủ thông tin');
                return;
            }
            
            try {
                const response = await fetch(`/api/manager/menu-items/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        unit,
                        packaging,
                        price: parseFloat(price)
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Cập nhật món thành công!');
                    closeEditMenuItemModal();
                    loadMenuItems();
                } else {
                    alert('Lỗi: ' + (data.error || 'Không thể cập nhật món'));
                }
            } catch (error) {
                console.error('Error updating menu item:', error);
                alert('Có lỗi xảy ra khi cập nhật món');
            }
        });
    }
});

// Đóng modal sửa món lẻ
function closeEditMenuItemModal() {
    document.getElementById('editMenuItemModal').style.display = 'none';
}

// Xóa món lẻ
async function deleteMenuItem(itemId) {
    if (!confirm('Bạn có chắc chắn muốn xóa món này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/menu-items/${itemId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa món thành công!');
            loadMenuItems();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa món'));
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Có lỗi xảy ra khi xóa món');
    }
}

// ========== COMBO ==========

// Load danh sách combo
async function loadCombos() {
    try {
        const response = await fetch('/api/manager/combos');
        const data = await response.json();
        
        if (data.success) {
            displayCombos(data.combos);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể tải danh sách combo'));
        }
    } catch (error) {
        console.error('Error loading combos:', error);
        alert('Có lỗi xảy ra khi tải danh sách combo');
    }
}

// Hiển thị danh sách combo
function displayCombos(combos) {
    const tbody = document.getElementById('combosTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (combos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Chưa có combo nào</td></tr>';
        return;
    }
    
    combos.forEach((combo, index) => {
        const row = document.createElement('tr');
        
        // Format danh sách món
        let itemsText = '';
        if (combo.items && combo.items.length > 0) {
            itemsText = combo.items.map(item => {
                if (item.menuItemName) {
                    return `${item.menuItemName} (x${item.quantity || 1})`;
                } else if (item.name) {
                    return `${item.name} (x${item.quantity || 1})`;
                }
                return '';
            }).filter(t => t).join(', ');
        }
        if (!itemsText) {
            itemsText = 'Chưa có món';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${combo.name || 'N/A'}</strong></td>
            <td>${itemsText}</td>
            <td>${(combo.price || 0).toLocaleString('vi-VN')} VNĐ</td>
            <td>
                <button class="btn-edit" onclick="editCombo('${combo.id}')">Sửa</button>
                <button class="btn-delete" onclick="deleteCombo('${combo.id}')">Xóa</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load món lẻ cho combo (lưu vào biến để dùng cho autocomplete)
async function loadMenuItemsForCombo() {
    try {
        const response = await fetch('/api/manager/menu-items');
        const data = await response.json();
        
        if (data.success) {
            allMenuItems = data.items;
        }
    } catch (error) {
        console.error('Error loading menu items for combo:', error);
    }
}

// Tìm kiếm món cho combo
function searchMenuItemsForCombo(event) {
    const input = event.target;
    const query = input.value.trim();
    
    if (!query) {
        hideMenuItemsAutocomplete();
        return;
    }
    
    const matches = allMenuItems.filter(item => {
        const code = (item.code || '').toUpperCase();
        const name = (item.name || '').toLowerCase();
        const queryUpper = query.toUpperCase();
        const queryLower = query.toLowerCase();
        
        return code.includes(queryUpper) || name.includes(queryLower);
    }).slice(0, 10);
    
    showMenuItemsAutocomplete(matches);
}

// Hiển thị autocomplete món
function showMenuItemsAutocomplete(items = []) {
    const autocomplete = document.getElementById('comboMenuAutocomplete');
    if (!autocomplete) return;
    
    const input = document.getElementById('comboMenuSearch');
    const query = input ? input.value.trim() : '';
    
    if (!query || items.length === 0) {
        autocomplete.style.display = 'none';
        return;
    }
    
    autocomplete.innerHTML = '';
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'customer-dropdown-item';
        itemDiv.innerHTML = `
            <strong>${item.code || 'N/A'}</strong> - ${item.name || 'N/A'}
            <br><small>${item.unit || ''} - ${(item.price || 0).toLocaleString('vi-VN')} VNĐ</small>
        `;
        itemDiv.onclick = () => selectMenuItemForCombo(item);
        autocomplete.appendChild(itemDiv);
    });
    
    autocomplete.style.display = 'block';
}

// Ẩn autocomplete món
function hideMenuItemsAutocomplete() {
    const autocomplete = document.getElementById('comboMenuAutocomplete');
    if (autocomplete) {
        autocomplete.style.display = 'none';
    }
}

// Chọn món từ autocomplete
function selectMenuItemForCombo(item) {
    // Check if already added
    if (selectedComboItems.find(selected => selected.menuItemId === item.id)) {
        alert('Món này đã được thêm vào combo');
        return;
    }
    
    selectedComboItems.push({
        menuItemId: item.id,
        menuItemName: item.name,
        quantity: 1
    });
    
    // Clear search input
    const searchInput = document.getElementById('comboMenuSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    
    hideMenuItemsAutocomplete();
    updateComboItemsDisplay();
}




// Cập nhật hiển thị danh sách món trong combo
function updateComboItemsDisplay() {
    const container = document.getElementById('comboSelectedItems');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (selectedComboItems.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Chưa có món nào được chọn</p>';
        return;
    }
    
    selectedComboItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'combo-item';
        itemDiv.innerHTML = `
            <span>${item.menuItemName} (x${item.quantity})</span>
            <div class="combo-item-actions">
                <input type="number" value="${item.quantity}" min="1" 
                       onchange="updateSelectedItemQuantity(${index}, this.value)" 
                       style="width: 60px; padding: 4px;">
                <button class="btn-delete" onclick="removeSelectedItem(${index})">Xóa</button>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

function updateSelectedItemQuantity(index, quantity) {
    if (quantity && parseInt(quantity) > 0) {
        selectedComboItems[index].quantity = parseInt(quantity);
    }
}

function removeSelectedItem(index) {
    selectedComboItems.splice(index, 1);
    updateComboItemsDisplay();
}


// Setup form combo
document.addEventListener('DOMContentLoaded', function() {
    const comboForm = document.getElementById('comboForm');
    if (comboForm) {
        comboForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('comboName').value.trim();
            const price = document.getElementById('comboPrice').value;
            
            if (!name || !price) {
                alert('Vui lòng điền đầy đủ thông tin');
                return;
            }
            
            if (selectedComboItems.length === 0) {
                alert('Vui lòng chọn ít nhất một món');
                return;
            }
            
            const items = selectedComboItems;
            
            try {
                const response = await fetch('/api/manager/combos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        items,
                        price: parseFloat(price),
                        method: 'select'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Thêm combo thành công!');
                    resetComboForm();
                    loadCombos();
                } else {
                    alert('Lỗi: ' + (data.error || 'Không thể thêm combo'));
                }
            } catch (error) {
                console.error('Error adding combo:', error);
                alert('Có lỗi xảy ra khi thêm combo');
            }
        });
    }
});

// Reset form combo
function resetComboForm() {
    document.getElementById('comboForm').reset();
    selectedComboItems = [];
    updateComboItemsDisplay();
}

// Sửa combo
async function editCombo(comboId) {
    try {
        const response = await fetch('/api/manager/combos');
        const data = await response.json();
        
        if (data.success) {
            const combo = data.combos.find(c => c.id === comboId);
            if (combo) {
                document.getElementById('editComboId').value = combo.id;
                document.getElementById('editComboName').value = combo.name;
                document.getElementById('editComboPrice').value = combo.price;
                
                // Lưu danh sách món vào biến global để có thể chỉnh sửa
                editingComboItems = (combo.items || []).map(item => ({
                    menuItemId: item.menuItemId || item.id,
                    menuItemName: item.menuItemName || item.name,
                    name: item.menuItemName || item.name,
                    quantity: item.quantity || 1
                }));
                
                // Hiển thị danh sách món
                updateEditComboItemsDisplay();
                
                // Đảm bảo đã load menu items để có thể tìm kiếm
                if (allMenuItems.length === 0) {
                    await loadMenuItemsForCombo();
                }
                
                const modal = document.getElementById('editComboModal');
                modal.style.display = 'flex';
                modal.classList.add('show');
            }
        }
    } catch (error) {
        console.error('Error loading combo:', error);
        alert('Có lỗi xảy ra khi tải thông tin combo');
    }
}

// Cập nhật hiển thị danh sách món khi sửa combo
function updateEditComboItemsDisplay() {
    const itemsContainer = document.getElementById('editComboItems');
    itemsContainer.innerHTML = '';
    
    if (editingComboItems.length === 0) {
        itemsContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Chưa có món nào được chọn</p>';
        return;
    }
    
    editingComboItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'combo-item';
        itemDiv.innerHTML = `
            <span>${item.menuItemName || item.name || 'N/A'} (x${item.quantity || 1})</span>
            <div class="combo-item-actions">
                <button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="removeEditComboItem(${index})">Xóa</button>
            </div>
        `;
        itemsContainer.appendChild(itemDiv);
    });
}

// Xóa món khỏi danh sách khi sửa combo
function removeEditComboItem(index) {
    if (confirm('Bạn có chắc muốn xóa món này khỏi combo?')) {
        editingComboItems.splice(index, 1);
        updateEditComboItemsDisplay();
    }
}

// Tìm kiếm món để thêm vào combo khi sửa
function searchMenuItemsForEditCombo(event) {
    if (!event || !event.target) return;
    
    const searchTerm = event.target.value.toLowerCase().trim();
    const autocomplete = document.getElementById('editComboMenuAutocomplete');
    
    if (!autocomplete) return;
    
    if (!searchTerm) {
        autocomplete.style.display = 'none';
        return;
    }
    
    if (!allMenuItems || allMenuItems.length === 0) {
        autocomplete.style.display = 'none';
        return;
    }
    
    const filtered = allMenuItems.filter(item => {
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        return code.includes(searchTerm) || name.includes(searchTerm);
    });
    
    if (filtered.length === 0) {
        autocomplete.style.display = 'none';
        return;
    }
    
    autocomplete.innerHTML = '';
    filtered.slice(0, 10).forEach(item => {
        const div = document.createElement('div');
        div.className = 'customer-autocomplete-item';
        div.textContent = `${item.code || ''} - ${item.name || ''}`;
        div.onclick = () => {
            addItemToEditCombo(item);
        };
        autocomplete.appendChild(div);
    });
    
    autocomplete.style.display = 'block';
}

// Hiển thị autocomplete khi focus
function showMenuItemsAutocompleteForEdit() {
    const searchInput = document.getElementById('editComboMenuSearch');
    if (searchInput && searchInput.value.trim()) {
        searchMenuItemsForEditCombo({ target: searchInput });
    }
}

// Đóng autocomplete khi click ra ngoài
document.addEventListener('click', function(event) {
    const autocomplete = document.getElementById('editComboMenuAutocomplete');
    const searchInput = document.getElementById('editComboMenuSearch');
    
    if (autocomplete && searchInput) {
        if (!autocomplete.contains(event.target) && event.target !== searchInput) {
            autocomplete.style.display = 'none';
        }
    }
});

// Thêm món vào combo khi sửa
function addItemToEditCombo(menuItem) {
    if (!menuItem || (!menuItem.id && !menuItem.name)) {
        console.error('Invalid menu item:', menuItem);
        return;
    }
    
    // Kiểm tra xem món đã có trong danh sách chưa
    const existingIndex = editingComboItems.findIndex(item => 
        (item.menuItemId && menuItem.id && item.menuItemId === menuItem.id) ||
        (item.menuItemName && menuItem.name && item.menuItemName === menuItem.name) ||
        (item.name && menuItem.name && item.name === menuItem.name)
    );
    
    if (existingIndex >= 0) {
        // Nếu đã có, tăng số lượng
        editingComboItems[existingIndex].quantity = (editingComboItems[existingIndex].quantity || 1) + 1;
    } else {
        // Nếu chưa có, thêm mới
        editingComboItems.push({
            menuItemId: menuItem.id,
            menuItemName: menuItem.name || menuItem.menuItemName,
            name: menuItem.name || menuItem.menuItemName,
            quantity: 1
        });
    }
    
    // Xóa input và autocomplete
    const searchInput = document.getElementById('editComboMenuSearch');
    const autocomplete = document.getElementById('editComboMenuAutocomplete');
    if (searchInput) searchInput.value = '';
    if (autocomplete) autocomplete.style.display = 'none';
    
    // Cập nhật hiển thị
    updateEditComboItemsDisplay();
}

// Setup form sửa combo
document.addEventListener('DOMContentLoaded', function() {
    const editComboForm = document.getElementById('editComboForm');
    if (editComboForm) {
        editComboForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const id = document.getElementById('editComboId').value;
            const name = document.getElementById('editComboName').value.trim();
            const price = document.getElementById('editComboPrice').value;
            
            if (!name || !price) {
                alert('Vui lòng điền đầy đủ thông tin');
                return;
            }
            
            if (editingComboItems.length === 0) {
                alert('Vui lòng thêm ít nhất một món vào combo');
                return;
            }
            
            try {
                const updateResponse = await fetch(`/api/manager/combos/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        items: editingComboItems, // Sử dụng danh sách món đã chỉnh sửa
                        price: parseFloat(price)
                    })
                });
                
                const updateData = await updateResponse.json();
                
                if (updateData.success) {
                    alert('Cập nhật combo thành công!');
                    closeEditComboModal();
                    loadCombos();
                } else {
                    alert('Lỗi: ' + (updateData.error || 'Không thể cập nhật combo'));
                }
            } catch (error) {
                console.error('Error updating combo:', error);
                alert('Có lỗi xảy ra khi cập nhật combo');
            }
        });
    }
});

// Đóng modal sửa combo
function closeEditComboModal() {
    const modal = document.getElementById('editComboModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    editingComboItems = []; // Reset danh sách món
    document.getElementById('editComboMenuSearch').value = '';
    document.getElementById('editComboMenuAutocomplete').style.display = 'none';
}

// Xóa combo
async function deleteCombo(comboId) {
    if (!confirm('Bạn có chắc chắn muốn xóa combo này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/combos/${comboId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa combo thành công!');
            loadCombos();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa combo'));
        }
    } catch (error) {
        console.error('Error deleting combo:', error);
        alert('Có lỗi xảy ra khi xóa combo');
    }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadMenuItems();
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        const editMenuItemModal = document.getElementById('editMenuItemModal');
        const editComboModal = document.getElementById('editComboModal');
        
        if (event.target === editMenuItemModal) {
            closeEditMenuItemModal();
        }
        if (event.target === editComboModal) {
            closeEditComboModal();
        }
    }
});

