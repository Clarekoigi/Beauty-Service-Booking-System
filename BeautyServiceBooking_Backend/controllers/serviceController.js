const db = require('../config/db');

exports.searchStylists = async (req, res) => {
    // Get the search term from the URL (e.g., ?q=Nails)
    const query = req.query.q;

    // If search is empty, return an empty list or a 400 error
    if (!query) {
        return res.status(400).json({ message: "Search query is required" });
    }

    try {
        // Use LIKE %...% to find partial matches (e.g., 'braid' matches 'Knotless Braids')
        const [results] = await db.execute(`
            SELECT s.*, u.username AS stylist_name 
            FROM services s
            JOIN users u ON s.provider_id = u.id
            WHERE s.title LIKE ? OR s.category LIKE ?`, 
            [`%${query}%`, `%${query}%`]
        );

        res.json(results);
    } catch (err) {
        console.error("Search Error:", err.message);
        res.status(500).json({ error: "Database search failed" });
    }
};