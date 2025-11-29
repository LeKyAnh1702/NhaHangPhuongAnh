// Script để tạo tài khoản Admin và Manager
// Chạy: node scripts/create-accounts.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createAccounts() {
    try {
        // Tạo tài khoản Admin
        const adminUser = await auth.createUser({
            email: 'admin@nhahangphuonganh.com',
            password: 'nhahangphuonganh',
            displayName: 'Admin Phương Anh'
        });

        await db.collection('users').doc(adminUser.uid).set({
            email: 'admin@nhahangphuonganh.com',
            name: 'Admin Phương Anh',
            role: 'admin',
            username: 'lekyanh123',
            phone: '',
            points: 0,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Tài khoản Admin đã được tạo:');
        console.log('   Username: lekyanh123');
        console.log('   Email: admin@nhahangphuonganh.com');
        console.log('   Password: nhahangphuonganh');
        console.log('   UID:', adminUser.uid);

        // Tạo tài khoản Manager
        const managerUser = await auth.createUser({
            email: 'manager@nhahangphuonganh.com',
            password: 'nhahangphuonganh',
            displayName: 'Manager Phương Anh'
        });

        await db.collection('users').doc(managerUser.uid).set({
            email: 'manager@nhahangphuonganh.com',
            name: 'Manager Phương Anh',
            role: 'manager',
            username: 'lekyanh172',
            phone: '',
            points: 0,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('\n✅ Tài khoản Manager đã được tạo:');
        console.log('   Username: lekyanh172');
        console.log('   Email: manager@nhahangphuonganh.com');
        console.log('   Password: nhahangphuonganh');
        console.log('   UID:', managerUser.uid);

        console.log('\n✅ Hoàn thành! Bạn có thể đăng nhập với các tài khoản trên.');

    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log('⚠️  Tài khoản đã tồn tại. Nếu cần tạo lại, hãy xóa tài khoản cũ trong Firebase Console trước.');
        } else {
            console.error('❌ Lỗi:', error);
        }
    }
    
    process.exit(0);
}

createAccounts();

