const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'vdd.db');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function initialize() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'analyst', 'coordinator', 'leader')),
      team_leader_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_leader_id) REFERENCES users(id)
    )
  `);

  // Indicators table
  db.exec(`
    CREATE TABLE IF NOT EXISTS indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      roles TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User indicator configuration (percentages per user per indicator)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_indicator_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      indicator_id INTEGER NOT NULL,
      percentage REAL NOT NULL DEFAULT 0,
      global_value REAL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (indicator_id) REFERENCES indicators(id),
      UNIQUE(user_id, indicator_id)
    )
  `);

  // Notes table (user scores per indicator)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      indicator_id INTEGER NOT NULL,
      value REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (indicator_id) REFERENCES indicators(id),
      UNIQUE(user_id, indicator_id)
    )
  `);

  // Calculation results cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS calculation_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      final_score REAL,
      calculation_details TEXT,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Insert default admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', 'admin123', 'Administrador', 'admin');
  }

  console.log('Base de datos inicializada correctamente');
}

module.exports = {
  db,
  initialize
};
