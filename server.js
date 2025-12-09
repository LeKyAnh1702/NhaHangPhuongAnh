const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/images', express.static('images'));

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const managerRoutes = require('./routes/manager');
const adminRoutes = require('./routes/admin');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/customer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer', 'index.html'));
});

app.get('/order-online', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'order-online.html'));
});

app.get('/manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'dashboard.html'));
});

app.get('/manager/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'dashboard.html'));
});

app.get('/manager/customers', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'customers.html'));
});

app.get('/manager/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'orders.html'));
});

app.get('/manager/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'menu.html'));
});

app.get('/manager/tables', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'tables.html'));
});

app.get('/manager/search', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'search.html'));
});

app.get('/manager/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'reports.html'));
});

app.get('/manager/inventory-alerts', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'inventory-alerts.html'));
});

app.get('/manager/vouchers', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager', 'vouchers.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/admin/import', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'import.html'));
});

app.get('/admin/export', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'export.html'));
});

app.get('/admin/inventory-balance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'inventory-balance.html'));
});

app.get('/admin/users', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'users.html'));
});

app.get('/admin/suppliers', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'suppliers.html'));
});

app.get('/admin/materials', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'materials.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
