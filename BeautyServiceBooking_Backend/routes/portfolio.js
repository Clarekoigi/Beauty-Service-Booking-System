const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Added for file deletion
const db = require('../config/db'); 
const { verifyToken } = require('../middleware/authMiddleware');

// --- 1. Storage Configuration ---
const storage = multer.diskStorage({
    destination: './uploads/portfolio/',
    filename: (req, file, cb) => {
        cb(null, 'portfolio-' + Date.now() + path.extname(file.originalname));
    }
});

// --- 2. File Filter ---
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const isAccepted = allowedTypes.test(path.extname(file.originalname).toLowerCase()) && 
                       allowedTypes.test(file.mimetype);

    if (isAccepted) {
        cb(null, true);
    } else {
        cb(new Error('INVALID_FILE_TYPE'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // <--- UPDATE THIS TO 5MB AS WELL
    },
    fileFilter: fileFilter 
}).single('image');


/**
 * @route   POST /api/portfolio/upload
 * @desc    Upload a new style to the portfolio
 */
router.post('/upload', verifyToken, (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: "File is too large! Maximum limit is 5MB." });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: "Only images (JPG, PNG, WEBP) are allowed!" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Please select an image to upload." });
        }

        try {
            const provider_id = req.user.id;
            const image_url = req.file.filename;
            const { description } = req.body;

            await db.execute(
                "INSERT INTO portfolio (provider_id, image_url, description) VALUES (?, ?, ?)",
                [provider_id, image_url, description || 'New work sample']
            );

            res.json({ 
                success: true,
                message: "Portfolio updated! Your glow-up samples are live.",
                image: image_url 
            });

        } catch (dbErr) {
            console.error("Database Error:", dbErr.message);
            res.status(500).json({ error: "Database failed to save the portfolio entry." });
        }
    });
});

/**
 * @route   GET /api/portfolio/my-portfolio
 * @desc    Get all images for the logged-in Stylist
 */
router.get('/my-portfolio', verifyToken, async (req, res) => {
    const providerId = req.user.id;
    try {
        const [rows] = await db.execute(
            "SELECT * FROM portfolio WHERE provider_id = ? ORDER BY created_at DESC", 
            [providerId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch your portfolio images." });
    }
});

/**
 * @route   DELETE /api/portfolio/delete/:id
 * @desc    Remove an image from the portfolio and the server
 */
router.delete('/delete/:id', verifyToken, async (req, res) => {
    const providerId = req.user.id;
    const imgId = req.params.id;

    try {
        // 1. Get the filename first to delete it from the 'uploads' folder
        const [files] = await db.execute(
            "SELECT image_url FROM portfolio WHERE id = ? AND provider_id = ?",
            [imgId, providerId]
        );

        if (files.length === 0) {
            return res.status(404).json({ message: "Image not found or unauthorized." });
        }

        const fileName = files[0].image_url;
        const filePath = path.join(__dirname, '../uploads/', fileName);

        // 2. Delete from Database
        await db.execute("DELETE FROM portfolio WHERE id = ?", [imgId]);

        // 3. Delete from physical storage (Optional but recommended to save space)
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: "Style removed from portfolio." });

    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ error: "Could not remove the image." });
    }
});

module.exports = router;