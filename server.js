const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());


// 1. Register a new user
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    db.run(sql, [username, email, hashedPassword], function (err) {
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

    const selectSql = `SELECT rating, time FROM level_scores WHERE user_id = ? AND level_name = ?`;

    db.get(selectSql, [user_id, level_name], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        // No previous score? Insert new one
        if (!row) {
            const insertSql = `INSERT INTO level_scores (user_id, level_name, rating, time) VALUES (?, ?, ?, ?)`;
            db.run(insertSql, [user_id, level_name, rating, time], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Score submitted (new)" });
            });
        }
        // New score is better? Update it
        else if (rating > row.rating || (rating === row.rating && time < row.time)) {
            const updateSql = `UPDATE level_scores SET rating = ?, time = ? WHERE user_id = ? AND level_name = ?`;
            db.run(updateSql, [rating, time, user_id, level_name], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Score updated (better)" });
            });
        }
        // Otherwise do nothing
        else {
            res.json({ message: "Score not updated (not better)" });
        }
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

// 7. Login user

app.post('/login', (req, res) => {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
        return res.status(400).json({ error: "Missing email/username or password" });
    }

    const sql = `
        SELECT * FROM users 
        WHERE username = ? OR email = ?
        LIMIT 1
    `;

    db.get(sql, [emailOrUsername, emailOrUsername], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Success! 
        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

