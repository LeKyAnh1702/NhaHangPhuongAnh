const express = require('express');
const router = express.Router();
const { db, auth, admin } = require('../config/firebase');

// Đăng ký
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        
        // Tạo user trong Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name
        });

        // Lưu thông tin vào Firestore
        await db.collection('users').doc(userRecord.uid).set({
            email,
            name,
            role: role || 'customer',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            points: 0
        });

        res.json({ success: true, uid: userRecord.uid });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Đăng nhập
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Firebase Auth sẽ xử lý login ở client side
        // API này chỉ để lấy thông tin user
        const user = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (user.empty) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userData = user.docs[0].data();
        res.json({ success: true, user: { id: user.docs[0].id, ...userData } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;

