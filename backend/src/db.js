import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDb() {
  const dbPath = path.join(__dirname, '../../dj-dashboard.db');
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else {
        db.run(`CREATE TABLE IF NOT EXISTS songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE,
          vibe TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          path TEXT,
          error TEXT,
          dateAdded DATETIME DEFAULT CURRENT_TIMESTAMP,
          downloaded BOOLEAN DEFAULT 0
        )`, (err) => {
          if (err) reject(err);
          else resolve(db);
        });
      }
    });
  });
}
