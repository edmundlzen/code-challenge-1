import Database from "better-sqlite3";

const db = new Database("database.sqlite");

// Create table if not exists
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`
).run();

export default db;
