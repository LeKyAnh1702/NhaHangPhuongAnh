// Global variables
let allCustomers = [];
let currentRedeemingCustomer = null;
let selectedVoucherPoints = null;
let selectedVoucherDiscount = null;

// Load customers on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCustomers();
});

// Load all customers
async function loadCustomers() {
    try {
        const response = await fetch('/api/manager/customers');
        const data = await response.json();
        
        if (data.success && data.customers) {
            allCustomers = data.customers.filter(c => c.isActive !== false);
            displayCustomers(allCustomers);
        } else {
            console.error('Error loading customers:', data.error);
            alert('Có lỗi xảy ra khi tải danh sách khách hàng');
        }
    } catch (error) {
        console.error('Error loading customers:', error);
        alert('Có lỗi xảy ra khi tải danh sách khách hàng');
    }
}

// Display customers in table
async function displayCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 20px;">Không có khách hàng nào</td></tr>';
        return;
    }
    
    // Load tất cả voucher để đếm
    let vouchersMap = {};
    try {
        const vouchersResponse = await fetch('/api/manager/vouchers/all');
        const vouchersData = await vouchersResponse.json();
        if (vouchersData.success && vouchersData.vouchers) {
            vouchersData.vouchers.forEach(voucher => {
                if (!vouchersMap[voucher.customerId]) {
                    vouchersMap[voucher.customerId] = [];
                }
                vouchersMap[voucher.customerId].push(voucher);
            });
        }
    } catch (error) {
        console.error('Error loading vouchers:', error);
    }
    
    // Load eligibility cho tất cả khách hàng
    const eligibilityMap = {};
    await Promise.all(customers.map(async (customer) => {
        try {
            const eligibilityResponse = await fetch(`/api/manager/vouchers/check-eligibility/${customer.id}`);
            const eligibilityData = await eligibilityResponse.json();
            if (eligibilityData.success) {
                eligibilityMap[customer.id] = eligibilityData.eligible;
            }
        } catch (error) {
            console.error('Error checking eligibility:', error);
        }
    }));
    
    customers.forEach((customer, index) => {
        const row = document.createElement('tr');
        const remainingPoints = customer.points || 0; // Điểm còn lại sau khi đã đổi voucher
        
        // Đếm số voucher đã đổi (từ collection vouchers)
        const customerVouchers = vouchersMap[customer.id] || [];
        const totalVouchers = customerVouchers.length; // Đếm tất cả voucher (active + used)
        
        // Tính tổng điểm từ API (nếu có) hoặc tính từ điểm còn lại + voucher
        const totalPoints = customer.totalPoints || (remainingPoints + (totalVouchers * 50));
        
        // Tính số lượng voucher có thể đổi thêm (làm tròn xuống)
        const vouchersAvailable = Math.floor(remainingPoints / 50);
        
        // Kiểm tra điều kiện để có voucher
        const isEligible = eligibilityMap[customer.id] || false;
        
        // Hiển thị điểm tích lũy: hiển thị điểm còn lại (sau khi đã tự động đổi voucher)
        const pointsDisplay = `${remainingPoints} điểm`;
        
        // Lấy tổng số hóa đơn và tổng tiền thanh toán từ API response
        const totalOrders = customer.totalPaidOrders || 0;
        const totalPaidAmount = customer.totalPaidAmount || 0;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${customer.code || 'N/A'}</td>
            <td>${customer.name || 'N/A'}</td>
            <td>${customer.idCard || 'N/A'}</td>
            <td>${customer.address || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td>${customer.company || 'N/A'}</td>
            <td>${totalOrders}</td>
            <td>${totalPaidAmount.toLocaleString('vi-VN')} VNĐ</td>
            <td><span class="points-badge">${pointsDisplay}</span></td>
            <td>
                <span class="points-badge" style="background: #28a745;">${totalVouchers} Voucher</span>
                ${vouchersAvailable > 0 && isEligible ? `<button class="btn-redeem" onclick="openRedeemVoucherModal('${customer.id}')" style="margin-left: 8px;">Đổi Voucher 500k</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Search customers
function searchCustomers() {
    const searchTerm = document.getElementById('searchCustomerInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayCustomers(allCustomers);
        return;
    }
    
    const filtered = allCustomers.filter(customer => {
        const code = (customer.code || '').toLowerCase();
        const name = (customer.name || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        const idCard = (customer.idCard || '').toLowerCase();
        
        return code.includes(searchTerm) || 
               name.includes(searchTerm) || 
               phone.includes(searchTerm) ||
               idCard.includes(searchTerm);
    });
    
    displayCustomers(filtered);
}

// Reset search
function resetCustomerSearch() {
    document.getElementById('searchCustomerInput').value = '';
    displayCustomers(allCustomers);
}

// Open redeem voucher modal
async function openRedeemVoucherModal(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) {
        alert('Không tìm thấy khách hàng');
        return;
    }
    
    const currentPoints = customer.points || 0;
    const requiredPoints = 50;
    
    if (currentPoints < requiredPoints) {
        alert(`Khách hàng không đủ điểm. Hiện tại có ${currentPoints} điểm, cần ${requiredPoints} điểm để đổi voucher.`);
        return;
    }
    
    // Kiểm tra điều kiện để có voucher
    try {
        const eligibilityResponse = await fetch(`/api/manager/vouchers/check-eligibility/${customerId}`);
        const eligibilityData = await eligibilityResponse.json();
        
        if (!eligibilityData.success || !eligibilityData.eligible) {
            alert(`Khách hàng chưa đủ điều kiện để đổi voucher.\n- Cần ít nhất ${eligibilityData.requiredOrders || 10} hóa đơn (hiện tại: ${eligibilityData.orderCount || 0})\n- Cần tổng doanh số ít nhất ${(eligibilityData.requiredRevenue || 5000000).toLocaleString('vi-VN')} VNĐ (hiện tại: ${(eligibilityData.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ)`);
            return;
        }
    } catch (error) {
        console.error('Error checking eligibility:', error);
        alert('Có lỗi xảy ra khi kiểm tra điều kiện voucher');
        return;
    }
    
    currentRedeemingCustomer = customer;
    selectedVoucherPoints = requiredPoints;
    
    document.getElementById('redeemCustomerName').textContent = customer.name || 'N/A';
    document.getElementById('redeemCustomerCode').textContent = customer.code || 'N/A';
    document.getElementById('redeemCurrentPoints').textContent = currentPoints;
    
    // Update voucher option
    const option = document.querySelector('.voucher-option');
    if (option) {
        option.classList.remove('disabled');
        option.classList.add('selected');
    }
    
    document.getElementById('redeemVoucherModal').style.display = 'block';
}

// Select voucher option (không cần nữa vì chỉ có 1 loại voucher)
function selectVoucher() {
    // Không cần làm gì vì chỉ có 1 loại voucher
}

// Confirm redeem voucher
async function confirmRedeemVoucher() {
    if (!currentRedeemingCustomer || !selectedVoucherPoints) {
        alert('Vui lòng chọn voucher để đổi');
        return;
    }
    
    const currentPoints = currentRedeemingCustomer.points || 0;
    if (currentPoints < selectedVoucherPoints) {
        alert(`Không đủ điểm. Cần ${selectedVoucherPoints} điểm.`);
        return;
    }
    
    if (!confirm(`Xác nhận đổi ${selectedVoucherPoints} điểm để nhận voucher trị giá 500.000 VNĐ?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/manager/vouchers/redeem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerId: currentRedeemingCustomer.id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Đổi voucher thành công! Khách hàng nhận được voucher trị giá 500.000 VNĐ.`);
            closeRedeemVoucherModal();
            loadCustomers(); // Reload to update points
        } else {
            alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error redeeming voucher:', error);
        alert('Có lỗi xảy ra khi đổi voucher');
    }
}

// Close redeem voucher modal
function closeRedeemVoucherModal() {
    document.getElementById('redeemVoucherModal').style.display = 'none';
    currentRedeemingCustomer = null;
    selectedVoucherPoints = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('redeemVoucherModal');
    if (event.target === modal) {
        closeRedeemVoucherModal();
    }
}

