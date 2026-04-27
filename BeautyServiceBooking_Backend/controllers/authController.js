const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { username, email, password, role, phone } = req.body;

    try {
        // 1. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log("Registering user:", { username, email, role });

        // 2. Insert into 'users' table
        const [userResult] = await db.execute(
            "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
            [username, email, hashedPassword, role || 'customer']
        );

        const userId = userResult.insertId;

        // 3. Create the linked profile (Uncommented and fixed for you)
        await db.execute(
            "INSERT INTO profiles (user_id, phone) VALUES (?, ?)",
            [userId, phone || '']
        );

        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Find user
        const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = users[0];

        // 2. Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // 3. Create Token (Session)
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // 4. Send the successful response
        // Note: We removed the extra res.json at the bottom to prevent "Headers already sent" errors.
        res.json({ 
            token, 
            role: user.role, 
            username: user.username 
        });

    } catch (err) {
        console.error("Login Error:", err);
        // Ensure we haven't sent a response yet before sending an error
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
};