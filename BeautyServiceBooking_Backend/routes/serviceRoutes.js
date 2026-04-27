const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// --- 1. Configure Storage for Service Catalogue Images ---
// --- routes/serviceRoutes.js ---

const storage = multer.diskStorage({
    destination: './uploads/services/',
    filename: (req, file, cb) => {
        cb(null, 'service-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // <--- UPDATE THIS TO 5MB
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }
});

/**
 * @route   GET /api/services/search
 * @desc    Search for services (Hair, Nails, etc.) for Customers
 */
router.get('/search', async (req, res) => {
    const query = req.query.q || ''; 
    
    try {
        const [rows] = await db.execute(`
            SELECT s.*, u.username AS stylist_name 
            FROM services s
            JOIN users u ON s.provider_id = u.id
            WHERE s.category LIKE ? OR s.title LIKE ?`, 
            [`%${query}%`, `%${query}%`]
        );
        res.json(rows);
    } catch (err) {
        console.error("Search Error:", err.message);
        res.status(500).json({ error: "Database search failed." });
    }
});

/**
 * @route   POST /api/services/add
 * @desc    Allow a Stylist to list a new service with a catalogue image
 */
router.post('/add', verifyToken, upload.single('serviceImage'), async (req, res) => {
    const { category, title, price, description } = req.body;
    const provider_id = req.user.id; 
    
    // Use the uploaded filename, or a default image if none was uploaded
    const image_url = req.file ? req.file.filename : 'default-service.jpg';

    if (!category || !title || !price) {
        return res.status(400).json({ message: "Category, Title, and Price are required." });
    }

    try {
        await db.execute(
            "INSERT INTO services (provider_id, category, title, price, description, image_url) VALUES (?, ?, ?, ?, ?, ?)",
            [provider_id, category, title, price, description || '', image_url]
        );
        res.status(201).json({ success: true, message: "Service published to catalogue!" });
    } catch (err) {
        console.error("Add Service Error:", err.message);
        res.status(500).json({ error: "Failed to add service to database." });
    }
});

/**
 * @route   GET /api/services/my-services
 * @desc    Fetch only the services belonging to the logged-in stylist
 */
router.get('/my-services', verifyToken, async (req, res) => {
    const providerId = req.user.id;

    try {
        const [rows] = await db.execute(
            "SELECT * FROM services WHERE provider_id = ? ORDER BY id DESC", 
            [providerId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch your services." });
    }
});

/**
 * @route   DELETE /api/services/delete/:id
 * @desc    Allow a Stylist to remove a service they no longer offer
 */
router.delete('/delete/:id', verifyToken, async (req, res) => {
    const serviceId = req.params.id;
    const providerId = req.user.id;

    try {
        const [result] = await db.execute(
            "DELETE FROM services WHERE id = ? AND provider_id = ?",
            [serviceId, providerId]
        );

        if (result.affectedRows === 0) {
            return res.status(403).json({ message: "Action denied or service not found." });
        }

        res.json({ success: true, message: "Service removed." });
    } catch (err) {
        res.status(500).json({ error: "Database error during deletion." });
    }
});

module.exports = router;