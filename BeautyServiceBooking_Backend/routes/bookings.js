const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Helper function to create internal notifications
async function createNotification(userId, message) {
    try {
        await db.execute(
            "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
            [userId, message]
        );
    } catch (err) {
        console.error("Notification Error:", err.message);
    }
}

// --- 1. POST: Create a New Booking ---
router.post('/create', verifyToken, async (req, res) => {
    const { service_id, appointment_date } = req.body;
    const customer_id = req.user.id;

    if (!service_id || !appointment_date) {
        return res.status(400).json({ message: "Service and Date are required." });
    }

    try {
        await db.execute(
            "INSERT INTO bookings (customer_id, service_id, appointment_date, status) VALUES (?, ?, ?, 'Pending')",
            [customer_id, service_id, appointment_date]
        );

        const [service] = await db.execute("SELECT provider_id, title FROM services WHERE id = ?", [service_id]);
        if (service.length > 0) {
            await createNotification(service[0].provider_id, `New request: ${req.user.username} wants to book ${service[0].title}.`);
        }

        res.status(201).json({ success: true, message: "Request sent! Check back for stylist confirmation." });
    } catch (err) {
        res.status(500).json({ error: "Failed to create booking." });
    }
});

// --- 2. GET: Fetch Bookings for the Stylist (Provider) ---
router.get('/provider-bookings', verifyToken, async (req, res) => {
    const providerId = req.user.id;
    try {
        const [rows] = await db.execute(`
            SELECT 
                b.id, b.appointment_date, b.status, 
                u.username AS customer_name, 
                s.title AS service_name, s.price
            FROM bookings b
            JOIN users u ON b.customer_id = u.id
            JOIN services s ON b.service_id = s.id
            WHERE s.provider_id = ? AND b.status != 'Cancelled'
            ORDER BY b.appointment_date DESC`, 
            [providerId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load stylist schedule." });
    }
});

// --- 3. GET: Fetch Bookings for the Student (Customer) ---
router.get('/my-bookings', verifyToken, async (req, res) => {
    const customerId = req.user.id;
    try {
        const [rows] = await db.execute(`
            SELECT 
                b.id, b.appointment_date, b.status, 
                s.title AS service_name,
                u.username AS stylist_name,
                u.phone_number,
                u.hostel_location
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON s.provider_id = u.id
            WHERE b.customer_id = ?
            ORDER BY b.appointment_date DESC`, 
            [customerId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load history." });
    }
});

// --- 4. PUT: Update Booking Status ---
router.put('/update/:id', verifyToken, async (req, res) => {
    const { status } = req.body; 
    const bookingId = req.params.id;
    const providerId = req.user.id; 

    try {
        const [result] = await db.execute(`
            UPDATE bookings b
            JOIN services s ON b.service_id = s.id
            SET b.status = ?
            WHERE b.id = ? AND s.provider_id = ?`, 
            [status, bookingId, providerId]
        );

        if (result.affectedRows > 0) {
            const [booking] = await db.execute("SELECT customer_id FROM bookings WHERE id = ?", [bookingId]);
            await createNotification(booking[0].customer_id, `Your booking status is now: ${status}.`);
            res.json({ success: true, message: `Status updated to ${status}` });
        } else {
            res.status(403).json({ message: "Update denied." });
        }
    } catch (err) {
        res.status(500).json({ error: "Database error." });
    }
});

// --- 5. GET: Fetch Notifications ---
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
});

// --- 6. POST: Handle M-Pesa Deposit ---
router.post('/pay-deposit', verifyToken, async (req, res) => {
    const { booking_id, amount, phone } = req.body;
    try {
        // 1. Record the actual payment record
        await db.execute(
            "INSERT INTO payments (booking_id, amount, phone, status) VALUES (?, ?, ?, 'Completed')",
            [booking_id, amount, phone]
        );

        // 2. IMPORTANT: Update status to 'Paid' so the Provider Dashboard calculates Earnings
        await db.execute("UPDATE bookings SET status = 'Paid' WHERE id = ?", [booking_id]);
        
        // 3. Notify the Stylist
        const [details] = await db.execute(`
            SELECT s.provider_id, s.title FROM bookings b 
            JOIN services s ON b.service_id = s.id WHERE b.id = ?`, [booking_id]);
        
        await createNotification(details[0].provider_id, `Money Received! KSh ${amount} deposit paid for ${details[0].title}.`);

        res.json({ success: true, message: "Payment successful! Your slot is secured." });
    } catch (err) {
        console.error("Payment Route Error:", err.message);
        res.status(500).json({ error: "Payment processing failed." });
    }
});

module.exports = router;