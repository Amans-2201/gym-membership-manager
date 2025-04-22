// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db'); // Import the database connection pool

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing for frontend requests
app.use(express.json()); // Parse incoming JSON requests

// --- API Routes ---

// GET all members
app.get('/api/members', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM members ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error("Error fetching members:", err);
        res.status(500).json({ error: 'Database query failed', details: err.message });
    }
});

// POST a new member
app.post('/api/members', async (req, res) => {
    const { name, email, membership_type, join_date, status } = req.body;

    // Basic validation
    if (!name || !email || !join_date) {
        return res.status(400).json({ error: 'Name, email, and join date are required.' });
    }

    // Ensure date is in YYYY-MM-DD format if coming from date input
    const formattedJoinDate = new Date(join_date).toISOString().split('T')[0];

    try {
        const [result] = await pool.query(
            'INSERT INTO members (name, email, membership_type, join_date, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, membership_type || 'Basic', formattedJoinDate, status || 'Active']
        );
        // Fetch the newly created member to return it
        const [newMember] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
        res.status(201).json(newMember[0]); // Return the newly created member object
    } catch (err) {
        console.error("Error adding member:", err);
         // Check for unique constraint violation (duplicate email)
        if (err.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ error: 'Email already exists.', details: err.message });
        }
        res.status(500).json({ error: 'Failed to add member', details: err.message });
    }
});

// DELETE a member by ID
app.delete('/api/members/:id', async (req, res) => {
    const { id } = req.params;
    if (isNaN(id)) {
         return res.status(400).json({ error: 'Invalid member ID.' });
    }

    try {
        const [result] = await pool.query('DELETE FROM members WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Member not found.' });
        }
        res.status(200).json({ message: 'Member deleted successfully' }); // Or res.sendStatus(204) for No Content
    } catch (err) {
        console.error("Error deleting member:", err);
        res.status(500).json({ error: 'Failed to delete member', details: err.message });
    }
});

 // PUT (Update) a member by ID - Optional but good to have
app.put('/api/members/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, membership_type, join_date, status } = req.body;

    if (isNaN(id)) {
         return res.status(400).json({ error: 'Invalid member ID.' });
    }
    // Basic validation (at least one field should be present for update, though PATCH is better for partial updates)
    if (!name && !email && !membership_type && !join_date && !status) {
        return res.status(400).json({ error: 'No update data provided.' });
    }

    // Build the update query dynamically based on provided fields
    let query = 'UPDATE members SET ';
    const params = [];
    if (name) { query += 'name = ?, '; params.push(name); }
    if (email) { query += 'email = ?, '; params.push(email); }
    if (membership_type) { query += 'membership_type = ?, '; params.push(membership_type); }
    if (join_date) {
         // Ensure date format
         query += 'join_date = ?, ';
         params.push(new Date(join_date).toISOString().split('T')[0]);
    }
    if (status) { query += 'status = ?, '; params.push(status); }

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);

    try {
        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Member not found or no changes made.' });
        }
         // Fetch the updated member to return it
        const [updatedMember] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        res.status(200).json(updatedMember[0]);
    } catch (err) {
        console.error("Error updating member:", err);
         if (err.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ error: 'Email already exists for another member.', details: err.message });
        }
        res.status(500).json({ error: 'Failed to update member', details: err.message });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});