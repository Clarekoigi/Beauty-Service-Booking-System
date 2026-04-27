const mysql = require('mysql2');
require('dotenv').config();

// Create the pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS, // This is your 'root123'
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// TEST THE CONNECTION IMMEDIATELY
// This part is CRITICAL to see why it's failing
pool.getConnection((err, connection) => {
    if (err) {
        console.error("-------------------------------------------");
        console.error("❌ DATABASE CONNECTION FAILED!");
        console.error("Reason:", err.code); 
        console.error("Message:", err.sqlMessage);
        console.error("-------------------------------------------");
        
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error("👉 Check if 'root123' is actually the password in MySQL Workbench.");
        } else if (err.code === 'ECONNREFUSED') {
            console.error("👉 Is MySQL turned ON in XAMPP/WAMP?");
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error(`👉 The database '${process.env.DB_NAME}' does not exist yet.`);
        }
    } else {
        console.log("-------------------------------------------");
        console.log("✅ MySQL Connected Successfully!");
        console.log("-------------------------------------------");
        connection.release();
    }
});

module.exports = pool.promise();