const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// --- 1. POST: Add a Review ---
router.post('/add', verifyToken, async (req, res) => {
    const { booking_id, comment, rating } = req.body;
    const customer_id = req.user.id;

    if (!booking_id || !rating) {
        return res.status(400).json({ message: "Booking ID and Rating are required." });
    }

    try {
        // Guard: Ensure the booking is 'Completed' before allowing a review
        const [booking] = await db.execute(
            "SELECT status FROM bookings WHERE id = ? AND customer_id = ?",
            [booking_id, customer_id]
        );

        if (booking.length === 0 || booking[0].status !== 'Completed') {
            return res.status(400).json({ message: "You can only review completed appointments." });
        }

        await db.execute(
            "INSERT INTO reviews (booking_id, customer_id, comment, rating) VALUES (?, ?, ?, ?)",
            [booking_id, customer_id, comment || '', rating]
        );
        
        res.status(201).json({ success: true, message: "Review posted successfully!" });
    } catch (err) {
        console.error("Review Error:", err.message);
        res.status(500).json({ error: "Failed to save review." });
    }
});

// --- 2. GET: Smart Review Fetcher (Real-time for both Roles) ---
router.get('/my-reviews', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        let query;
        if (role === 'provider') {
            // PROVIDER VIEW: "Show me feedback students left for ME"
            query = `
                SELECT 
                    r.id, r.comment, r.rating, r.created_at,
                    s.title AS service_name, 
                    u_client.username AS customer_name
                FROM reviews r
                JOIN bookings b ON r.booking_id = b.id
                JOIN services s ON b.service_id = s.id
                JOIN users u_client ON r.customer_id = u_client.id
                WHERE s.provider_id = ?
                ORDER BY r.created_at DESC`;
        } else {
            // CUSTOMER VIEW: "Show me reviews I wrote for my stylists"
            query = `
                SELECT 
                    r.id, r.comment, r.rating, r.created_at,
                    s.title AS service_name, 
                    u_stylist.username AS stylist_name
                FROM reviews r
                JOIN bookings b ON r.booking_id = b.id
                JOIN services s ON b.service_id = s.id
                JOIN users u_stylist ON s.provider_id = u_stylist.id
                WHERE r.customer_id = ?
                ORDER BY r.created_at DESC`;
        }

        const [rows] = await db.execute(query, [userId]);
        res.json(rows);
    } catch (err) {
        console.error("Fetch Reviews Error:", err.message);
        res.status(500).json({ error: "Failed to load review history." });
    }
});

// --- 3. GET: Public Service Reviews (For the Catalogue/Search Results) ---
router.get('/service/:id', async (req, res) => {
    const serviceId = req.params.id;
    try {
        const [rows] = await db.execute(`
            SELECT r.comment, r.rating, r.created_at, u.username AS reviewer_name 
            FROM reviews r
            JOIN users u ON r.customer_id = u.id
            JOIN bookings b ON r.booking_id = b.id
            WHERE b.service_id = ?
            ORDER BY r.created_at DESC`, 
            [serviceId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load reviews for this service." });
    }
});

module.exports = router;