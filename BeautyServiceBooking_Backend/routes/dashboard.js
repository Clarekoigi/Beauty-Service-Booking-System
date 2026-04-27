const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get provider booking counts and total earnings in one call
 * @access  Private (Provider only)
 */
router.get('/stats', verifyToken, async (req, res) => {
    const providerId = req.user.id;

    try {
        // Optimized: Single query using SUM with a CASE statement
        const [stats] = await db.execute(`
            SELECT 
                COUNT(b.id) AS totalBookings,
                SUM(CASE WHEN b.status = 'Completed' THEN s.price ELSE 0 END) AS totalEarnings
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE s.provider_id = ?`, 
            [providerId]
        );

        // Extract values from the first row of results
        const result = stats[0];

        res.json({
            bookings: { totalBookings: result.totalBookings || 0 },
            earnings: result.totalEarnings || 0
        });

    } catch (err) {
        console.error("Dashboard Stats Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;