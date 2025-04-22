// server/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gym_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection (optional)
pool.getConnection()
    .then(connection => {
        console.log('MySQL Database connected successfully!');
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error('Error connecting to MySQL database:', err);
        // Exit process if essential connection fails on startup
        // process.exit(1); // Consider if DB connection is critical for startup
    });

module.exports = pool;