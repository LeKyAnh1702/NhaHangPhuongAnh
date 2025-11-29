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

// Load menu
async function loadMenu() {
    try {
        const response = await fetch('/api/customer/menu');
        const data = await response.json();
        
        if (data.success) {
            displayMenu(data.menu);
        }
    } catch (error) {
        console.error('Error loading menu:', error);
    }
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
    
    if (!currentUser) {
        alert('Vui lòng đăng nhập để đặt hàng');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = appliedVoucher ? (total * appliedVoucher.discount / 100) : 0;
    const finalTotal = total - discount;
    
    try {
        const response = await fetch('/api/customer/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.uid,
                items: cart,
                total,
                discount,
                finalTotal,
                voucherCode: appliedVoucher ? appliedVoucher.code : null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Đặt hàng thành công!');
            
            // Add points (1 point per 10,000 VNĐ)
            const points = Math.floor(finalTotal / 10000);
            if (points > 0) {
                await fetch('/api/customer/points/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: currentUser.uid,
                        points
                    })
                });
            }
            
            cart = [];
            appliedVoucher = null;
            updateCart();
            loadOrders();
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
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/customer/orders/${currentUser.uid}`);
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
        orderDiv.innerHTML = `
            <h3>Đơn hàng #${order.id.substring(0, 8)}</h3>
            <p>Trạng thái: ${order.status}</p>
            <p>Tổng tiền: ${order.finalTotal.toLocaleString()} VNĐ</p>
            <p>Ngày đặt: ${new Date(order.createdAt?.toDate()).toLocaleString('vi-VN')}</p>
        `;
        ordersList.appendChild(orderDiv);
    });
}

async function loadPoints() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            currentPoints = userDoc.data().points || 0;
            document.getElementById('currentPoints').textContent = currentPoints;
        }
    } catch (error) {
        console.error('Error loading points:', error);
    }
}

// Initialize
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        loadOrders();
        loadPoints();
    }
});

loadMenu();


