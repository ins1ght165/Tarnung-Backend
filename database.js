const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database (creates if it doesn't exist)
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error("Error opening the database:", err.message);
    } else {
        console.log("Connected to SQLite database.");

        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        `, (err) => {
            if (err) console.error("Error creating users table:", err.message);
        });

        // Create level_scores table
        db.run(`
            CREATE TABLE IF NOT EXISTS level_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                level_name TEXT NOT NULL,
                rating INTEGER DEFAULT 0,
                time FLOAT DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id),
                UNIQUE(user_id, level_name)
            )
        `, (err) => {
            if (err) console.error("Error creating level_scores table:", err.message);
        });
    }
});

module.exports = db;
