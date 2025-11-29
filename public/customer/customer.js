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

// Load menu
let currentMenuTab = 'menu';

async function loadMenu(category = null) {
    try {
        const url = category ? `/api/customer/menu?category=${category}` : '/api/customer/menu';
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayMenu(data.menu);
        }
    } catch (error) {
        console.error('Error loading menu:', error);
    }
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

async function loadCombos() {
    try {
        const response = await fetch('/api/customer/combos');
        const data = await response.json();
        
        if (data.success) {
            displayCombos(data.combos);
        }
    } catch (error) {
        console.error('Error loading combos:', error);
    }
}

function displayCombos(combos) {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    combos.forEach(combo => {
        const comboItem = document.createElement('div');
        comboItem.className = 'menu-item';
        comboItem.innerHTML = `
            <img src="${combo.imageUrl || '../images/placeholder.jpg'}" alt="${combo.name}">
            <h3>${combo.name}</h3>
            <p>${combo.description || ''}</p>
            <p class="price">${combo.price.toLocaleString()} VNĐ</p>
            <button onclick="addComboToCart('${combo.id}', '${combo.name}', ${combo.price}, ${JSON.stringify(combo.items).replace(/"/g, '&quot;')})">Thêm vào giỏ</button>
        `;
        menuGrid.appendChild(comboItem);
    });
}

function showMenuTab() {
    currentMenuTab = 'menu';
    loadMenu();
    document.querySelectorAll('.menu-tabs button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function showComboTab() {
    currentMenuTab = 'combo';
    loadCombos();
    document.querySelectorAll('.menu-tabs button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function displayMenu(menu) {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    menu.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.innerHTML = `
            <img src="${item.imageUrl || '../images/placeholder.jpg'}" alt="${item.name}">
            <h3>${item.name}</h3>
            <p>${item.description || ''}</p>
            <p class="price">${item.price.toLocaleString()} VNĐ</p>
            <button onclick="addToCart('${item.id}', '${item.name}', ${item.price})">Thêm vào giỏ</button>
        `;
        menuGrid.appendChild(menuItem);
    });
}

function addToCart(menuId, name, price) {
    const existingItem = cart.find(item => item.menuId === menuId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ menuId, name, price, quantity: 1 });
    }
    
    updateCart();
}

function removeFromCart(menuId) {
    cart = cart.filter(item => item.menuId !== menuId);
    updateCart();
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    cartItems.innerHTML = '';
    
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div>
                <p><strong>${item.name}</strong></p>
                <p>${item.price.toLocaleString()} VNĐ x ${item.quantity}</p>
            </div>
            <div>
                <p>${itemTotal.toLocaleString()} VNĐ</p>
                <button onclick="removeFromCart('${item.menuId}')">Xóa</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    document.getElementById('cartTotal').textContent = total.toLocaleString();
    updateFinalTotal();
}

function updateFinalTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = appliedVoucher ? (total * appliedVoucher.discount / 100) : 0;
    const finalTotal = total - discount;
    
    document.getElementById('finalTotal').textContent = finalTotal.toLocaleString();
    
    if (appliedVoucher) {
        document.getElementById('discountInfo').style.display = 'block';
        document.getElementById('discountAmount').textContent = discount.toLocaleString();
    }
}

async function applyVoucher() {
    const voucherCode = document.getElementById('voucherCode').value;
    
    if (!voucherCode) {
        alert('Vui lòng nhập mã giảm giá');
        return;
    }
    
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
    if (cart.length === 0) {
        alert('Giỏ hàng trống');
        return;
    }
    
    // Customer không cần đăng nhập, lấy thông tin từ form
    const customerName = prompt('Vui lòng nhập họ tên:');
    const customerPhone = prompt('Vui lòng nhập số điện thoại:');
    
    if (!customerName || !customerPhone) {
        alert('Vui lòng nhập đầy đủ thông tin');
        return;
    }
    
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const deliveryAddress = deliveryType === 'delivery' ? document.getElementById('addressInput').value : null;
    
    if (deliveryType === 'delivery' && !deliveryAddress) {
        alert('Vui lòng nhập địa chỉ giao hàng');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = appliedVoucher ? (total * appliedVoucher.discount / 100) : 0;
    
    // Sử dụng điểm
    const usePoints = document.getElementById('usePoints').checked;
    let pointsUsed = 0;
    if (usePoints) {
        pointsUsed = parseInt(document.getElementById('pointsToUse').value) || 0;
        if (pointsUsed > currentPoints) {
            alert('Không đủ điểm');
            return;
        }
        discount += pointsUsed * 1000; // 1 điểm = 1000 VNĐ
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
                customerName,
                customerPhone,
                items: cart,
                total,
                discount,
                finalTotal,
                voucherCode: appliedVoucher ? appliedVoucher.code : null,
                deliveryType,
                deliveryAddress
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Customer không cần tích điểm nếu không đăng nhập
            
            alert('Đặt hàng thành công!');
            cart = [];
            appliedVoucher = null;
            updateCart();
            loadOrders();
            loadPoints();
        } else {
            alert('Có lỗi xảy ra khi đặt hàng');
        }
    } catch (error) {
        console.error('Error checking out:', error);
        alert('Có lỗi xảy ra khi đặt hàng');
    }
}

async function searchMenu() {
    const query = document.getElementById('searchInput').value;
    
    try {
        const response = await fetch(`/api/customer/menu/search?query=${query}`);
        const data = await response.json();
        
        if (data.success) {
            displayMenu(data.menu);
        }
    } catch (error) {
        console.error('Error searching menu:', error);
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

loadMenu();
loadCategories();


