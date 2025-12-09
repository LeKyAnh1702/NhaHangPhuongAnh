// Script để kiểm tra user trong Firestore
// Chạy: node scripts/check-users.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUsers() {
    try {
        console.log('Đang kiểm tra users trong Firestore...\n');
        
        // Kiểm tra Admin
        const adminUsers = await db.collection('users')
            .where('email', '==', 'admin@nhahangphuonganh.com')
            .get();
        
        console.log('Admin users:');
        if (adminUsers.empty) {
            console.log('  ❌ Không tìm thấy admin user');
        } else {
            adminUsers.forEach(doc => {
                const data = doc.data();
                console.log('  ✅ Tìm thấy:');
                console.log('     ID:', doc.id);
                console.log('     Email:', data.email);
                console.log('     Name:', data.name);
                console.log('     Role:', data.role);
                console.log('     Username:', data.username);
            });
        }
        
        // Kiểm tra Manager
        const managerUsers = await db.collection('users')
            .where('email', '==', 'manager@nhahangphuonganh.com')
            .get();
        
        console.log('\nManager users:');
        if (managerUsers.empty) {
            console.log('  ❌ Không tìm thấy manager user');
        } else {
            managerUsers.forEach(doc => {
                const data = doc.data();
                console.log('  ✅ Tìm thấy:');
                console.log('     ID:', doc.id);
                console.log('     Email:', data.email);
                console.log('     Name:', data.name);
                console.log('     Role:', data.role);
                console.log('     Username:', data.username);
            });
        }
        
        // Liệt kê tất cả users
        console.log('\nTất cả users trong hệ thống:');
        const allUsers = await db.collection('users').get();
        if (allUsers.empty) {
            console.log('  ❌ Không có user nào');
        } else {
            allUsers.forEach(doc => {
                const data = doc.data();
                console.log(`  - ${data.email} (${data.role || 'no role'})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
    }
    
    process.exit(0);
}

checkUsers();

