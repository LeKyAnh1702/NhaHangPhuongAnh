// Kiểm tra authentication cho Admin
(function() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    const userRole = sessionStorage.getItem('userRole');
    
    if (!isAuthenticated || userRole !== 'admin') {
        alert('Bạn cần đăng nhập để truy cập trang này!');
        sessionStorage.clear();
        window.location.href = '/';
    }
})();

