// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCrGIkI4zixt7BLwu4xgQin0qXDXe8kO2E",
    authDomain: "nha-hang-phuong-anh.firebaseapp.com",
    projectId: "nha-hang-phuong-anh",
    storageBucket: "nha-hang-phuong-anh.firebasestorage.app",
    messagingSenderId: "128764853420",
    appId: "1:128764853420:web:02633aa2331e6964947309"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let cart = [];
let currentUser = null;
let currentPoints = 0;
let appliedVoucher = null;

// Authentication
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert('Đăng nhập thành công!');
        location.reload();
    } catch (error) {
        alert('Đăng nhập thất bại: ' + error.message);
    }
}

async function register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const phone = document.getElementById('registerPhone').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, phone, role: 'customer' })
        });
        alert('Đăng ký thành công!');
        location.reload();
    } catch (error) {
        alert('Đăng ký thất bại: ' + error.message);
    }
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Profile
async function updateProfile() {
    if (!currentUser) return;
    
    const name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const address = document.getElementById('profileAddress').value;
    
    try {
        const response = await fetch(`/api/customer/profile/${currentUser.uid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, address })
        });
        
        if (response.ok) {
            alert('Cập nhật thông tin thành công!');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
    }
}

// Load menu items và combos
let pendingItem = null; // Lưu item đang chờ xác nhận
let currentMenuTab = 'menu'; // 'menu' hoặc 'combo'

// Load menu items (món ăn)
async function loadMenuItems() {
    try {
        const response = await fetch('/api/manager/menu-items');
        const data = await response.json();
        
        if (data.success) {
            // API trả về 'items' chứ không phải 'menuItems'
            displayMenuItems(data.items || data.menuItems || []);
        } else {
            console.error('Error loading menu items:', data.error);
            // Hiển thị thông báo lỗi
            const menuGrid = document.getElementById('menuGrid');
            menuGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: #d32f2f;">Lỗi khi tải danh sách món ăn: ' + (data.error || 'Unknown error') + '</p>';
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
        // Hiển thị thông báo lỗi
        const menuGrid = document.getElementById('menuGrid');
        menuGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: #d32f2f;">Lỗi khi tải danh sách món ăn. Vui lòng thử lại sau.</p>';
    }
}

// Load combos
async function loadCombos() {
    try {
        const response = await fetch('/api/manager/combos');
        const data = await response.json();
        
        if (data.success) {
            displayCombos(data.combos);
        } else {
            console.error('Error loading combos:', data.error);
        }
    } catch (error) {
        console.error('Error loading combos:', error);
    }
}

// Hiển thị tab Món ăn
function showMenuTab() {
    currentMenuTab = 'menu';
    document.getElementById('menuTabBtn').classList.add('active');
    document.getElementById('comboTabBtn').classList.remove('active');
    loadMenuItems();
}

// Hiển thị tab Combo
function showComboTab() {
    currentMenuTab = 'combo';
    document.getElementById('comboTabBtn').classList.add('active');
    document.getElementById('menuTabBtn').classList.remove('active');
    loadCombos();
}

async function loadCategories() {
    try {
        const response = await fetch('/api/customer/menu/categories');
        const data = await response.json();
        
        if (data.success) {
            const categoryButtons = document.getElementById('categoryButtons');
            categoryButtons.innerHTML = '';
            data.categories.forEach(category => {
                const btn = document.createElement('button');
                btn.textContent = category;
                btn.onclick = () => loadMenu(category);
                categoryButtons.appendChild(btn);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}


// Tìm kiếm menu
async function searchMenu() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        console.error('Search input not found');
        return;
    }
    
    const searchTerm = searchInput.value.trim();
    const menuGrid = document.getElementById('menuGrid');
    
    if (!menuGrid) {
        console.error('Menu grid not found');
        return;
    }
    
    if (!searchTerm) {
        // Nếu không có từ khóa, load lại tab hiện tại
        if (currentMenuTab === 'menu') {
            loadMenuItems();
        } else {
            loadCombos();
        }
        return;
    }
    
    try {
        console.log('Searching for:', searchTerm);
        // Hiển thị loading
        menuGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Đang tìm kiếm...</p>';
        
        // Gọi API tìm kiếm
        const response = await fetch(`/api/customer/menu/search?query=${encodeURIComponent(searchTerm)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Search response:', data);
        
        if (data.success && data.menu && data.menu.length > 0) {
            // Hiển thị kết quả tìm kiếm (cả món ăn và combo)
            const menuItems = data.menu.filter(item => item.type === 'menu');
            const combos = data.menu.filter(item => item.type === 'combo');
            
            menuGrid.innerHTML = '';
            
            // Hiển thị món ăn nếu có
            if (menuItems.length > 0) {
                menuItems.forEach(item => {
                    const menuItem = document.createElement('div');
                    menuItem.className = 'menu-item';
                    
                    menuItem.innerHTML = `
                        <h3>${item.name || 'Chưa có tên'}</h3>
                        <p class="price">${(item.price || 0).toLocaleString('vi-VN')} VNĐ</p>
                    `;
                    
                    menuItem.addEventListener('click', () => {
                        openConfirmModal({ ...item, type: 'menu' });
                    });
                    
                    menuGrid.appendChild(menuItem);
                });
            }
            
            // Hiển thị combo nếu có
            if (combos.length > 0) {
                combos.forEach(combo => {
                    const menuItem = document.createElement('div');
                    menuItem.className = 'menu-item';
                    
                    menuItem.innerHTML = `
                        <h3>${combo.name || 'Chưa có tên'}</h3>
                        <p class="price">${(combo.price || 0).toLocaleString('vi-VN')} VNĐ</p>
                    `;
                    
                    menuItem.addEventListener('click', () => {
                        openConfirmModal({ ...combo, type: 'combo' });
                    });
                    
                    menuGrid.appendChild(menuItem);
                });
            }
        } else {
            menuGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Không tìm thấy món ăn nào</p>';
        }
    } catch (error) {
        console.error('Error searching menu:', error);
        menuGrid.innerHTML = `<p style="text-align: center; padding: 40px; color: #d32f2f;">Lỗi khi tìm kiếm: ${error.message}. Vui lòng thử lại.</p>`;
    }
}

// Xử lý khi nhấn phím trong ô tìm kiếm
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchMenu();
    }
}

// Đảm bảo các hàm có thể được gọi từ HTML
window.searchMenu = searchMenu;
window.handleSearchKeyPress = handleSearchKeyPress;
window.toggleCartModal = toggleCartModal;
window.checkoutFromModal = checkoutFromModal;
window.applyVoucherModal = applyVoucherModal;
window.removeFromCart = removeFromCart;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;

// Hiển thị menu items (món ăn)
function displayMenuItems(menuItems) {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    if (!menuItems || menuItems.length === 0) {
        menuGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Chưa có món ăn nào</p>';
        return;
    }
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        
        menuItem.innerHTML = `
            <h3>${item.name || 'Chưa có tên'}</h3>
            <p class="price">${(item.price || 0).toLocaleString('vi-VN')} VNĐ</p>
        `;
        
        // Thêm event listener để mở modal xác nhận
        menuItem.addEventListener('click', () => {
            openConfirmModal({ ...item, type: 'menu' });
        });
        
        menuGrid.appendChild(menuItem);
    });
}

// Hiển thị combos
function displayCombos(combos) {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    if (!combos || combos.length === 0) {
        menuGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Chưa có combo nào</p>';
        return;
    }
    
    combos.forEach(combo => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        
        menuItem.innerHTML = `
            <h3>${combo.name || 'Chưa có tên'}</h3>
            <p class="price">${(combo.price || 0).toLocaleString('vi-VN')} VNĐ</p>
        `;
        
        // Thêm event listener để mở modal xác nhận
        menuItem.addEventListener('click', () => {
            openConfirmModal({ ...combo, type: 'combo' });
        });
        
        menuGrid.appendChild(menuItem);
    });
}

// Mở modal xác nhận
function openConfirmModal(item) {
    pendingItem = item;
    const modal = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('confirmModalTitle');
    const modalBody = document.getElementById('confirmModalBody');
    
    const itemType = item.type || (item.items ? 'combo' : 'menu');
    const typeText = itemType === 'combo' ? 'Combo' : 'Món ăn';
    
    modalTitle.textContent = `Xác nhận thêm ${typeText} vào giỏ hàng`;
    
    let bodyHtml = `
        <div class="confirm-modal-body">
            <p class="item-name">${item.name}</p>
            <p class="item-price">Giá: ${(item.price || 0).toLocaleString('vi-VN')} VNĐ</p>
    `;
    
    if (itemType === 'combo' && item.items && item.items.length > 0) {
        bodyHtml += '<p><strong>Bao gồm:</strong></p><ul>';
        item.items.forEach(comboItem => {
            bodyHtml += `<li>${comboItem.name || comboItem.menuItemName || 'Món'}</li>`;
        });
        bodyHtml += '</ul>';
    }
    
    bodyHtml += '</div>';
    modalBody.innerHTML = bodyHtml;
    modal.style.display = 'flex';
}

// Đóng modal xác nhận
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    pendingItem = null;
}

// Xác nhận thêm vào giỏ hàng
function confirmAddToCart() {
    if (!pendingItem) return;
    
    const item = pendingItem;
    const itemType = item.type || (item.items ? 'combo' : 'menu');
    
    if (itemType === 'combo') {
        addComboToCart(item.id, item.name, item.price, item.items || []);
    } else {
        addToCart(item.id, item.name, item.price, 'menu');
    }
    
    closeConfirmModal();
}

// Đóng modal khi click bên ngoài
document.addEventListener('click', function(event) {
    const modal = document.getElementById('confirmModal');
    if (event.target === modal) {
        closeConfirmModal();
    }
});

// Mở modal đăng ký thành viên
function openRegisterModal() {
    const modal = document.getElementById('registerMemberModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Đóng modal đăng ký thành viên
function closeRegisterModal() {
    const modal = document.getElementById('registerMemberModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form
        const form = document.getElementById('registerMemberForm');
        if (form) {
            form.reset();
        }
    }
}

// Đăng ký thành viên
async function registerMember(event) {
    if (event) {
        event.preventDefault();
    }
    
    const name = document.getElementById('memberName')?.value.trim();
    const phone = document.getElementById('memberPhone')?.value.trim();
    const email = document.getElementById('memberEmail')?.value.trim();
    const address = document.getElementById('memberAddress')?.value.trim();
    
    if (!name || !phone) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc (Họ tên và Số điện thoại)');
        return;
    }
    
    try {
        const response = await fetch('/api/manager/customers/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                phone: phone,
                email: email || '',
                address: address || ''
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Đăng ký thành viên thành công! Bạn sẽ nhận điểm tích lũy khi đặt hàng.');
            closeRegisterModal();
            
            // Lưu thông tin vào sessionStorage
            sessionStorage.setItem('customerName', name);
            sessionStorage.setItem('customerPhone', phone);
            sessionStorage.setItem('customerId', data.customerId);
            
            // Ẩn nút đăng ký
            const registerButtonContainer = document.getElementById('registerButtonContainer');
            if (registerButtonContainer) {
                registerButtonContainer.style.display = 'none';
            }
            
            // Cập nhật thông báo chào mừng
            const welcomeMessage = document.getElementById('customerWelcomeMessage');
            if (welcomeMessage) {
                welcomeMessage.className = 'customer-welcome-message';
                welcomeMessage.innerHTML = `Chào mừng quý khách trở lại<br><strong>${name}</strong>`;
                welcomeMessage.style.display = 'block';
            }
            
            // Load lại điểm tích lũy
            await loadPoints();
        } else {
            alert('Đăng ký thất bại: ' + (data.error || 'Có lỗi xảy ra'));
        }
    } catch (error) {
        console.error('Error registering member:', error);
        alert('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
    }
}

// Load điểm tích lũy
async function loadPoints() {
    const customerPhone = sessionStorage.getItem('customerPhone');
    const customerId = sessionStorage.getItem('customerId');
    
    if (!customerPhone && !customerId) {
        currentPoints = 0;
        updatePointsDisplay();
        return;
    }
    
    try {
        // Tìm khách hàng theo số điện thoại hoặc ID
        let customer = null;
        
        if (customerId) {
            // Tìm theo ID - sử dụng API endpoint riêng
            try {
                // Thêm timestamp để tránh cache
                const timestamp = new Date().getTime();
                const response = await fetch(`/api/manager/customers/${customerId}?_t=${timestamp}`, {
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                const data = await response.json();
                if (data.success && data.customer) {
                    customer = data.customer;
                    console.log('[loadPoints] Found customer by ID:', customer.name, 'Points:', customer.points);
                }
            } catch (error) {
                console.error('Error fetching customer by ID:', error);
                // Fallback: tìm trong danh sách tất cả khách hàng
                const response = await fetch(`/api/manager/customers`);
                const data = await response.json();
                if (data.success && data.customers) {
                    customer = data.customers.find(c => c.id === customerId && c.isActive !== false);
                }
            }
        }
        
        if (!customer && customerPhone) {
            // Tìm theo số điện thoại - sử dụng API /api/customer/check để đảm bảo format đúng
            try {
                // Thêm timestamp để tránh cache
                const timestamp = new Date().getTime();
                const response = await fetch(`/api/customer/check?phone=${encodeURIComponent(customerPhone)}&_t=${timestamp}`, {
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                const data = await response.json();
                console.log('API /api/customer/check response:', data);
                if (data.success && data.customer) {
                    customer = data.customer;
                    console.log('Found customer by phone:', customer.name);
                    console.log('Customer data:', {
                        id: customer.id,
                        points: customer.points,
                        totalPaidOrders: customer.totalPaidOrders,
                        totalRevenue: customer.totalRevenue,
                        totalPoints: customer.totalPoints
                    });
                    // Lưu customerId nếu chưa có
                    if (!customerId && customer.id) {
                        sessionStorage.setItem('customerId', customer.id);
                        sessionStorage.setItem('customerName', customer.name || '');
                    }
                }
            } catch (error) {
                console.error('Error fetching customer by phone:', error);
                // Fallback: tìm trong danh sách tất cả khách hàng
                const response = await fetch(`/api/manager/customers`);
                const data = await response.json();
                if (data.success && data.customers) {
                    customer = data.customers.find(c => c.phone === customerPhone && c.isActive !== false);
                    if (customer) {
                        // Lưu customerId nếu chưa có
                        if (!customerId) {
                            sessionStorage.setItem('customerId', customer.id);
                            sessionStorage.setItem('customerName', customer.name || '');
                        }
                    }
                }
            }
        }
        
        if (customer) {
            // Lấy điểm tích lũy từ customer - chỉ cập nhật nếu customer có points hợp lệ
            if (customer.points !== undefined && customer.points !== null) {
                currentPoints = customer.points;
                console.log('[loadPoints] Updated currentPoints from customer:', currentPoints);
            } else {
                console.log('[loadPoints] Customer points is undefined/null, keeping current value:', currentPoints);
            }
            console.log('Loaded customer points:', currentPoints, 'for customer:', customer.name);
            console.log('Full customer object:', customer);
            
            // Lấy tổng số HĐ đã thanh toán từ customer (nếu có)
            const totalPaidOrders = customer.totalPaidOrders || 0;
            console.log('Total paid orders:', totalPaidOrders);
            sessionStorage.setItem('totalPaidOrders', totalPaidOrders.toString());
            
            // Đảm bảo customerId được lưu
            if (!sessionStorage.getItem('customerId') && customer.id) {
                sessionStorage.setItem('customerId', customer.id);
            }
            
            // Gọi updatePointsDisplay với await để đảm bảo thông báo được hiển thị
            await updatePointsDisplay();
            
            // Ẩn nút đăng ký nếu là khách hàng cũ
            const registerButtonContainer = document.getElementById('registerButtonContainer');
            if (registerButtonContainer) {
                registerButtonContainer.style.display = 'none';
            }
        } else {
            currentPoints = 0;
            sessionStorage.setItem('totalPaidOrders', '0');
            console.log('Customer not found, setting points to 0');
            await updatePointsDisplay();
        }
    } catch (error) {
        console.error('Error loading points:', error);
        currentPoints = 0;
        updatePointsDisplay();
    }
}

// Cập nhật hiển thị điểm tích lũy
async function updatePointsDisplay() {
    console.log('[updatePointsDisplay] Called with currentPoints:', currentPoints);
    const currentPointsElement = document.getElementById('currentPoints');
    if (currentPointsElement) {
        const newValue = currentPoints.toLocaleString('vi-VN');
        const oldValue = currentPointsElement.textContent;
        currentPointsElement.textContent = newValue;
        currentPointsElement.innerHTML = newValue;
        console.log('[updatePointsDisplay] Updated element textContent from', oldValue, 'to', newValue);
        console.log('[updatePointsDisplay] Element innerHTML:', currentPointsElement.innerHTML);
        console.log('[updatePointsDisplay] Element outerHTML:', currentPointsElement.outerHTML);
        
        // Kiểm tra lại sau một khoảng thời gian ngắn
        setTimeout(() => {
            const el = document.getElementById('currentPoints');
            if (el && el.textContent !== newValue) {
                console.warn('[updatePointsDisplay] Element was changed! Expected:', newValue, 'Actual:', el.textContent);
                el.textContent = newValue;
                el.innerHTML = newValue;
            }
        }, 50);
    } else {
        console.error('[updatePointsDisplay] Element #currentPoints not found!');
        console.error('[updatePointsDisplay] Available elements:', document.querySelectorAll('[id*="point"]'));
    }
    
    // Hiển thị tổng số HĐ đã thanh toán (chỉ cho khách hàng cũ)
    const customerId = sessionStorage.getItem('customerId');
    const totalPaidOrders = parseInt(sessionStorage.getItem('totalPaidOrders') || '0');
    const totalOrdersInfo = document.getElementById('totalOrdersInfo');
    const totalPaidOrdersElement = document.getElementById('totalPaidOrders');
    
    if (customerId && totalPaidOrders > 0) {
        // Khách hàng cũ - hiển thị tổng số HĐ
        if (totalOrdersInfo) {
            totalOrdersInfo.style.display = 'block';
        }
        if (totalPaidOrdersElement) {
            totalPaidOrdersElement.textContent = totalPaidOrders;
        }
    } else {
        // Khách hàng mới hoặc chưa có HĐ
        if (totalOrdersInfo) {
            totalOrdersInfo.style.display = 'none';
        }
    }
    
    // Kiểm tra nếu khách hàng có voucher
    const voucherEligibilityMessage = document.getElementById('voucherEligibilityMessage');
    const voucherCongratulationsMessage = document.getElementById('voucherCongratulationsMessage');
    
    console.log('updatePointsDisplay - currentPoints:', currentPoints, 'customerId:', customerId, 'totalPaidOrders:', totalPaidOrders);
    
    if (customerId) {
        // Kiểm tra xem khách hàng có voucher chưa sử dụng không
        try {
            const voucherResponse = await fetch(`/api/manager/vouchers/customer/${customerId}`);
            const voucherData = await voucherResponse.json();
            
            console.log('Voucher response:', voucherData);
            
            if (voucherData.success && voucherData.vouchers && voucherData.vouchers.length > 0) {
                // Có voucher chưa sử dụng - hiển thị thông báo chúc mừng
                if (voucherCongratulationsMessage) {
                    voucherCongratulationsMessage.textContent = 'Chúc mừng quý khách đã nhận được Voucher trị giá 500 nghìn cho Hóa đơn tiếp theo';
                    voucherCongratulationsMessage.style.display = 'block';
                }
                if (voucherEligibilityMessage) {
                    voucherEligibilityMessage.style.display = 'none';
                }
                
                // Hiển thị phần áp dụng voucher trong cart modal
                const voucherSection = document.getElementById('voucherApplicationSection');
                if (voucherSection) {
                    voucherSection.style.display = 'block';
                }
            } else {
                // Không có voucher - ẩn thông báo chúc mừng
                if (voucherCongratulationsMessage) {
                    voucherCongratulationsMessage.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error checking vouchers:', error);
            if (voucherCongratulationsMessage) {
                voucherCongratulationsMessage.style.display = 'none';
            }
        }
    } else {
        if (voucherEligibilityMessage) {
            voucherEligibilityMessage.style.display = 'none';
        }
        if (voucherCongratulationsMessage) {
            voucherCongratulationsMessage.style.display = 'none';
        }
    }
}

// Kiểm tra và hiển thị thông báo khách hàng
async function checkAndDisplayCustomerWelcome() {
    const customerPhone = sessionStorage.getItem('customerPhone');
    const welcomeMessage = document.getElementById('customerWelcomeMessage');
    const registerButtonContainer = document.getElementById('registerButtonContainer');
    
    if (!customerPhone) {
        // Không có số điện thoại, hiển thị thông báo cho khách mới
        if (welcomeMessage) {
            welcomeMessage.className = 'customer-welcome-message new';
            welcomeMessage.textContent = 'Chào mừng quý khách';
            welcomeMessage.style.display = 'block';
        }
        if (registerButtonContainer) {
            registerButtonContainer.style.display = 'block';
        }
        return;
    }
    
    try {
        // Thêm timestamp để tránh cache
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/customer/check?phone=${encodeURIComponent(customerPhone)}&_t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        const data = await response.json();
        console.log('[checkAndDisplayCustomerWelcome] API response:', data);
        
        if (data.success && data.customer) {
            // Khách hàng cũ
            const customer = data.customer;
            console.log('[checkAndDisplayCustomerWelcome] Customer found:', {
                id: customer.id,
                name: customer.name,
                points: customer.points,
                totalPaidOrders: customer.totalPaidOrders
            });
            
            if (welcomeMessage) {
                welcomeMessage.className = 'customer-welcome-message';
                welcomeMessage.innerHTML = `Chào mừng quý khách trở lại<br><strong>${customer.name || 'Khách hàng'}</strong>`;
                welcomeMessage.style.display = 'block';
            }
            
            // Ẩn nút đăng ký nếu là khách hàng cũ
            if (registerButtonContainer) {
                registerButtonContainer.style.display = 'none';
            }
            
            // Lưu thông tin khách hàng
            sessionStorage.setItem('customerName', customer.name || '');
            sessionStorage.setItem('customerId', customer.id);
            sessionStorage.setItem('totalPaidOrders', (customer.totalPaidOrders || 0).toString());
            
            // Cập nhật điểm ngay lập tức từ response
            if (customer.points !== undefined && customer.points !== null) {
                currentPoints = customer.points;
                console.log('[checkAndDisplayCustomerWelcome] Setting currentPoints to:', currentPoints);
                
                // Cập nhật trực tiếp vào DOM ngay lập tức (dùng cả textContent và innerHTML)
                const currentPointsElement = document.getElementById('currentPoints');
                if (currentPointsElement) {
                    const pointsValue = currentPoints.toLocaleString('vi-VN');
                    currentPointsElement.textContent = pointsValue;
                    currentPointsElement.innerHTML = pointsValue;
                    console.log('[checkAndDisplayCustomerWelcome] Directly updated DOM element to:', currentPointsElement.textContent);
                    
                    // Đảm bảo cập nhật lại sau một khoảng thời gian ngắn để tránh bị ghi đè
                    setTimeout(() => {
                        const el = document.getElementById('currentPoints');
                        if (el && el.textContent !== pointsValue) {
                            el.textContent = pointsValue;
                            el.innerHTML = pointsValue;
                            console.log('[checkAndDisplayCustomerWelcome] Re-updated DOM element after timeout to:', pointsValue);
                        }
                    }, 100);
                } else {
                    console.error('[checkAndDisplayCustomerWelcome] Element #currentPoints not found!');
                }
            }
            
            // Cập nhật hiển thị ngay lập tức
            await updatePointsDisplay();
            
            // Đảm bảo cập nhật lại sau khi tất cả code đã chạy
            setTimeout(async () => {
                await updatePointsDisplay();
                console.log('[checkAndDisplayCustomerWelcome] Final update after timeout, currentPoints:', currentPoints);
            }, 200);
            
            // Load điểm tích lũy (với await để đảm bảo điểm được load trước khi hiển thị)
            await loadPoints();
        } else {
            // Khách hàng mới
            if (welcomeMessage) {
                welcomeMessage.className = 'customer-welcome-message new';
                welcomeMessage.textContent = 'Chào mừng quý khách';
                welcomeMessage.style.display = 'block';
            }
            if (registerButtonContainer) {
                registerButtonContainer.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error checking customer:', error);
        // Mặc định hiển thị thông báo cho khách hàng mới
        if (welcomeMessage) {
            welcomeMessage.className = 'customer-welcome-message new';
            welcomeMessage.textContent = 'Chào mừng quý khách';
            welcomeMessage.style.display = 'block';
        }
        if (registerButtonContainer) {
            registerButtonContainer.style.display = 'block';
        }
    }
}

// Load menu khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Load món ăn mặc định
    showMenuTab();
    
    // Kiểm tra và hiển thị thông báo khách hàng
    checkAndDisplayCustomerWelcome();
    
    // Load điểm tích lũy (nếu là khách hàng cũ)
    // Điểm sẽ được load trong checkAndDisplayCustomerWelcome() nếu có customerId
    // Nhưng vẫn load lại để đảm bảo
    const customerPhone = sessionStorage.getItem('customerPhone');
    const customerId = sessionStorage.getItem('customerId');
    if (customerPhone || customerId) {
        loadPoints();
    }
    
    // Xử lý form đăng ký thành viên
    const registerMemberForm = document.getElementById('registerMemberForm');
    if (registerMemberForm) {
        registerMemberForm.addEventListener('submit', registerMember);
    }
    
    // Xử lý delivery type change trong modal
    document.querySelectorAll('input[name="deliveryTypeModal"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            handleDeliveryTypeChange();
        });
    });
    
    // Gọi lần đầu để set trạng thái ban đầu
    handleDeliveryTypeChange();
    
    // Xử lý use points trong modal
    const usePointsModal = document.getElementById('usePointsModal');
    if (usePointsModal) {
        usePointsModal.addEventListener('change', (e) => {
            const pointsToUseModal = document.getElementById('pointsToUseModal');
            if (pointsToUseModal) {
                pointsToUseModal.style.display = e.target.checked ? 'block' : 'none';
                if (e.target.checked) {
                    pointsToUseModal.max = currentPoints;
                }
            }
        });
    }
    
    // Khởi tạo badge
    updateCartBadge(0);
    
    // Đóng modal khi click bên ngoài
    document.addEventListener('click', function(event) {
        const registerModal = document.getElementById('registerMemberModal');
        if (registerModal && event.target === registerModal) {
            closeRegisterModal();
        }
    });
});

function addToCart(menuId, name, price, type = 'menu') {
    const existingItem = cart.find(item => item.menuId === menuId && item.type === type);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ menuId, name, price, quantity: 1, type: type });
    }
    
    updateCart();
    alert('Đã thêm vào giỏ hàng!');
}

function addComboToCart(comboId, name, price, items = []) {
    const existingItem = cart.find(item => item.menuId === comboId && item.type === 'combo');
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ 
            menuId: comboId, 
            name, 
            price, 
            quantity: 1, 
            type: 'combo',
            items: items 
        });
    }
    
    updateCart();
    alert('Đã thêm combo vào giỏ hàng!');
}

function removeFromCart(menuId, type = 'menu') {
    cart = cart.filter(item => !(item.menuId === menuId && (item.type || 'menu') === type));
    updateCart();
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const cartItemsModal = document.getElementById('cartItemsModal');
    
    if (cartItems) cartItems.innerHTML = '';
    if (cartItemsModal) cartItemsModal.innerHTML = '';
    
    let total = 0;
    let totalQuantity = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        totalQuantity += item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div>
                <p><strong>${item.name}</strong></p>
                <p>${item.price.toLocaleString()} VNĐ x ${item.quantity}</p>
            </div>
            <div>
                <p>${itemTotal.toLocaleString()} VNĐ</p>
                <button onclick="removeFromCart('${item.menuId}', '${item.type || 'menu'}')">Xóa</button>
            </div>
        `;
        
        if (cartItems) cartItems.appendChild(cartItem.cloneNode(true));
        if (cartItemsModal) cartItemsModal.appendChild(cartItem);
    });
    
    if (document.getElementById('cartTotal')) {
        document.getElementById('cartTotal').textContent = total.toLocaleString();
    }
    if (document.getElementById('cartTotalModal')) {
        document.getElementById('cartTotalModal').textContent = total.toLocaleString();
    }
    
    // Cập nhật badge số lượng
    updateCartBadge(totalQuantity);
    
    // Cập nhật tổng tiền với voucher (nếu có)
    updateCartTotalWithVoucher();
}

// Cập nhật badge số lượng trên floating button
function updateCartBadge(quantity) {
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        if (quantity > 0) {
            cartBadge.textContent = quantity;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

// Toggle cart modal
async function toggleCartModal() {
    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        if (cartModal.style.display === 'none' || cartModal.style.display === '') {
            cartModal.style.display = 'flex';
            updateCart(); // Cập nhật lại giỏ hàng khi mở modal
            await updateCartTotalWithVoucher(); // Kiểm tra và hiển thị voucher
        } else {
            cartModal.style.display = 'none';
        }
    }
}

// Đóng modal khi click bên ngoài
document.addEventListener('click', function(event) {
    const cartModal = document.getElementById('cartModal');
    if (cartModal && event.target === cartModal) {
        toggleCartModal();
    }
    const previewModal = document.getElementById('previewOrderModal');
    if (previewModal && event.target === previewModal) {
        closePreviewOrderModal();
    }
});

// Tạo số Order ngẫu nhiên 5 chữ số
function generateOrderNumber() {
    return String(Math.floor(10000 + Math.random() * 90000));
}

// Xem trước Order
async function previewOrder() {
    if (cart.length === 0) {
        alert('Giỏ hàng trống');
        return;
    }
    
    // Lấy thông tin khách hàng
    const customerName = sessionStorage.getItem('customerName');
    const customerId = sessionStorage.getItem('customerId');
    
    // Hiển thị tên khách hàng hoặc "Khách lẻ"
    const displayName = customerName && customerName.trim() ? customerName : 'Khách lẻ';
    document.getElementById('previewCustomerName').textContent = displayName;
    
    // Ngày lập
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    document.getElementById('previewOrderDate').textContent = `Ngày ${dateStr}`;
    
    // Số Order
    document.getElementById('previewOrderNumber').textContent = generateOrderNumber();
    
    // Thời gian ăn
    const eatingTimeInput = document.getElementById('eatingTime');
    const eatingTime = eatingTimeInput ? eatingTimeInput.value : null;
    if (eatingTime) {
        const eatingTimeDate = new Date(eatingTime);
        const eatingTimeStr = eatingTimeDate.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('previewEatingTime').textContent = eatingTimeStr;
    } else {
        document.getElementById('previewEatingTime').textContent = 'Chưa chọn';
    }
    
    // Hiển thị bảng mặt hàng
    const tableBody = document.getElementById('previewItemsTableBody');
    tableBody.innerHTML = '';
    
    let totalAmount = 0;
    
    cart.forEach((item, index) => {
        const quantity = item.quantity || 1;
        const unitPrice = item.price || 0;
        const amount = quantity * unitPrice;
        totalAmount += amount;
        
        // Lấy đơn vị tính từ item (nếu có) hoặc mặc định
        const unit = item.unit || 'Đĩa';
        
        // Format số lượng với 1 chữ số thập phân
        const quantityFormatted = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.name || 'N/A'}</td>
            <td>${unit}</td>
            <td>${quantityFormatted}</td>
            <td>${unitPrice.toLocaleString('vi-VN')} VNĐ</td>
            <td>${Math.round(amount).toLocaleString('vi-VN')} VNĐ</td>
        `;
        tableBody.appendChild(row);
    });
    
    // Tính toán tổng tiền - kiểm tra xem có áp dụng voucher không
    let discount = 0;
    const applyVoucherCheckbox = document.getElementById('applyVoucherModal');
    if (applyVoucherCheckbox && applyVoucherCheckbox.checked) {
        const customerId = sessionStorage.getItem('customerId');
        if (customerId) {
            try {
                const voucherResponse = await fetch(`/api/manager/vouchers/customer/${customerId}`);
                const voucherData = await voucherResponse.json();
                
                if (voucherData.success && voucherData.vouchers && voucherData.vouchers.length > 0) {
                    const availableVoucher = voucherData.vouchers[0];
                    const voucherValue = availableVoucher.value || 500000;
                    // Áp dụng voucher: nếu hóa đơn <= 500k, vẫn trừ hết voucher
                    discount = Math.min(voucherValue, totalAmount);
                }
            } catch (error) {
                console.error('Error loading voucher for preview:', error);
            }
        }
    }
    const finalTotal = totalAmount - discount;
    
    // Hiển thị tổng tiền
    document.getElementById('previewTotalAmount').textContent = Math.round(totalAmount).toLocaleString('vi-VN');
    document.getElementById('previewDiscount').textContent = Math.round(discount).toLocaleString('vi-VN');
    document.getElementById('previewFinalTotal').textContent = Math.round(finalTotal).toLocaleString('vi-VN');
    
    // Lũy kế còn nợ
    let debt = 0;
    if (customerId) {
        // Lấy công nợ từ API nếu là khách hàng cũ
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
    document.getElementById('previewDebt').textContent = Math.round(debt).toLocaleString('vi-VN');
    
    // Hiển thị modal
    document.getElementById('previewOrderModal').style.display = 'flex';
}

// Đóng modal xem trước Order
function closePreviewOrderModal() {
    document.getElementById('previewOrderModal').style.display = 'none';
}

// Tải ảnh phiếu xem trước Order
async function downloadOrderPreview() {
    const modalContent = document.querySelector('.preview-order-modal-content');
    if (!modalContent) {
        alert('Không tìm thấy nội dung phiếu');
        return;
    }
    
    try {
        // Hiển thị loading
        const downloadBtn = document.querySelector('.btn-download');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span>⏳</span> Đang tạo ảnh...';
        downloadBtn.disabled = true;
        
        // Sử dụng html2canvas để chụp ảnh
        const canvas = await html2canvas(modalContent, {
            backgroundColor: '#ffffff',
            scale: 2, // Độ phân giải cao hơn
            logging: false,
            useCORS: true,
            allowTaint: true
        });
        
        // Chuyển canvas thành blob và tạo link download
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Tạo tên file với số order và ngày
            const orderNumber = document.getElementById('previewOrderNumber').textContent;
            const date = new Date();
            const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
            link.download = `Phieu_Ban_Hang_${orderNumber}_${dateStr}.png`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Giải phóng URL
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            // Khôi phục nút
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
            
            alert('Đã tải ảnh phiếu thành công!');
        }, 'image/png');
        
    } catch (error) {
        console.error('Error generating image:', error);
        alert('Có lỗi xảy ra khi tạo ảnh. Vui lòng thử lại.');
        
        // Khôi phục nút
        const downloadBtn = document.querySelector('.btn-download');
        if (downloadBtn) {
            downloadBtn.innerHTML = '<span style="font-size: 18px; margin-right: 8px;">📥</span> Tải ảnh phiếu';
            downloadBtn.disabled = false;
        }
    }
}

// Xử lý khi checkbox áp dụng voucher được thay đổi
async function handleVoucherApplication() {
    const applyVoucherCheckbox = document.getElementById('applyVoucherModal');
    const voucherInfo = document.getElementById('voucherInfoModal');
    
    if (applyVoucherCheckbox && applyVoucherCheckbox.checked) {
        const customerId = sessionStorage.getItem('customerId');
        if (!customerId) {
            alert('Vui lòng đăng ký thành viên để sử dụng voucher');
            applyVoucherCheckbox.checked = false;
            return;
        }
        
        try {
            const voucherResponse = await fetch(`/api/manager/vouchers/customer/${customerId}`);
            const voucherData = await voucherResponse.json();
            
            if (voucherData.success && voucherData.vouchers && voucherData.vouchers.length > 0) {
                if (voucherInfo) {
                    voucherInfo.style.display = 'block';
                }
                // Tự động cập nhật tổng tiền với voucher
                await updateCartTotalWithVoucher();
            } else {
                alert('Bạn chưa có voucher để sử dụng');
                applyVoucherCheckbox.checked = false;
            }
        } catch (error) {
            console.error('Error loading voucher:', error);
            alert('Có lỗi xảy ra khi tải voucher');
            applyVoucherCheckbox.checked = false;
        }
    } else {
        if (voucherInfo) {
            voucherInfo.style.display = 'none';
        }
        // Cập nhật lại tổng tiền khi bỏ tích voucher
        await updateCartTotalWithVoucher();
    }
}

// Cập nhật tổng tiền với voucher
async function updateCartTotalWithVoucher() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    
    // Kiểm tra xem khách hàng có voucher không và hiển thị phần voucher
    const customerId = sessionStorage.getItem('customerId');
    const voucherSection = document.getElementById('voucherApplicationSection');
    const applyVoucherCheckbox = document.getElementById('applyVoucherModal');
    
    if (customerId && voucherSection) {
        try {
            const voucherResponse = await fetch(`/api/manager/vouchers/customer/${customerId}`);
            const voucherData = await voucherResponse.json();
            
            if (voucherData.success && voucherData.vouchers && voucherData.vouchers.length > 0) {
                // Có voucher, hiển thị phần áp dụng voucher
                voucherSection.style.display = 'block';
                
                // Nếu checkbox được tích, tự động áp dụng voucher
                if (applyVoucherCheckbox && applyVoucherCheckbox.checked) {
                    const availableVoucher = voucherData.vouchers[0];
                    const voucherValue = availableVoucher.value || 500000;
                    // Áp dụng voucher: nếu hóa đơn <= 500k, vẫn trừ hết voucher
                    discount = Math.min(voucherValue, total);
                    
                    // Hiển thị thông tin voucher
                    const voucherInfo = document.getElementById('voucherInfoModal');
                    if (voucherInfo) {
                        voucherInfo.style.display = 'block';
                    }
                } else {
                    // Ẩn thông tin voucher nếu chưa tích
                    const voucherInfo = document.getElementById('voucherInfoModal');
                    if (voucherInfo) {
                        voucherInfo.style.display = 'none';
                    }
                }
            } else {
                // Không có voucher, ẩn phần áp dụng voucher
                voucherSection.style.display = 'none';
                if (applyVoucherCheckbox) {
                    applyVoucherCheckbox.checked = false;
                }
            }
        } catch (error) {
            console.error('Error loading voucher:', error);
            if (voucherSection) {
                voucherSection.style.display = 'none';
            }
        }
    } else {
        if (voucherSection) {
            voucherSection.style.display = 'none';
        }
    }
    
    const finalTotal = total - discount;
    
    if (document.getElementById('finalTotalModal')) {
        document.getElementById('finalTotalModal').textContent = finalTotal.toLocaleString('vi-VN');
    }
    
    if (document.getElementById('cartTotalModal')) {
        document.getElementById('cartTotalModal').textContent = total.toLocaleString('vi-VN');
    }
    
    if (document.getElementById('discountInfoModal')) {
        if (discount > 0) {
            document.getElementById('discountInfoModal').style.display = 'block';
            document.getElementById('discountAmountModal').textContent = discount.toLocaleString('vi-VN');
        } else {
            document.getElementById('discountInfoModal').style.display = 'none';
        }
    }
}

async function updateFinalTotal() {
    await updateCartTotalWithVoucher();
}

async function applyVoucher() {
    const voucherCodeInput = document.getElementById('voucherCode');
    if (!voucherCodeInput) return;
    
    const voucherCode = voucherCodeInput.value;
    
    if (!voucherCode) {
        alert('Vui lòng nhập mã giảm giá');
        return;
    }
    
    await applyVoucherCode(voucherCode);
}

async function applyVoucherModal() {
    const voucherCodeInput = document.getElementById('voucherCodeModal');
    if (!voucherCodeInput) return;
    
    const voucherCode = voucherCodeInput.value;
    
    if (!voucherCode) {
        alert('Vui lòng nhập mã giảm giá');
        return;
    }
    
    await applyVoucherCode(voucherCode);
}

async function applyVoucherCode(voucherCode) {
    // Check voucher via API
    try {
        const response = await fetch(`/api/customer/vouchers/${voucherCode}`);
        const data = await response.json();
        
        if (data.success) {
            appliedVoucher = data.voucher;
            updateFinalTotal();
            alert('Áp dụng mã giảm giá thành công!');
        } else {
            alert('Mã giảm giá không hợp lệ');
        }
    } catch (error) {
        console.error('Error applying voucher:', error);
        alert('Có lỗi xảy ra khi áp dụng mã giảm giá');
    }
}

async function checkout() {
    await processCheckout('deliveryType', 'addressInput', 'usePoints', 'pointsToUse');
}

async function checkoutFromModal() {
    await processCheckout('deliveryTypeModal', 'addressInputModal', 'usePointsModal', 'pointsToUseModal');
}

async function processCheckout(deliveryTypeName, addressInputId, usePointsId, pointsToUseId) {
    if (cart.length === 0) {
        alert('Giỏ hàng trống');
        return;
    }
    
    // Lấy thông tin khách hàng từ sessionStorage
    let customerName = sessionStorage.getItem('customerName');
    let customerPhone = sessionStorage.getItem('customerPhone');
    
    // Nếu chưa có số điện thoại, yêu cầu nhập
    if (!customerPhone) {
        customerPhone = prompt('Vui lòng nhập số điện thoại:');
        if (!customerPhone) {
            alert('Vui lòng nhập số điện thoại');
            return;
        }
        sessionStorage.setItem('customerPhone', customerPhone);
        
        // Kiểm tra khách hàng và lấy tên nếu là khách hàng cũ
        try {
            const response = await fetch(`/api/customer/check?phone=${encodeURIComponent(customerPhone)}`);
            const data = await response.json();
            if (data.success && data.customer) {
                customerName = data.customer.name || '';
                sessionStorage.setItem('customerName', customerName);
                sessionStorage.setItem('customerId', data.customer.id);
            }
        } catch (error) {
            console.error('Error checking customer:', error);
        }
    }
    
    // Nếu vẫn chưa có tên, yêu cầu nhập
    if (!customerName) {
        customerName = prompt('Vui lòng nhập họ tên:');
        if (!customerName) {
            alert('Vui lòng nhập họ tên');
            return;
        }
        sessionStorage.setItem('customerName', customerName);
    }
    
    const deliveryTypeRadio = document.querySelector(`input[name="${deliveryTypeName}"]:checked`);
    if (!deliveryTypeRadio) {
        alert('Vui lòng chọn hình thức giao hàng');
        return;
    }
    const deliveryType = deliveryTypeRadio.value;
    const isTakeawayOrDelivery = deliveryType === 'takeaway' || deliveryType === 'delivery';
    
    // Lấy số lượng người - chỉ bắt buộc nếu là đơn tại bàn
    const numberOfPeopleInput = document.getElementById('numberOfPeople');
    let numberOfPeople = 1;
    if (!isTakeawayOrDelivery) {
        numberOfPeople = numberOfPeopleInput ? parseInt(numberOfPeopleInput.value) || 1 : 1;
        
        if (numberOfPeople < 1) {
            alert('Số lượng người phải lớn hơn 0');
            return;
        }
    }
    
    // Lấy thời gian ăn - chỉ bắt buộc nếu là đơn tại bàn
    const eatingTimeInput = document.getElementById('eatingTime');
    let eatingTime = null;
    if (!isTakeawayOrDelivery) {
        eatingTime = eatingTimeInput ? eatingTimeInput.value : null;
        
        if (!eatingTime) {
            alert('Vui lòng chọn thời gian ăn');
            return;
        }
        
        // Kiểm tra thời gian ăn không được trong quá khứ
        const selectedTime = new Date(eatingTime);
        const now = new Date();
        if (selectedTime < now) {
            alert('Thời gian ăn không được trong quá khứ');
            return;
        }
    }
    const deliveryAddress = deliveryType === 'delivery' ? document.getElementById(addressInputId)?.value : null;
    
    if (deliveryType === 'delivery' && !deliveryAddress) {
        alert('Vui lòng nhập địa chỉ giao hàng');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    let voucherId = null;
    
    // Kiểm tra xem khách hàng có muốn áp dụng voucher không
    const applyVoucherCheckbox = document.getElementById('applyVoucherModal');
    if (applyVoucherCheckbox && applyVoucherCheckbox.checked) {
        const customerId = sessionStorage.getItem('customerId');
        if (customerId) {
            try {
                const voucherResponse = await fetch(`/api/manager/vouchers/customer/${customerId}`);
                const voucherData = await voucherResponse.json();
                
                if (voucherData.success && voucherData.vouchers && voucherData.vouchers.length > 0) {
                    // Lấy voucher đầu tiên chưa sử dụng
                    const availableVoucher = voucherData.vouchers[0];
                    const voucherValue = availableVoucher.value || 500000;
                    
                    // Áp dụng voucher: nếu hóa đơn <= 500k, vẫn trừ hết voucher
                    discount = Math.min(voucherValue, total);
                    voucherId = availableVoucher.id;
                    
                    // Lưu voucherId vào sessionStorage để đánh dấu đã sử dụng sau khi thanh toán
                    sessionStorage.setItem('usedVoucherId', voucherId);
                } else {
                    alert('Bạn chưa có voucher để sử dụng');
                    return;
                }
            } catch (error) {
                console.error('Error loading voucher:', error);
                alert('Có lỗi xảy ra khi tải voucher');
                return;
            }
        } else {
            alert('Vui lòng đăng ký thành viên để sử dụng voucher');
            return;
        }
    }
    
    const finalTotal = Math.max(0, total - discount);
    
    try {
        const response = await fetch('/api/customer/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: null, // Customer không cần đăng nhập
                customerId: sessionStorage.getItem('customerId') || null, // ID từ collection customers
                customerName,
                customerPhone,
                items: cart,
                total,
                discount,
                finalTotal,
                voucherId: voucherId, // ID của voucher được sử dụng
                deliveryType,
                deliveryAddress,
                numberOfPeople: numberOfPeople,
                eatingTime: eatingTime
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Đặt hàng thành công!');
            cart = [];
            appliedVoucher = null;
            
            // Xóa voucherId khỏi sessionStorage nếu đã sử dụng
            if (voucherId) {
                sessionStorage.removeItem('usedVoucherId');
            }
            
            // Reset checkbox áp dụng voucher
            const applyVoucherCheckbox = document.getElementById('applyVoucherModal');
            if (applyVoucherCheckbox) {
                applyVoucherCheckbox.checked = false;
            }
            
            updateCart();
            toggleCartModal(); // Đóng modal sau khi đặt hàng thành công
            
            // Reload điểm tích lũy để cập nhật thông báo voucher
            loadPoints();
            
            // Reset form
            if (document.getElementById('voucherCodeModal')) {
                document.getElementById('voucherCodeModal').value = '';
            }
            if (document.getElementById('addressInputModal')) {
                document.getElementById('addressInputModal').value = '';
            }
        } else {
            alert('Có lỗi xảy ra khi đặt hàng');
        }
    } catch (error) {
        console.error('Error checking out:', error);
        alert('Có lỗi xảy ra khi đặt hàng');
    }
}

async function loadOrders() {
    // Customer không cần đăng nhập, có thể xem đơn hàng bằng số điện thoại
    const phone = prompt('Nhập số điện thoại để xem đơn hàng:');
    if (!phone) return;
    
    try {
        // Tìm đơn hàng theo số điện thoại
        const response = await fetch(`/api/manager/orders/search?query=${phone}`);
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
        const statusText = {
            'pending': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'preparing': 'Đang chuẩn bị',
            'serving': 'Đang phục vụ',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy'
        };
        orderDiv.innerHTML = `
            <h3>Đơn hàng #${order.id.substring(0, 8)}</h3>
            <p>Trạng thái: ${statusText[order.status] || order.status}</p>
            <p>Hình thức: ${order.deliveryType === 'at-table' ? 'Tại bàn' : order.deliveryType === 'takeaway' ? 'Mang về' : 'Giao hàng'}</p>
            <p>Tổng tiền: ${(order.finalTotal || order.total).toLocaleString()} VNĐ</p>
            <p>Thanh toán: ${order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
            <p>Ngày đặt: ${new Date(order.createdAt?.toDate()).toLocaleString('vi-VN')}</p>
            <button onclick="viewOrderDetail('${order.id}')">Xem chi tiết</button>
            ${order.paymentStatus !== 'paid' ? `<button onclick="payOrder('${order.id}')">Thanh toán</button>` : ''}
        `;
        ordersList.appendChild(orderDiv);
    });
}

async function viewOrderDetail(orderId) {
    try {
        const response = await fetch(`/api/customer/orders/${orderId}`);
        const data = await response.json();
        
        if (data.success) {
            const order = data.order;
            alert(`Chi tiết đơn hàng:\n\nMón ăn:\n${order.items.map(i => `- ${i.name} x${i.quantity}`).join('\n')}\n\nTổng: ${order.finalTotal.toLocaleString()} VNĐ`);
        }
    } catch (error) {
        console.error('Error loading order detail:', error);
    }
}

async function payOrder(orderId) {
    const paymentMethod = prompt('Chọn phương thức thanh toán:\n1. Tiền mặt\n2. VNPay\n3. Momo\n\nNhập số (1-3):');
    const methods = { '1': 'cash', '2': 'vnpay', '3': 'momo' };
    
    if (!methods[paymentMethod]) {
        alert('Phương thức thanh toán không hợp lệ');
        return;
    }
    
    try {
        const response = await fetch(`/api/customer/orders/${orderId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod: methods[paymentMethod] })
        });
        
        if (response.ok) {
            alert('Thanh toán thành công!');
            loadOrders();
        }
    } catch (error) {
        console.error('Error paying order:', error);
    }
}

async function loadPointsHistory() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/customer/points/history/${currentUser.uid}`);
        const data = await response.json();
        
        if (data.success) {
            const historyDiv = document.getElementById('pointsHistory');
            historyDiv.style.display = 'block';
            historyDiv.innerHTML = '<h3>Lịch sử tích điểm</h3>';
            data.history.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.innerHTML = `
                    <p>${item.type === 'add' ? '+' : '-'}${item.points} điểm - ${item.reason || ''} - ${new Date(item.createdAt?.toDate()).toLocaleString('vi-VN')}</p>
                `;
                historyDiv.appendChild(itemDiv);
            });
        }
    } catch (error) {
        console.error('Error loading points history:', error);
    }
}

async function loadPoints() {
    // Customer không cần đăng nhập, không có tích điểm
    if (document.getElementById('currentPoints')) {
        document.getElementById('currentPoints').textContent = '0';
    }
    currentPoints = 0;
}

// Customer không cần đăng nhập
// Ẩn các section liên quan đến auth và profile
if (document.getElementById('auth-section')) {
    document.getElementById('auth-section').style.display = 'none';
}
if (document.getElementById('profile-section')) {
    document.getElementById('profile-section').style.display = 'none';
}

async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('profileName').value = userData.name || '';
            document.getElementById('profilePhone').value = userData.phone || '';
            document.getElementById('profileAddress').value = userData.address || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Delivery type change
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[name="deliveryType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('deliveryAddress').style.display = e.target.value === 'delivery' ? 'block' : 'none';
        });
    });
    
    document.getElementById('usePoints').addEventListener('change', (e) => {
        document.getElementById('pointsToUse').style.display = e.target.checked ? 'block' : 'none';
        if (e.target.checked) {
            document.getElementById('pointsToUse').max = currentPoints;
        }
    });
});

// Xử lý thay đổi delivery type
function handleDeliveryTypeChange() {
    const deliveryTypeRadio = document.querySelector('input[name="deliveryTypeModal"]:checked');
    const numberOfPeopleSection = document.getElementById('numberOfPeopleSection');
    const eatingTimeSection = document.getElementById('eatingTimeSection');
    const deliveryAddressModal = document.getElementById('deliveryAddressModal');
    const numberOfPeopleInput = document.getElementById('numberOfPeople');
    const eatingTimeInput = document.getElementById('eatingTime');
    
    if (!deliveryTypeRadio) return;
    
    const deliveryType = deliveryTypeRadio.value;
    const isTakeawayOrDelivery = deliveryType === 'takeaway' || deliveryType === 'delivery';
    
    // Ẩn/hiện số lượng người và thời gian ăn
    if (numberOfPeopleSection) {
        numberOfPeopleSection.style.display = isTakeawayOrDelivery ? 'none' : 'block';
    }
    if (eatingTimeSection) {
        eatingTimeSection.style.display = isTakeawayOrDelivery ? 'none' : 'block';
    }
    
    // Bỏ required nếu là mang về/giao hàng
    if (numberOfPeopleInput) {
        numberOfPeopleInput.required = !isTakeawayOrDelivery;
    }
    if (eatingTimeInput) {
        eatingTimeInput.required = !isTakeawayOrDelivery;
    }
    
    // Hiển thị địa chỉ giao hàng nếu là delivery
    if (deliveryAddressModal) {
        deliveryAddressModal.style.display = deliveryType === 'delivery' ? 'block' : 'none';
    }
}

// Menu sẽ được load tự động khi DOMContentLoaded
// Gọi checkAndDisplayCustomerWelcome khi trang load
document.addEventListener('DOMContentLoaded', async function() {
    await checkAndDisplayCustomerWelcome();
    // Load menu items mặc định
    if (document.getElementById('menuTabBtn')) {
        showMenuTab();
    }
});


