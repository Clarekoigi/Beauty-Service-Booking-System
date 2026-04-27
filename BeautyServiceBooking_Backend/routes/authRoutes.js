const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../config/db');

// --- 1. Public Routes ---
// These handle the 'Register' and 'Login' buttons
router.post('/register', authController.register);
router.post('/login', authController.login);

// --- 2. Protected Routes (Logged-in users only) ---

/**
 * @route   GET /api/auth/profile
 * @desc    Fetch current user's details including phone and hostel
 */
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT id, username, email, role, phone_number, hostel_location FROM users WHERE id = ?",
            [req.user.id]
        );
        
        if (rows.length === 0) return res.status(404).json({ message: "User not found" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile." });
    }
});

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update stylist contact info (Phone & Hostel)
 */
router.put('/update-profile', verifyToken, async (req, res) => {
    const { phone_number, hostel_location } = req.body;

    if (!phone_number || !hostel_location) {
        return res.status(400).json({ message: "Phone and Location are required." });
    }

    try {
        await db.execute(
            "UPDATE users SET phone_number = ?, hostel_location = ? WHERE id = ?",
            [phone_number, hostel_location, req.user.id]
        );
        res.json({ success: true, message: "Profile updated successfully!" });
    } catch (err) {
        console.error("Update Profile Error:", err.message);
        res.status(500).json({ error: "Database update failed." });
    }
});

module.exports = router;