const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// --- 1. Essential Middleware ---
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// --- 2. Static File Serving (CRITICAL for Catalogue) ---
// Serves portfolio images (e.g., /uploads/portfolio-123.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// NEW: Serves service catalogue images specifically
app.use('/uploads/services', express.static(path.join(__dirname, 'uploads/services')));

// Serves your frontend HTML/CSS/JS files directly
app.use(express.static(__dirname)); 

// --- 3. Route Registration ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/portfolio', require('./routes/portfolio'));

// NEW: Review System Route
app.use('/api/reviews', require('./routes/reviewRoutes'));

// --- 4. Database Connection Log ---
const db = require('./config/db');
console.log('⏳ Connecting to BeautyHub Database...');

// --- 5. Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`🚀 Beauty Service Booking System is LIVE!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`📂 Service Images: http://localhost:${PORT}/uploads/services`);
    console.log(`-------------------------------------------`);
});