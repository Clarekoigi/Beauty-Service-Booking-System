const db = require('../config/db');

/**
 * Fetch all bookings for the logged-in customer
 * Includes the Service Title and the Stylist's Username
 */
exports.getCustomerBookings = async (req, res) => {
    // req.user.id is populated by your JWT verify middleware
    const customerId = req.user.id; 

    try {
        const [rows] = await db.execute(`
            SELECT 
                b.id, 
                b.appointment_date, 
                b.status, 
                s.title AS service_name, 
                u.username AS stylist_name 
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON s.provider_id = u.id
            WHERE b.customer_id = ?
            ORDER BY b.appointment_date DESC`, 
            [customerId]
        );

        res.json(rows);
    } catch (err) {
        console.error("Database Error in getCustomerBookings:", err);
        res.status(500).json({ error: "Failed to fetch bookings. Please try again later." });
    }
};