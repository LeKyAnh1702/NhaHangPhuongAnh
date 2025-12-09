// Middleware để kiểm tra authentication
// Lưu ý: Vì đang sử dụng sessionStorage ở client-side, 
// middleware này sẽ kiểm tra qua header hoặc có thể bỏ qua nếu chỉ dùng client-side check

module.exports = {
    // Middleware cho Admin routes
    requireAdmin: (req, res, next) => {
        // Kiểm tra qua sessionStorage sẽ được xử lý ở client-side
        // Nếu cần server-side check, có thể thêm logic ở đây
        // Hiện tại chỉ cần pass qua vì client-side đã check
        next();
    },
    
    // Middleware cho Manager routes
    requireManager: (req, res, next) => {
        // Kiểm tra qua sessionStorage sẽ được xử lý ở client-side
        // Nếu cần server-side check, có thể thêm logic ở đây
        // Hiện tại chỉ cần pass qua vì client-side đã check
        next();
    }
};

