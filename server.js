const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());


// 1. Register a new user
app.post('/register', (req, res) => {
    const { username, email } = req.body;
    const sql = `INSERT INTO users (username, email) VALUES (?, ?)`;
    db.run(sql, [username, email], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ id: this.lastID, username, email });
    });
});

// 2. Get user data
app.get('/user/:id', (req, res) => {
    const sql = `SELECT * FROM users WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(row);
    });
});

// 3. Update a user's score for a specific level
app.post('/submit-score', (req, res) => {
    const { user_id, level_name, rating, time } = req.body;

    const sql = `
        INSERT INTO level_scores (user_id, level_name, rating, time)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, level_name)
        DO UPDATE SET rating = excluded.rating, time = excluded.time
    `;

    db.run(sql, [user_id, level_name, rating, time], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Score submitted/updated successfully' });
    });
});

// 4. Get all level scores for a user
app.get('/user/:id/scores', (req, res) => {
    const sql = `SELECT * FROM level_scores WHERE user_id = ?`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 5. Get leaderboard for a level
app.get('/leaderboard/:level', (req, res) => {
    const sql = `
        SELECT u.username, ls.rating, ls.time
        FROM level_scores ls
        JOIN users u ON u.id = ls.user_id
        WHERE ls.level_name = ?
        ORDER BY ls.rating DESC
        LIMIT 10
    `;

    db.all(sql, [req.params.level], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 6. Delete user (and their scores)
app.delete('/user/:id', (req, res) => {
    const userId = req.params.id;

    db.serialize(() => {
        db.run(`DELETE FROM level_scores WHERE user_id = ?`, [userId]);
        db.run(`DELETE FROM users WHERE id = ?`, [userId], function (err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.json({ message: 'User and their scores deleted' });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

